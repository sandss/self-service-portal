from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict

from .job_status import touch_job


async def run_provision_server_task(
    redis_client,
    job_id: str,
    payload: Dict[str, Any],
    *,
    sleep_func: Callable[[float], Awaitable[None]] | None = None,
) -> None:
    """Shared async implementation for provisioning a server job."""

    sleep = sleep_func or asyncio.sleep

    job_meta = {
        "id": job_id,
        "type": "provision_server",
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
        job_meta.update(
            {
                "state": "RUNNING",
                "started_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "current_step": "Starting provisioning",
            }
        )
        await touch_job(redis_client, job_meta)

        steps = [
            ("Validating configuration", 10),
            ("Allocating compute resources", 20),
            ("Setting up networking", 35),
            ("Installing operating system", 50),
            ("Configuring security groups", 65),
            ("Installing software packages", 80),
            ("Running health checks", 90),
            ("Finalizing setup", 100),
        ]

        for step_name, progress in steps:
            await sleep(2 + (progress % 3))
            job_meta.update(
                {
                    "progress": progress,
                    "updated_at": datetime.utcnow().isoformat(),
                    "current_step": step_name,
                }
            )
            await touch_job(redis_client, job_meta)

        server_config = payload.get("server_config", {})
        result = {
            "message": "Server provisioned successfully",
            "server_id": f"srv-{job_id[:8]}",
            "instance_type": server_config.get("instance_type", "t3.medium"),
            "region": server_config.get("region", "us-east-1"),
            "ip_address": f"10.0.{(hash(job_id) % 254) + 1}.{(hash(job_id[:8]) % 254) + 1}",
            "ssh_key": f"{server_config.get('name', 'server')}-key",
            "tags": server_config.get("tags", {}),
            "provisioned_at": datetime.utcnow().isoformat(),
        }

        job_meta.update(
            {
                "state": "SUCCEEDED",
                "progress": 100,
                "finished_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "result": result,
                "current_step": "Completed",
            }
        )
        await touch_job(redis_client, job_meta)

    except Exception as exc:  # pragma: no cover - defensive guard
        error_info = {
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "timestamp": datetime.utcnow().isoformat(),
        }

        job_meta.update(
            {
                "state": "FAILED",
                "finished_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "error": error_info,
                "current_step": "Failed",
            }
        )
        await touch_job(redis_client, job_meta)
        raise


__all__ = ["run_provision_server_task"]
