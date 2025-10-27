import asyncio

import fakeredis.aioredis

from worker.celery_app import celery_app, create_celery_app
from worker.celery_tasks import example_long_task
from worker.job_status import fetch_job_metadata
from api.settings import settings


def test_celery_app_module_configured():
    assert celery_app.main == "self_service_portal"
    assert celery_app.conf.broker_url == settings.CELERY_BROKER_URL
    assert celery_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
    assert celery_app.conf.task_default_queue == settings.CELERY_TASK_DEFAULT_QUEUE
    assert celery_app.conf.task_track_started is settings.CELERY_TASK_TRACK_STARTED
    assert celery_app.conf.task_time_limit == settings.CELERY_TASK_TIME_LIMIT
    assert celery_app.conf.task_soft_time_limit == settings.CELERY_TASK_SOFT_TIME_LIMIT
    assert celery_app.conf.timezone == settings.CELERY_BEAT_SCHEDULE_TZ
    assert celery_app.conf.result_expires == settings.JOB_TTL
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.result_serializer == "json"
    assert celery_app.conf.accept_content == ["json"]


def test_create_celery_app_returns_new_instance():
    new_app = create_celery_app()
    try:
        assert new_app is not celery_app
        assert new_app.conf.broker_url == settings.CELERY_BROKER_URL
        assert new_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
    finally:
        new_app.close()


def test_celery_eager_fixture_sets_synchronous_mode(celery_eager_app):
    assert celery_eager_app.conf.task_always_eager is True
    assert celery_eager_app.conf.task_eager_propagates is True


def test_example_long_task_runs_in_eager_mode(monkeypatch, celery_eager_app, fakeredis_server):
    async def immediate_sleep(_duration):
        return None

    monkeypatch.setattr("worker.example_long.asyncio.sleep", immediate_sleep)

    def fake_from_url(_url, *args, **kwargs):
        return fakeredis.aioredis.FakeRedis(server=fakeredis_server)

    monkeypatch.setattr("worker.celery_tasks.redis.from_url", fake_from_url)

    job_payload = {"report_type": "test"}
    job_id = "celery-eager-test-job"

    result = example_long_task.delay(job_id, job_payload)
    assert result.result is None

    async def load_job_meta():
        client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
        try:
            metadata, _ = await fetch_job_metadata(client, job_id)
        finally:
            await client.aclose()
        return metadata

    job_meta = asyncio.run(load_job_meta())

    assert job_meta["state"] == "SUCCEEDED"
    assert job_meta["progress"] == 100
    assert job_meta["result"]["report_type"] == job_payload["report_type"]
    assert job_meta["type"] == "example_long_task"
