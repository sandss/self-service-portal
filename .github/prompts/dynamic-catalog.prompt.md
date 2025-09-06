---
mode: agent
---
You are an expert full-stack assistant. Extend the existing project (React + FastAPI + ARQ + Redis, docker-compose) to add a Dynamic Catalog feature that supports:

Git-backed catalog items (GitOps): sync items by tags like backup-config@1.2.0

Local catalog items (on-disk manifests/artifacts for dev/test)

Schema-driven forms rendered dynamically in React

Execution via ARQ workers, using the existing jobs/pub-sub dashboard

Bundle storage (local filesystem) + optional “execute direct from Git ref” mode

Follow this spec exactly and create all files with code content.

0) Project assumptions

Repo root: self-service-portal/ with existing api/, worker/, web/, docker-compose.yml.

Add Python deps to requirements.txt (keep existing lines; append these):

jsonschema
GitPython
pyyaml


Add front-end deps in web/:

npm i @rjsf/core @rjsf/validator-ajv8

1) Config

Create api/catalog/settings.py:

from pydantic import BaseSettings

class CatalogSettings(BaseSettings):
    # Blob store for bundles (tar.gz) and/or local manifests
    CATALOG_BLOB_DIR: str = "/app/data/catalog_bundles"
    # Optional: path to a local-dev catalog root to auto-load on startup
    CATALOG_LOCAL_ROOT: str = "/app/catalog_local"    # leave empty if not used
    # Git repos table is in DB; for demo we use a simple JSON list
    GIT_EXECUTE_DIRECT: bool = False  # if True, worker fetches repo@ref on execute

catalog_settings = CatalogSettings()


Ensure the api container mounts a writeable /app/data folder in compose (see Section 8).

2) Data layer (simple DB-free demo)

Create api/catalog/registry.py:

import os, json, threading
from typing import Optional, Dict, Any, List, Tuple

REGISTRY_PATH = "/app/data/catalog_registry.json"
_lock = threading.Lock()

def _load() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        return {"items": {}}
    with open(REGISTRY_PATH, "r") as f:
        return json.load(f)

def _save(data: dict):
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w") as f:
        json.dump(data, f, indent=2)

def upsert_version(item_id: str, version: str, manifest: dict, schema: dict, ui: dict|None,
                   storage_uri: str, source: dict):
    with _lock:
        db = _load()
        items = db["items"].setdefault(item_id, {"versions": {}})
        items["versions"][version] = {
            "manifest": manifest,
            "schema": schema,
            "ui": ui or {},
            "storage_uri": storage_uri,
            "source": source,
            "active": True
        }
        _save(db)

def list_items() -> List[dict]:
    db = _load()
    out = []
    for iid, data in db["items"].items():
        versions = list(data.get("versions", {}).keys())
        latest = versions[-1] if versions else None
        out.append({"id": iid, "versions": versions, "latest": latest})
    return out

def list_versions(item_id: str) -> List[str]:
    db = _load()
    return list(db["items"].get(item_id, {}).get("versions", {}).keys())

def get_descriptor(item_id: str, version: str) -> Optional[dict]:
    db = _load()
    return db["items"].get(item_id, {}).get("versions", {}).get(version)

def resolve_latest(item_id: str) -> Optional[Tuple[str, dict]]:
    db = _load()
    vs = db["items"].get(item_id, {}).get("versions", {})
    if not vs:
        return None
    ver = sorted(vs.keys())[-1]
    return ver, vs[ver]

3) Bundle I/O helpers

Create api/catalog/bundles.py:

import io, os, tarfile, json, yaml
from typing import Tuple, Optional
from .settings import catalog_settings

def pack_dir(path: str) -> bytes:
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        tar.add(path, arcname=".")
    bio.seek(0); return bio.read()

def unpack_to_temp(data: bytes, tempdir: str):
    import tarfile
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        tar.extractall(tempdir)

def load_descriptor_from_dir(path: str) -> Tuple[dict, dict, Optional[dict]]:
    with open(os.path.join(path, "manifest.yaml")) as f:
        manifest = yaml.safe_load(f)
    with open(os.path.join(path, "schema.json")) as f:
        schema = json.load(f)
    ui_path = os.path.join(path, "ui.json")
    ui = json.load(open(ui_path)) if os.path.exists(ui_path) else None
    return manifest, schema, ui

