from __future__ import annotations

from typing import Any, Dict

from arq import ArqRedis

from .catalog_import import run_import_catalog_item_job
from .catalog_registry import run_sync_catalog_registry_job
from .example_long import run_example_long_task as execute_example_long_task
from .job_status import set_status as update_job_status
from .provision_server import run_provision_server_task


async def set_status(
    arq_redis: ArqRedis,
    job_id: str,
    state: str,
    additional_data: Dict[str, Any] | None = None,
):
    """Compatibility shim that delegates to shared job status helper."""

    return await update_job_status(arq_redis, job_id, state, additional_data)


async def example_long_task(ctx, job_id: str, payload: dict):
    """Example long-running task executed via ARQ."""

    arq_redis = ctx["redis"]
    await execute_example_long_task(arq_redis, job_id, payload)


async def provision_server_task(ctx, job_id: str, payload: dict):
    """ARQ entrypoint delegating to the shared server provisioning implementation."""

    redis_client = ctx["redis"]
    await run_provision_server_task(redis_client, job_id, payload)


async def import_catalog_item_task(ctx, job_id: str, payload: dict):
    """ARQ wrapper that delegates to the shared import implementation."""

    redis_client = ctx["redis"]
    await run_import_catalog_item_job(redis_client, job_id, payload)


async def import_catalog_item(ctx, job_id: str, payload: dict):
    """Legacy alias that delegates to the shared import implementation."""

    await import_catalog_item_task(ctx, job_id, payload)


async def sync_catalog_registry_task(ctx, job_id: str, payload: dict):
    """ARQ wrapper that delegates to the shared registry sync implementation."""

    redis_client = ctx["redis"]
    await run_sync_catalog_registry_job(redis_client, job_id, payload)
