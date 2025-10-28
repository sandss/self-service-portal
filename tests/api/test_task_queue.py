from types import SimpleNamespace

import pytest

from api.settings import settings
from api.task_queue import enqueue_job


pytestmark = pytest.mark.anyio("asyncio")


@pytest.fixture
def anyio_backend():
    return "asyncio"


async def test_enqueue_job_dispatches_to_celery(monkeypatch):
    captured = {}

    def fake_delay(job_id, payload):
        captured["job_id"] = job_id
        captured["payload"] = payload
        return SimpleNamespace(id="celery-id")

    monkeypatch.setattr("worker.celery_tasks.provision_server_task.delay", fake_delay)

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["provision_server_task"]
    try:
        payload = {"server_config": {"instance_type": "c5.large"}}
        result = await enqueue_job(
            "provision_server_task",
            "job-456",
            payload=payload,
        )
    finally:
        settings.CELERY_TASKS = original_tasks

    assert captured == {"job_id": "job-456", "payload": payload}
    assert result.job_id == "job-456"


async def test_enqueue_job_requires_job_id(monkeypatch):
    monkeypatch.setattr(
        "worker.celery_tasks.example_long_task.delay",
        lambda *args, **kwargs: SimpleNamespace(id="celery-id"),
    )

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["example_long_task"]
    try:
        with pytest.raises(ValueError):
            await enqueue_job("example_long_task", payload={"foo": "bar"})
    finally:
        settings.CELERY_TASKS = original_tasks


async def test_enqueue_job_rejects_disabled_task(monkeypatch):
    monkeypatch.setattr(
        "worker.celery_tasks.example_long_task.delay",
        lambda *args, **kwargs: SimpleNamespace(id="celery-id"),
    )

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["provision_server_task"]
    try:
        with pytest.raises(ValueError):
            await enqueue_job("example_long_task", "job-123", payload={})
    finally:
        settings.CELERY_TASKS = original_tasks


async def test_enqueue_job_rejects_unknown_task():
    with pytest.raises(ValueError):
        await enqueue_job("unknown_task", "job-789", payload={})