def write_blob(item_id: str, version: str, data: bytes) -> str:
    root = catalog_settings.CATALOG_BLOB_DIR
    os.makedirs(root, exist_ok=True)
    fp = os.path.join(root, f"{item_id}@{version}.tar.gz")
    with open(fp, "wb") as f:
        f.write(data)
    return fp

def read_blob(storage_uri: str) -> bytes:
    with open(storage_uri, "rb") as f:
        return f.read()

4) Validation

Create api/catalog/validate.py:

from jsonschema import validate, Draft7Validator

REQUIRED_MANIFEST_FIELDS = ["id", "name", "version", "entrypoint"]

def validate_manifest(m: dict):
    for k in REQUIRED_MANIFEST_FIELDS:
        if k not in m:
            raise ValueError(f"manifest missing field: {k}")

def validate_schema(s: dict):
    Draft7Validator.check_schema(s)  # raises if invalid

def validate_inputs(schema: dict, inputs: dict):
    validate(instance=inputs, schema=schema)

5) Git sync job (worker)

Create worker/catalog_sync.py:

import os, tempfile, json, yaml
from git import Repo
from arq.connections import ArqRedis
from typing import Tuple
from api.catalog.bundles import pack_dir, load_descriptor_from_dir, write_blob
from api.catalog.validate import validate_manifest, validate_schema
from api.catalog.registry import upsert_version

def parse_tag(tag: str) -> Tuple[str, str]:
    if "@" not in tag:
        raise ValueError("tag must be <item_id>@<semver>")
    return tag.split("@", 1)

async def sync_catalog_item(ctx, repo_url: str, ref: str, subdir: str = "items"):
    # clone and checkout tag/ref
    with tempfile.TemporaryDirectory() as td:
        Repo.clone_from(repo_url, td, depth=1)
        r = Repo(td)
        r.git.fetch("--tags", "--force")
        r.git.checkout(ref)

        item_id, version = parse_tag(ref)
        item_dir = os.path.join(td, subdir, item_id)

        manifest, schema, ui = load_descriptor_from_dir(item_dir)
        validate_manifest(manifest)
        validate_schema(schema)

        blob = pack_dir(item_dir)
        storage_uri = write_blob(item_id, version, blob)

        upsert_version(
            item_id=item_id,
            version=version,
            manifest=manifest,
            schema=schema,
            ui=ui,
            storage_uri=storage_uri,
            source={"repo": repo_url, "ref": ref, "path": f"{subdir}/{item_id}"}
        )
        # optional: publish a registry event via Redis pub/sub if you want UI auto-refresh


Register it in worker/worker_settings.py:

from .catalog_sync import sync_catalog_item
functions = [example_long_task, run_catalog_item, sync_catalog_item]  # include your existing tasks


(If run_catalog_item doesn’t exist yet, add it in Step 7.)

6) API endpoints (catalog + webhook + local import)

Create api/catalog/routes.py:

from fastapi import APIRouter, Request, Depends, UploadFile, File, HTTPException, Body
from arq.connections import ArqRedis
from ..deps import get_arq_pool
from .registry import list_items, list_versions, get_descriptor, resolve_latest, upsert_version
from .bundles import load_descriptor_from_dir, pack_dir, write_blob
from .validate import validate_manifest, validate_schema
import os, tempfile, json, yaml, shutil

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("")
def api_list_items():
    return {"items": list_items()}

@router.get("/{item_id}/versions")
def api_list_versions(item_id: str):
    return {"versions": list_versions(item_id)}

@router.get("/{item_id}/{version}/descriptor")
def api_descriptor(item_id: str, version: str):
    d = get_descriptor(item_id, version)
    if not d: raise HTTPException(404, "not found")
    return {"manifest": d["manifest"], "schema": d["schema"], "ui": d.get("ui", {})}

@router.get("/{item_id}/latest/descriptor")
def api_descriptor_latest(item_id: str):
    r = resolve_latest(item_id)
    if not r: raise HTTPException(404, "not found")
    version, d = r
    return {"version": version, "manifest": d["manifest"], "schema": d["schema"], "ui": d.get("ui", {})}

