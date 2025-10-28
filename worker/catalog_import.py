"""Shared helpers for importing catalog items via asynchronous workers."""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Callable, Dict

import yaml

from api.catalog.bundles import pack_dir, write_blob
from api.catalog.registry import upsert_version
from api.catalog.validate import validate_manifest, validate_schema
from worker.job_status import touch_job


async def run_import_catalog_item_job(
    redis_client,
    job_id: str,
    payload: Dict[str, Any],
    *,
    base_dir: str = "/app/catalog_local/items",
    now: Callable[[], datetime] | None = None,
) -> Dict[str, Any]:
    """Shared async implementation for catalog item imports."""

    now = now or datetime.utcnow

    def timestamp() -> str:
        return now().isoformat()

    job_meta: Dict[str, Any] = {
        "id": job_id,
        "type": "import_catalog_item",
        "state": "QUEUED",
        "progress": 0,
        "created_at": timestamp(),
        "updated_at": timestamp(),
        "started_at": None,
        "finished_at": None,
        "params": payload,
        "result": None,
        "error": None,
        "current_step": "Queued",
    }
    await touch_job(redis_client, job_meta)

    async def update_job(**updates: Any) -> None:
        job_meta.update(updates)
        job_meta["updated_at"] = timestamp()
        await touch_job(redis_client, job_meta)

    try:
        await update_job(
            state="RUNNING",
            started_at=timestamp(),
            progress=10,
            current_step="Validating input data",
        )

        item_id = payload.get("item_id")
        version = payload.get("version")
        manifest = payload.get("manifest")
        schema = payload.get("schema")
        ui_schema = payload.get("ui_schema", {})
        task_code = payload.get("task_code")
        source = payload.get("source", "ui_import")

        if not item_id or not version or not schema:
            raise ValueError("item_id, version, and schema are required")

        validate_manifest(manifest)
        validate_schema(schema)

        await update_job(progress=30, current_step="Preparing local storage directory")

        item_local_dir = os.path.join(base_dir, item_id, version)
        os.makedirs(item_local_dir, exist_ok=True)

        await update_job(progress=50, current_step="Saving files to local storage")

        manifest_path = os.path.join(item_local_dir, "manifest.yaml")
        with open(manifest_path, "w", encoding="utf-8") as handle:
            yaml.dump(manifest, handle)

        schema_path = os.path.join(item_local_dir, "schema.json")
        with open(schema_path, "w", encoding="utf-8") as handle:
            json.dump(schema, handle, indent=2)

        if ui_schema:
            ui_path = os.path.join(item_local_dir, "ui.json")
            with open(ui_path, "w", encoding="utf-8") as handle:
                json.dump(ui_schema, handle, indent=2)

        if task_code:
            task_path = os.path.join(item_local_dir, "task.py")
            with open(task_path, "w", encoding="utf-8") as handle:
                handle.write(task_code)

        meta_path = os.path.join(item_local_dir, "meta.json")
        meta = {
            "version": version,
            "imported_at": timestamp(),
            "source": source,
            "job_id": job_id,
        }
        with open(meta_path, "w", encoding="utf-8") as handle:
            json.dump(meta, handle, indent=2)

        await update_job(progress=70, current_step="Packing and storing in registry")

        blob = pack_dir(item_local_dir)
        storage_uri = write_blob(item_id, version, blob)

        await update_job(progress=90, current_step="Updating registry")

        metadata = {
            "source": source,
            "imported_at": timestamp(),
            "job_id": job_id,
            "local_path": item_local_dir,
        }
        upsert_version(item_id, version, manifest, schema, ui_schema, storage_uri, metadata)

        result = {
            "message": "Catalog item imported successfully",
            "item_id": item_id,
            "version": version,
            "local_path": item_local_dir,
            "storage_uri": storage_uri,
            "imported_at": timestamp(),
        }

        await update_job(
            state="SUCCEEDED",
            progress=100,
            current_step="Completed",
            finished_at=timestamp(),
            result=result,
        )
        return result

    except Exception as exc:
        error_info = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "timestamp": timestamp(),
        }
        await update_job(
            state="FAILED",
            current_step="Failed",
            finished_at=timestamp(),
            error=error_info,
        )
        raise


__all__ = ["run_import_catalog_item_job"]