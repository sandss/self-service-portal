import fakeredis.aioredis
import pytest

from worker.job_status import fetch_job_metadata
from worker.provision_server import run_provision_server_task


pytestmark = pytest.mark.anyio("asyncio")


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_run_provision_server_task_success(fakeredis_server):
    async def immediate_sleep(_duration):
        return None

    redis_client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    job_id = "provision-test"
    payload = {
        "service_type": "server_provisioning",
        "server_config": {
            "name": "demo",
            "instance_type": "c5.large",
            "region": "us-east-1",
            "tags": {"env": "test"},
        },
    }

    try:
        await run_provision_server_task(redis_client, job_id, payload, sleep_func=immediate_sleep)
    finally:
        await redis_client.aclose()

    redis_check = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    try:
        metadata, _ = await fetch_job_metadata(redis_check, job_id)
    finally:
        await redis_check.aclose()

    assert metadata["state"] == "SUCCEEDED"
    assert metadata["result"]["server_id"].startswith("srv-")
    assert metadata["result"]["instance_type"] == "c5.large"
    assert metadata["result"]["tags"]["env"] == "test"


@pytest.mark.anyio
async def test_run_provision_server_handles_failure(fakeredis_server):
    class Boom(Exception):
        pass

    async def failing_sleep(_duration):
        raise Boom("sleep failed")

    redis_client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    job_id = "provision-fail"
    payload = {"service_type": "server_provisioning", "server_config": {}}

    with pytest.raises(Boom):
        try:
            await run_provision_server_task(redis_client, job_id, payload, sleep_func=failing_sleep)
        finally:
            await redis_client.aclose()

    redis_check = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    try:
        metadata, _ = await fetch_job_metadata(redis_check, job_id)
    finally:
        await redis_check.aclose()

    assert metadata["state"] == "FAILED"
    assert metadata["error"]["error_type"] == "Boom"