# Local import (zip/tar not required; for dev we import from a folder path posted in body)
@router.post("/local/import")
def api_local_import(body: dict = Body(...)):
    # body = { "path": "/app/catalog_local/items/backup-config" }
    path = body.get("path")
    if not path or not os.path.isdir(path):
        raise HTTPException(400, "invalid path")
    m, s, u = load_descriptor_from_dir(path)
    validate_manifest(m); validate_schema(s)
    item_id = m["id"]; version = m["version"]
    blob = pack_dir(path)
    storage_uri = write_blob(item_id, version, blob)
    upsert_version(item_id, version, m, s, u, storage_uri, {"source": "local", "path": path})
    return {"item_id": item_id, "version": version}

# Git webhook (simplified: expects JSON {repo_url, tags: [\"item@1.2.3\", ...]})
@router.post("/git/webhook")
async def api_git_webhook(req: Request, arq: ArqRedis = Depends(get_arq_pool)):
    payload = await req.json()
    repo_url = payload.get("repo_url")
    tags = payload.get("tags", [])
    if not repo_url or not tags:
        raise HTTPException(400, "repo_url and tags required")
    for t in tags:
        await arq.enqueue_job("sync_catalog_item", repo_url=repo_url, ref=t)
    return {"queued": len(tags)}


Wire this router in api/main.py:

from api.catalog.routes import router as catalog_router
app.include_router(catalog_router)

7) Execution task (worker) — run catalog item

Create worker/catalog_execute.py:

import os, tempfile, importlib.util, asyncio, json
from typing import Any, Dict
from api.catalog.registry import get_descriptor
from api.catalog.bundles import read_blob, unpack_to_temp
from api.catalog.validate import validate_inputs
from .tasks import set_status  # reuse your existing status helper

def _load_task(task_path: str):
    spec = importlib.util.spec_from_file_location("bundle.task", task_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    if not hasattr(mod, "run"):
        raise RuntimeError("task.py must define run(inputs)")
    return mod

async def run_catalog_item(ctx, item_id: str, version: str, inputs: Dict[str, Any], user_id: str | None = None):
    ar = ctx["redis"]
    job_id = ctx["job_id"]
    await set_status(ar, job_id, "RUNNING", {"progress": 0})

    desc = get_descriptor(item_id, version)
    if not desc:
        await set_status(ar, job_id, "FAILED", {"error": "descriptor not found"}); return

    schema = desc["schema"]
    validate_inputs(schema, inputs)

    blob = read_blob(desc["storage_uri"])
    with tempfile.TemporaryDirectory() as td:
        unpack_to_temp(blob, td)
        task = _load_task(os.path.join(td, "task.py"))
        try:
            # optional checkpoints
            await set_status(ar, job_id, "RUNNING", {"progress": 10})
            res = task.run(inputs)
            if asyncio.iscoroutine(res):
                res = await res
            await set_status(ar, job_id, "SUCCEEDED", {"result": res, "progress": 100})
            return res
        except Exception as e:
            await set_status(ar, job_id, "FAILED", {"error": str(e)})
            raise


Register in worker/worker_settings.py:

from .catalog_execute import run_catalog_item
functions = [example_long_task, run_catalog_item, sync_catalog_item]

8) Compose updates (volumes)

Update docker-compose.yml to mount data + optional local catalog:

services:
  api:
    volumes:
      - .:/app
      - catalog_data:/app/data
      - ./catalog_local:/app/catalog_local  # optional local items
  worker:
    volumes:
      - .:/app
      - catalog_data:/app/data
      - ./catalog_local:/app/catalog_local
volumes:
  catalog_data:

9) Frontend: Catalog UI + dynamic runner

Create web/src/pages/Catalog.tsx:

import React, { useEffect, useState } from "react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

