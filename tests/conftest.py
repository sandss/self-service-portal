import json
import time
import uuid
from datetime import datetime
from types import SimpleNamespace

import fakeredis.aioredis
import pytest
from fastapi.testclient import TestClient

from api import main as main_module
from api.deps import get_arq_pool
from api.main import app
from api.settings import settings


class FakeArqPool:
    """Minimal ARQ-compatible interface backed by fakeredis."""

    def __init__(self, server: fakeredis.aioredis.FakeServer):
        self._server = server

    def _client(self):
        return fakeredis.aioredis.FakeRedis(server=self._server)

    async def enqueue_job(self, job_name, *args, **kwargs):
        redis_client = self._client()
        try:
            job_id = kwargs.get("job_id")
            if not job_id and args:
                job_id = args[0]
            if not job_id:
                job_id = str(uuid.uuid4())

            timestamp = time.time()
            now_iso = datetime.utcnow().isoformat()
            job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"

            await redis_client.hset(job_key, mapping={
                "id": job_id,
                "state": "QUEUED",
                "type": job_name,
                "progress": "0",
                "created_at": now_iso,
                "updated_at": now_iso,
            })
            await redis_client.zadd("jobs:index", {job_id: timestamp})
            return SimpleNamespace(job_id=job_id)
        finally:
            await redis_client.aclose()

    async def hset(self, key, mapping):
        redis_client = self._client()
        try:
            serialised = {}
            for k, v in mapping.items():
                if v is None:
                    continue
                if isinstance(v, (dict, list)):
                    serialised[k] = json.dumps(v)
                else:
                    serialised[k] = str(v)

            if serialised:
                await redis_client.hset(key, mapping=serialised)
        finally:
            await redis_client.aclose()

    async def expire(self, key, ttl):
        redis_client = self._client()
        try:
            await redis_client.expire(key, ttl)
        finally:
            await redis_client.aclose()

    async def hgetall(self, key):
        redis_client = self._client()
        try:
            return await redis_client.hgetall(key)
        finally:
            await redis_client.aclose()

    async def get(self, key):
        redis_client = self._client()
        try:
            return await redis_client.get(key)
        finally:
            await redis_client.aclose()


@pytest.fixture(scope="session")
def fakeredis_server():
    return fakeredis.aioredis.FakeServer()


@pytest.fixture
def app_client(fakeredis_server):
    fake_pool = FakeArqPool(fakeredis_server)

    original_get_redis_client = main_module.get_redis_client

    async def override_get_redis_client():
        return fakeredis.aioredis.FakeRedis(server=fakeredis_server)

    async def override_get_arq_pool():
        return fake_pool

    app.dependency_overrides[get_arq_pool] = override_get_arq_pool
    main_module.get_redis_client = override_get_redis_client

    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()
        app.dependency_overrides.clear()
        main_module.get_redis_client = original_get_redis_client
