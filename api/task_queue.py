from __future__ import annotations

from types import SimpleNamespace
from typing import Any

from .settings import settings
from worker.celery_tasks import example_long_task, sync_catalog_item_from_git


_CELERY_TASK_MAP = {
    "example_long_task": example_long_task,
    "sync_catalog_item_from_git": sync_catalog_item_from_git,
}


def _infer_job_id(args: tuple[Any, ...], kwargs: dict[str, Any]) -> Any:
    if args:
        return args[0]
    return kwargs.get("job_id")


def _should_use_celery(task_name: str, job_id: Any | None) -> bool:
    if task_name not in settings.CELERY_TASKS:
        return False
    if task_name not in _CELERY_TASK_MAP:
        return False
    if job_id is None:
        return False
    return True


async def enqueue_job(arq_pool, task_name: str, *args: Any, **kwargs: Any):
    job_id = _infer_job_id(args, kwargs)
    if _should_use_celery(task_name, job_id):
        celery_task = _CELERY_TASK_MAP[task_name]
        result = celery_task.delay(*args, **kwargs)
        return SimpleNamespace(job_id=job_id or getattr(result, "id", None))

    return await arq_pool.enqueue_job(task_name, *args, **kwargs)


__all__ = ["enqueue_job"]