type Item = { id: string; versions: string[]; latest?: string };

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function Catalog() {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [version, setVersion] = useState<string>("");
  const [descriptor, setDescriptor] = useState<any>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/catalog`).then(r=>r.json()).then(d=> setItems(d.items));
  }, []);

  useEffect(() => {
    if (!selected || !version) { setDescriptor(null); return;}
    fetch(`${API}/catalog/${selected}/${version}/descriptor`).then(r=>r.json()).then(setDescriptor);
  }, [selected, version]);

  const enqueue = async (data: any) => {
    const r = await fetch(`${API}/jobs`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ report_type: "catalog", parameters: { item_id: selected, version, inputs: data.formData } })
    });
    const { job_id } = await r.json();
    setResult({ job_id });
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Catalog</h1>

      <div className="flex gap-2 items-end">
        <div>
          <label className="text-xs">Item</label><br/>
          <select className="border rounded px-2 py-1" value={selected} onChange={e=>{setSelected(e.target.value); setVersion("");}}>
            <option value="">Select…</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.id}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs">Version</label><br/>
          <select className="border rounded px-2 py-1" value={version} onChange={e=> setVersion(e.target.value)} disabled={!selected}>
            <option value="">Select…</option>
            {items.find(i=>i.id===selected)?.versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {descriptor && (
        <div className="max-w-2xl border rounded p-4">
          <Form
            schema={descriptor.schema}
            uiSchema={descriptor.ui || {}}
            validator={validator}
            onSubmit={enqueue}
          >
            <button className="border rounded px-3 py-1" type="submit">Run</button>
          </Form>
        </div>
      )}

      {result && (
        <div className="border rounded p-3">
          <div className="font-mono text-sm">Enqueued Job: {result.job_id}</div>
          <div className="text-xs text-gray-600">Track it on the Jobs Dashboard.</div>
        </div>
      )}
    </div>
  );
}


Add a route in your React app (e.g., web/src/main.tsx or router file) to mount /catalog → Catalog.

10) Wire job enqueue → catalog execution

Modify api/main.py’s job enqueue to detect catalog calls:

# inside POST /jobs handler, if report_type == "catalog"
if req.report_type == "catalog":
    p = req.parameters or {}
    item_id = p.get("item_id"); version = p.get("version"); inputs = p.get("inputs", {})
    if not (item_id and version):
        raise HTTPException(400, "item_id and version required for catalog")
    job = await arq.enqueue_job("run_catalog_item", item_id=item_id, version=version, inputs=inputs, user_id=None)
    await arq.set(f"{settings.JOB_STATUS_PREFIX}{job.job_id}", json.dumps({"state": "QUEUED"}), ex=settings.JOB_TTL)
    return JobResponse(job_id=job.job_id)


(Keep the existing branch for other report types.)

11) Seed a local catalog item (dev)

Create a dev item at catalog_local/items/backup-config/ with:

manifest.yaml

id: backup-config
name: Backup Device Configs
version: 1.0.0
entrypoint: task:run
description: "Demo: archive device configs."


schema.json

{
  "type": "object",
  "required": ["devices", "bucket"],
  "properties": {
    "devices": { "type": "array", "items": {"type":"string"}, "minItems": 1, "title": "Devices" },
    "bucket":  { "type": "string", "title": "S3 Bucket" },
    "prefix":  { "type": "string", "title": "Prefix", "default": "backups/" }
  }
}


ui.json

{ "devices": { "ui:widget": "textarea", "ui:options": { "rows": 6 } } }


task.py

import asyncio

def validate(inputs):
    if isinstance(inputs.get("devices"), str):
        inputs["devices"] = [d.strip() for d in inputs["devices"].splitlines() if d.strip()]
    return inputs

async def run(inputs):
    # pretend work
    await asyncio.sleep(0.2)
    return {"ok": True, "count": len(inputs["devices"]), "bucket": inputs["bucket"]}


After docker compose up, import it:

curl -X POST http://localhost:8000/catalog/local/import \
  -H "Content-Type: application/json" \
  -d '{"path": "/app/catalog_local/items/backup-config"}'


Open http://localhost:5173/catalog, select backup-config@1.0.0, submit, then watch the job progress on your Jobs Dashboard.

12) Git sync test (manual webhook)

Host a catalog repo somewhere (or locally accessible via file:// won’t work in GitPython; use real URL). Tag it backup-config@1.1.0, then trigger:

curl -X POST http://localhost:8000/catalog/git/webhook \
  -H "Content-Type: application/json" \
  -d '{"repo_url":"https://github.com/yourorg/catalog-repo.git","tags":["backup-config@1.1.0"]}'


The worker clones the repo at that tag, packs the item, writes the bundle, and registers the new version.

13) Security & notes (inline comments are okay; no extra code now)

In comments, note where to add JWT auth, RBAC on catalog reads/executes, and secret resolution.

In comments, note sandboxing for task execution in hardened worker containers.

Keep the Git webhook signature verification TODO.

14) Final checklist

Ensure compose mounts catalog_data volume and optional catalog_local.

Ensure the worker has new functions registered.

Ensure /catalog page appears and can execute an item → job visible on dashboard.

After creating/overwriting files, print:

exact docker compose up --build command

curl examples for local import and git webhook

the URL paths to test (/catalog, /jobs)

Create everything now.