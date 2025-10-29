import io
import json
import os
import subprocess
import tarfile
import tempfile
from datetime import datetime
from typing import Any, Callable, Dict

import yaml

from api.catalog.descriptor_utils import atomic_write
from api.catalog.registry import upsert_version
from worker.job_status import touch_job

BUNDLES_DIR = "/app/data/bundles"
ITEMS_SUBDIR = "items"

def parse_tag(tag: str):
    """Parse tag in format <item>@<semver>"""
    if "@" not in tag:
        raise ValueError("tag must be in format <item>@<semver>")
    return tag.split("@", 1)

def pack_dir(path: str) -> bytes:
    """Pack directory into tar.gz bytes"""
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        tar.add(path, arcname=".")
    bio.seek(0)
    return bio.read()

def load_descriptor_from_dir(path: str):
    """Load manifest, schema, ui, and any mapped schemas from directory"""
    manifest_path = os.path.join(path, "manifest.yaml")
    schema_path = os.path.join(path, "schema.json")
    ui_path = os.path.join(path, "ui.json")

    with open(manifest_path, "r", encoding="utf-8") as handle:
        manifest = yaml.safe_load(handle)

    with open(schema_path, "r", encoding="utf-8") as handle:
        schema = json.load(handle)

    ui = {}
    if os.path.exists(ui_path):
        with open(ui_path, "r", encoding="utf-8") as handle:
            ui = json.load(handle)

    additional_schemas: Dict[str, Any] = {}
    schema_map = schema.get("x-schema-map", {}) if isinstance(schema, dict) else {}
    for mapped_name in schema_map.values():
        mapped_path = os.path.join(path, mapped_name)
        if not os.path.exists(mapped_path):
            continue
        with open(mapped_path, "r", encoding="utf-8") as handle:
            additional_schemas[mapped_name] = json.load(handle)

    return manifest, schema, ui, additional_schemas

def _default_now() -> datetime:
    return datetime.utcnow()


def _default_git_runner(args: tuple[str, ...], *, cwd: str) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr}")
    return result.stdout


