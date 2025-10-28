import json
from types import SimpleNamespace

import fakeredis.aioredis
import pytest
from fastapi.testclient import TestClient

from api import main as main_module
from api import deps as deps_module
from api.main import app
from worker.celery_app import celery_app
from worker import celery_tasks as celery_tasks_module


@pytest.fixture(scope="session")
def fakeredis_server():
    return fakeredis.aioredis.FakeServer()


@pytest.fixture
def app_client(fakeredis_server, celery_eager_app, monkeypatch):
    original_redis_client = deps_module._redis_client
    original_main_get_redis = getattr(main_module, "get_redis", None)
    original_deps_get_redis = deps_module.get_redis

    async def override_get_redis():
        return fakeredis.aioredis.FakeRedis(server=fakeredis_server)

    deps_module._redis_client = None
    deps_module.get_redis = override_get_redis
    if original_main_get_redis is not None:
        main_module.get_redis = override_get_redis

    def make_fake_delay(task_name: str):
        def _fake_delay(*args, **kwargs):
            job_id = kwargs.get("job_id")
            if job_id is None and args:
                job_id = args[0]
            return SimpleNamespace(id=str(job_id or f"test-{task_name}"))

        return _fake_delay

    for task_name in (
        "example_long_task",
        "run_catalog_item",
        "provision_server_task",
        "import_catalog_item_task",
        "sync_catalog_registry_task",
        "sync_catalog_item",
        "sync_catalog_item_from_git",
    ):
        task = getattr(celery_tasks_module, task_name)
        monkeypatch.setattr(task, "delay", make_fake_delay(task_name))

    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()
        deps_module._redis_client = original_redis_client
        deps_module.get_redis = original_deps_get_redis
        if original_main_get_redis is not None:
            main_module.get_redis = original_main_get_redis


@pytest.fixture
def celery_eager_app():
    original_always_eager = celery_app.conf.task_always_eager
    original_eager_propagates = celery_app.conf.task_eager_propagates

    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True

    try:
        yield celery_app
    finally:
        celery_app.conf.task_always_eager = original_always_eager
        celery_app.conf.task_eager_propagates = original_eager_propagates
