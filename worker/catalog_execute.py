from __future__ import annotations

import asyncio
import importlib.util
import inspect
import os
from datetime import datetime
from typing import Any, Dict

from jsonschema.exceptions import ValidationError

from api.catalog.registry import get_descriptor, get_local_catalog_item_path
from api.catalog.validate import validate_inputs
from worker.job_status import set_status, touch_job


def _load_task(task_path: str):
    if not os.path.exists(task_path):
        raise FileNotFoundError(
            f"Required task.py file not found at {task_path}. Each catalog item version must include a task.py file with validate() and run() functions."
        )

    spec = importlib.util.spec_from_file_location("bundle.task", task_path)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None  # pragma: no cover - mypy reassurance
    spec.loader.exec_module(mod)
    if not hasattr(mod, "run"):
        raise RuntimeError("task.py must define run(inputs)")
    return mod


async def run_catalog_execution_job(
    redis_client,
    job_id: str,
    item_id: str,
    version: str,
    inputs: Dict[str, Any],
    *,
    user_id: str | None = None,
) -> Any:
    """Shared async implementation for executing catalog items."""

    created_at = datetime.utcnow().isoformat()
    job_meta = {
        "id": job_id,
        "type": "catalog_execution",
        "state": "QUEUED",
        "progress": 0,
        "created_at": created_at,
        "updated_at": created_at,
        "started_at": None,
        "finished_at": None,
        "params": {
            "item_id": item_id,
            "version": version,
            "inputs": inputs,
            "user_id": user_id,
        },
        "result": None,
        "error": None,
    }
    await touch_job(redis_client, job_meta)

    async def progress_callback(progress: int, message: str | None = None):
        payload = {"progress": progress}
        if message:
            payload["message"] = message
        await set_status(redis_client, job_id, "RUNNING", payload)

    try:
        await set_status(
            redis_client,
            job_id,
            "RUNNING",
            {"progress": 5, "message": "Starting task execution"},
        )

        descriptor = get_descriptor(item_id, version)
        if not descriptor:
            raise FileNotFoundError(f"Descriptor not found for {item_id}@{version}")

        schema = descriptor["schema"]
        validate_inputs(schema, inputs)

        item_path = get_local_catalog_item_path(item_id, version)
        task_path = os.path.join(item_path, "task.py")
        task_module = _load_task(task_path)

        signature = inspect.signature(task_module.run)
        if "progress_callback" in signature.parameters:
            result = task_module.run(inputs, progress_callback=progress_callback)
        else:
            result = task_module.run(inputs)

        if asyncio.iscoroutine(result):
            result = await result

        await set_status(
            redis_client,
            job_id,
            "SUCCEEDED",
            {
                "result": result,
                "progress": 100,
                "message": "Task completed successfully",
            },
        )
        return result

    except ValidationError as exc:
        error_payload = {
            "error_type": type(exc).__name__,
            "error_message": exc.message,
        }
        if exc.path:
            error_payload["error_path"] = list(exc.path)
        await set_status(redis_client, job_id, "FAILED", {"error": error_payload})
        raise
    except Exception as exc:
        error_payload = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
        }
        await set_status(redis_client, job_id, "FAILED", {"error": error_payload})
        raise


async def run_catalog_item(ctx, item_id: str, version: str, inputs: Dict[str, Any], user_id: str | None = None):
    """ARQ adapter that delegates to the shared catalog execution runner."""

    redis_client = ctx["redis"]
    job_id = ctx["job_id"]
    await run_catalog_execution_job(redis_client, job_id, item_id, version, inputs, user_id=user_id)


__all__ = ["run_catalog_execution_job", "run_catalog_item"]
