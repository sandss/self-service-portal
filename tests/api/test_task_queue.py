from types import SimpleNamespace

import pytest

from api.settings import settings
from api.task_queue import enqueue_job


pytestmark = pytest.mark.anyio("asyncio")


@pytest.fixture
def anyio_backend():
    return "asyncio"


class DummyArq:
    def __init__(self):
        self.calls = []

    async def enqueue_job(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        return SimpleNamespace(job_id="arq-job")


async def test_enqueue_job_routes_to_celery(monkeypatch):
    dummy_arq = DummyArq()
    recorded = {}

    def fake_delay(*args, **kwargs):
        recorded["args"] = args
        recorded["kwargs"] = kwargs
        return SimpleNamespace(id="celery-id")

    monkeypatch.setattr("worker.celery_tasks.example_long_task.delay", fake_delay)

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["example_long_task"]
    try:
        result = await enqueue_job(dummy_arq, "example_long_task", "job-123", {"foo": "bar"})
    finally:
        settings.CELERY_TASKS = original_tasks

    assert recorded["args"] == ("job-123", {"foo": "bar"})
    assert result.job_id == "job-123"
    assert dummy_arq.calls == []


async def test_enqueue_job_falls_back_without_job_id(monkeypatch):
    dummy_arq = DummyArq()

    def fake_delay(*args, **kwargs):  # pragma: no cover - should not be called
        raise AssertionError("Celery delay should not be invoked")

    monkeypatch.setattr("worker.celery_tasks.example_long_task.delay", fake_delay)

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["example_long_task"]
    try:
        result = await enqueue_job(dummy_arq, "example_long_task", payload={"bar": "baz"})
    finally:
        settings.CELERY_TASKS = original_tasks

    assert len(dummy_arq.calls) == 1
    args, kwargs = dummy_arq.calls[0]
    assert kwargs["payload"] == {"bar": "baz"}
    assert result.job_id == "arq-job"