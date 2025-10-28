"""Celery task definitions for the worker service."""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Dict

import redis.asyncio as redis

from api.settings import settings
from .celery_app import celery_app
from .catalog_execute import run_catalog_execution_job
from .catalog_import import run_import_catalog_item_job
from .catalog_registry import run_sync_catalog_registry_job
from .example_long import run_example_long_task
from .provision_server import run_provision_server_task
from .sync_catalog_item import run_sync_catalog_item_from_git


async def _run_with_redis(
    runner: Callable[[Any, str, Dict[str, Any]], Awaitable[None]],
    job_id: str,
    payload: Dict[str, Any],
) -> None:
    redis_client = redis.from_url(settings.REDIS_URL)
    try:
        await runner(redis_client, job_id, payload)
    finally:
        await redis_client.aclose()


async def _run_example_task(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_example_long_task, job_id, payload)


@celery_app.task(name="example_long_task")
def example_long_task(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around the shared example long-running task."""
    asyncio.run(_run_example_task(job_id, payload))


async def _run_provision_task(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_provision_server_task, job_id, payload)


@celery_app.task(name="provision_server_task")
def provision_server_task(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around the server provisioning job."""
    asyncio.run(_run_provision_task(job_id, payload))


async def _catalog_execution_runner(redis_client, job_id: str, payload: Dict[str, Any]) -> None:
    await run_catalog_execution_job(
        redis_client,
        job_id,
        payload["item_id"],
        payload["version"],
        payload["inputs"],
        user_id=payload.get("user_id"),
    )


async def _run_catalog_item(
    job_id: str,
    item_id: str,
    version: str,
    inputs: Dict[str, Any],
    user_id: str | None = None,
) -> None:
    payload = {
        "item_id": item_id,
        "version": version,
        "inputs": inputs,
        "user_id": user_id,
    }
    await _run_with_redis(_catalog_execution_runner, job_id, payload)


@celery_app.task(name="run_catalog_item")
def run_catalog_item(
    job_id: str,
    item_id: str,
    version: str,
    inputs: Dict[str, Any],
    user_id: str | None = None,
) -> None:
    """Celery wrapper around catalog item execution."""

    asyncio.run(_run_catalog_item(job_id, item_id, version, inputs, user_id))


async def _run_catalog_import(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_import_catalog_item_job, job_id, payload)


@celery_app.task(name="import_catalog_item_task")
def import_catalog_item_task(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around catalog import job."""

    asyncio.run(_run_catalog_import(job_id, payload))


async def _run_registry_sync(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_sync_catalog_registry_job, job_id, payload)


@celery_app.task(name="sync_catalog_registry_task")
def sync_catalog_registry_task(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around registry synchronization job."""

    asyncio.run(_run_registry_sync(job_id, payload))


async def _run_sync_catalog_job(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_sync_catalog_item_from_git, job_id, payload)


@celery_app.task(name="sync_catalog_item_from_git")
def sync_catalog_item_from_git(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around the Git catalog sync job."""
    asyncio.run(_run_sync_catalog_job(job_id, payload))


@celery_app.task(name="sync_catalog_item")
def sync_catalog_item(job_id: str, payload: Dict[str, Any]) -> None:
    """Compatibility wrapper for legacy job name."""

    asyncio.run(_run_sync_catalog_job(job_id, payload))


__all__ = [
    "example_long_task",
    "provision_server_task",
    "run_catalog_item",
    "import_catalog_item_task",
    "sync_catalog_registry_task",
    "sync_catalog_item",
    "sync_catalog_item_from_git",
]
