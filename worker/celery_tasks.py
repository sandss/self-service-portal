"""Celery task definitions for the worker service."""

from __future__ import annotations

import asyncio
from typing import Any, Awaitable, Callable, Dict

import redis.asyncio as redis

from api.settings import settings
from .celery_app import celery_app
from .example_long import run_example_long_task
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


async def _run_sync_catalog_job(job_id: str, payload: Dict[str, Any]) -> None:
    await _run_with_redis(run_sync_catalog_item_from_git, job_id, payload)


@celery_app.task(name="sync_catalog_item_from_git")
def sync_catalog_item_from_git(job_id: str, payload: Dict[str, Any]) -> None:
    """Celery wrapper around the Git catalog sync job."""
    asyncio.run(_run_sync_catalog_job(job_id, payload))


__all__ = [
    "example_long_task",
    "sync_catalog_item_from_git",
]
