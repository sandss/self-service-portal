from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from .settings import settings
from worker.celery_tasks import (
    example_long_task,
    import_catalog_item_task,
    provision_server_task,
    run_catalog_item,
    sync_catalog_item,
    sync_catalog_item_from_git,
    sync_catalog_registry_task,
)


_CELERY_TASK_MAP = {
    "example_long_task": example_long_task,
    "run_catalog_item": run_catalog_item,
    "provision_server_task": provision_server_task,
    "import_catalog_item_task": import_catalog_item_task,
    "sync_catalog_registry_task": sync_catalog_registry_task,
    "sync_catalog_item": sync_catalog_item,
    "sync_catalog_item_from_git": sync_catalog_item_from_git,
}


def _infer_job_id(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Any:
    if args:
        return args[0]
    return kwargs.get("job_id")


def _get_celery_task(task_name: str):
    if task_name not in settings.CELERY_TASKS:
        raise ValueError(f"Task '{task_name}' is not enabled for Celery dispatch")
    try:
        return _CELERY_TASK_MAP[task_name]
    except KeyError as exc:
        raise ValueError(f"Unknown Celery task '{task_name}'") from exc


async def enqueue_job(task_name: str, *args: Any, **kwargs: Any):
    job_id = _infer_job_id(args, kwargs)
    if job_id is None:
        raise ValueError("enqueue_job requires a job_id as the first positional argument or keyword")

    celery_task = _get_celery_task(task_name)
    result = celery_task.delay(*args, **kwargs)
    return SimpleNamespace(job_id=job_id or getattr(result, "id", None))


__all__ = ["enqueue_job"]
