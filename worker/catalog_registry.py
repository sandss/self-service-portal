"""Shared helpers for catalog registry synchronization jobs."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Dict

from api.catalog.registry import sync_registry_with_local
from worker.job_status import touch_job


async def run_sync_catalog_registry_job(
    redis_client,
    job_id: str,
    payload: Dict[str, Any] | None = None,
    *,
    now: Callable[[], datetime] | None = None,
) -> Dict[str, Any]:
    """Shared async implementation for syncing the catalog registry."""

    now = now or datetime.utcnow

    def timestamp() -> str:
        return now().isoformat()

    job_meta: Dict[str, Any] = {
        "id": job_id,
        "type": "sync_catalog_registry",
        "state": "QUEUED",
        "progress": 0,
        "created_at": timestamp(),
        "updated_at": timestamp(),
        "started_at": None,
        "finished_at": None,
        "params": payload or {},
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
            progress=20,
            current_step="Checking sync status",
        )

        await update_job(progress=80, current_step="Synchronizing registry with local files")

        sync_report = sync_registry_with_local()

        result = {
            "message": "Registry sync completed",
            "sync_report": sync_report,
            "completed_at": timestamp(),
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


__all__ = ["run_sync_catalog_registry_job"]