async def run_sync_catalog_item_from_git(
    redis_client,
    job_id: str,
    payload: Dict[str, Any],
    *,
    git_runner: Callable[[tuple[str, ...], str], str] | None = None,
    tempdir_factory: Callable[[], Any] | None = None,
    now: Callable[[], datetime] | None = None,
    atomic_write_func: Callable[[str, bytes], None] | None = None,
    upsert_version_func: Callable[..., Any] | None = None,
):
    """Shared async implementation for syncing a catalog item from Git."""

    git_runner = git_runner or (lambda args, cwd: _default_git_runner(args, cwd=cwd))
    tempdir_factory = tempdir_factory or tempfile.TemporaryDirectory
    now = now or _default_now
    atomic_write_func = atomic_write_func or atomic_write
    upsert_version_func = upsert_version_func or upsert_version

    repo_url = payload["repo_url"]
    ref = payload["ref"]
    payload_copy = dict(payload)

    item_id, git_ref = parse_tag(ref)
    payload_copy.setdefault("item_id", item_id)

    job_meta = {
        "id": job_id,
        "type": "git_import",
        "state": "RUNNING",
        "progress": 0,
        "created_at": now().isoformat(),
        "updated_at": now().isoformat(),
        "started_at": now().isoformat(),
        "finished_at": None,
        "params": payload_copy,
        "result": None,
        "error": None,
        "current_step": "Starting git import",
    }

    await touch_job(redis_client, job_meta)

    try:
        with tempdir_factory() as td:
            job_meta.update({
                "progress": 10,
                "current_step": "Cloning repository",
                "updated_at": now().isoformat(),
            })
            await touch_job(redis_client, job_meta)

            git_runner(("git", "init"), td)
            git_runner(("git", "remote", "add", "origin", repo_url), td)

            try:
                git_runner(("git", "fetch", "--depth", "1", "--tags", "origin", git_ref), td)
                git_runner(("git", "checkout", "FETCH_HEAD"), td)
                print(f"✅ Checked out tag: {git_ref}")
            except RuntimeError as tag_error:
                try:
                    git_runner(("git", "fetch", "--depth", "1", "origin", git_ref), td)
                    git_runner(("git", "checkout", "FETCH_HEAD"), td)
                    print(f"✅ Checked out branch: {git_ref}")
                except RuntimeError as branch_error:
                    raise RuntimeError(
                        f"Failed to fetch '{git_ref}' as tag or branch: {branch_error}"
                    ) from tag_error

            job_meta.update({
                "progress": 30,
                "current_step": "Processing repository structure",
                "updated_at": now().isoformat(),
            })
            await touch_job(redis_client, job_meta)

            try:
                print(f"🔍 Temp directory contents: {os.listdir(td)}")
            except Exception as exc:  # pragma: no cover - debugging aid
                print(f"🔍 Error listing temp directory: {exc}")

            item_dir = os.path.join(td, ITEMS_SUBDIR, item_id)
            print(f"🔍 Looking for nested structure at: {item_dir}")
            if not os.path.isdir(item_dir):
                item_dir = td
                print(f"🔍 Using flat structure at: {item_dir}")
                try:
                    print(f"🔍 Flat directory contents: {os.listdir(item_dir)}")
                except Exception as exc:  # pragma: no cover - debugging aid
                    print(f"🔍 Error listing flat directory: {exc}")
                if not (
                    os.path.exists(os.path.join(item_dir, "manifest.yaml"))
                    and os.path.exists(os.path.join(item_dir, "schema.json"))
                ):
                    raise FileNotFoundError(
                        f"Neither {ITEMS_SUBDIR}/{item_id} nor catalog item files found in repository"
                    )
                print("✅ Using flat repository structure")
            else:
                print(f"✅ Using nested repository structure: {ITEMS_SUBDIR}/{item_id}")

            if git_ref.replace("v", "").replace(".", "").replace("-", "").isalnum():
                version = git_ref.lstrip("v")
            else:
                manifest, _, _, _ = load_descriptor_from_dir(item_dir)
                version = manifest.get("version", "latest")

            job_meta.update({
                "progress": 50,
                "current_step": "Validating catalog item",
                "updated_at": now().isoformat(),
            })
            await touch_job(redis_client, job_meta)

            manifest, schema, ui, additional_schemas = load_descriptor_from_dir(item_dir)

            manifest_id = manifest.get("id") or manifest.get("name")
            manifest_version = manifest.get("version")

            if manifest_id != item_id:
                raise ValueError(
                    f"manifest id/name '{manifest_id}' must match item_id '{item_id}' from tag {ref}"
                )
            if manifest_version != version:
                raise ValueError(
                    f"manifest version '{manifest_version}' must match version '{version}' from tag {ref}"
                )

            job_meta.update({
                "progress": 70,
                "current_step": "Creating bundle",
                "updated_at": now().isoformat(),
            })
            await touch_job(redis_client, job_meta)

            bundle_bytes = pack_dir(item_dir)

            os.makedirs(BUNDLES_DIR, exist_ok=True)
            bundle_path = os.path.join(BUNDLES_DIR, f"{item_id}@{version}.tar.gz")
            atomic_write_func(bundle_path, bundle_bytes)

            job_meta.update({
                "progress": 90,
                "current_step": "Updating catalog registry",
                "updated_at": now().isoformat(),
            })
            await touch_job(redis_client, job_meta)

            upsert_version_func(
                item_id=item_id,
                version=version,
                manifest=manifest,
                schema=schema,
                ui=ui,
                storage_uri=bundle_path,
                source={
                    "source": "git-sync",
                    "repo": repo_url,
                    "ref": ref,
                    "path": f"{ITEMS_SUBDIR}/{item_id}",
                    "sync_timestamp": now().isoformat(),
                },
                additional_schemas=additional_schemas,
            )

            result = {
                "item_id": item_id,
                "version": version,
                "bundle_path": bundle_path,
                "repo_url": repo_url,
                "ref": ref,
            }

            job_meta.update({
                "state": "SUCCEEDED",
                "progress": 100,
                "current_step": "Completed",
                "finished_at": now().isoformat(),
                "updated_at": now().isoformat(),
                "result": result,
            })
            await touch_job(redis_client, job_meta)
            return result

    except Exception as exc:
        job_meta.update({
            "state": "FAILED",
            "progress": 0,
            "finished_at": now().isoformat(),
            "updated_at": now().isoformat(),
            "error": str(exc),
        })
        await touch_job(redis_client, job_meta)
        raise


async def sync_catalog_item_from_git(ctx, job_id: str, payload: Dict[str, Any]):
    """ARQ entrypoint delegating to the shared Git sync implementation."""

    redis_client = ctx["redis"]
    await run_sync_catalog_item_from_git(redis_client, job_id, payload)
