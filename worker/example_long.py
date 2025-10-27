"""Shared logic for the example long-running task used by ARQ and Celery."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict

from .job_status import touch_job


async def run_example_long_task(redis_client, job_id: str, payload: Dict[str, Any], sleep_func=asyncio.sleep) -> None:
    """Execute the example long task using the provided async Redis client."""
    job_meta = {
        "id": job_id,
        "type": "example_long_task",
        "state": "QUEUED",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "finished_at": None,
        "params": payload,
        "result": None,
        "error": None,
    }
    await touch_job(redis_client, job_meta)

    try:
        job_meta.update({
            "state": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        })
        await touch_job(redis_client, job_meta)

        for i in range(1, 6):
            await sleep_func(1)
            progress = (i / 5) * 100
            job_meta.update({
                "progress": progress,
                "updated_at": datetime.utcnow().isoformat(),
            })
            await touch_job(redis_client, job_meta)

        result = {
            "message": "Task completed successfully",
            "processed_items": 100,
            "report_type": payload.get("report_type", "default"),
            "completion_time": datetime.utcnow().isoformat(),
        }

        job_meta.update({
            "state": "SUCCEEDED",
            "progress": 100,
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": result,
        })
        await touch_job(redis_client, job_meta)

    except Exception as exc:
        error_info = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "timestamp": datetime.utcnow().isoformat(),
        }
        job_meta.update({
            "state": "FAILED",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": error_info,
        })
        await touch_job(redis_client, job_meta)
        raise


__all__ = ["run_example_long_task"]
