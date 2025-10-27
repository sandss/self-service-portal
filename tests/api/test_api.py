import asyncio
import json
import time

import fakeredis.aioredis
from fastapi.testclient import TestClient

from api.settings import settings


def test_create_and_get_job(app_client: TestClient):
    """Test job creation and retrieval"""
    job_data = {
        "report_type": "test_report",
        "parameters": {"test": "value"},
        "user_id": "test_user",
    }

    response = app_client.post("/jobs", json=job_data)
    assert response.status_code == 200

    result = response.json()
    assert "job_id" in result
    job_id = result["job_id"]

    response = app_client.get(f"/jobs/{job_id}")

    if response.status_code == 200:
        job_detail = response.json()
        assert job_detail["id"] == job_id
        assert job_detail["type"] == "example_long_task"
        assert job_detail["state"] in {"QUEUED", "RUNNING", "SUCCEEDED", "FAILED"}
        assert "created_at" in job_detail
        assert "updated_at" in job_detail
    else:
        assert response.status_code == 404


def test_create_job_routes_to_celery(monkeypatch, app_client: TestClient):
    job_data = {
        "report_type": "test_report",
        "parameters": {"alpha": 1},
        "user_id": "celery-user",
    }

    captured = {}

    def fake_delay(job_id, payload):
        captured["job_id"] = job_id
        captured["payload"] = payload
        return type("Result", (), {"id": "celery-id"})()

    monkeypatch.setattr("worker.celery_tasks.example_long_task.delay", fake_delay)

    original_tasks = settings.CELERY_TASKS
    settings.CELERY_TASKS = ["example_long_task"]
    try:
        response = app_client.post("/jobs", json=job_data)
    finally:
        settings.CELERY_TASKS = original_tasks

    assert response.status_code == 200
    assert captured["job_id"]
    assert captured["payload"]["report_type"] == "test_report"


def test_list_jobs(app_client: TestClient):
    response = app_client.get("/jobs")
    assert response.status_code == 200

    result = response.json()
    assert "items" in result
    assert "page" in result
    assert "page_size" in result
    assert "total" in result
    assert isinstance(result["items"], list)


def test_legacy_string_job_visible(app_client: TestClient, fakeredis_server):
    job_id = "legacy-string-job"
    job_payload = {
        "id": job_id,
        "type": "legacy_task",
        "state": "SUCCEEDED",
        "progress": 100,
        "created_at": "2024-01-01T00:00:00",
        "updated_at": "2024-01-01T00:00:00",
        "result": {"message": "done"},
    }

    redis_client = fakeredis.aioredis.FakeRedis(server=fakeredis_server)
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(redis_client.set(
            f"{settings.JOB_STATUS_PREFIX}{job_id}", json.dumps(job_payload)
        ))
        loop.run_until_complete(redis_client.zadd("jobs:index", {job_id: time.time()}))
    finally:
        loop.run_until_complete(redis_client.aclose())

    response = app_client.get("/jobs")
    assert response.status_code == 200

    items = response.json()["items"]
    assert any(job["id"] == job_id for job in items)


def test_catalog_job_appears_in_list(app_client: TestClient):
    payload = {
        "report_type": "catalog",
        "parameters": {
            "item_id": "demo-item",
            "version": "1.0.0",
            "inputs": {},
        },
        "user_id": "test-user",
    }

    response = app_client.post("/jobs", json=payload)
    assert response.status_code == 200
    job_id = response.json()["job_id"]

    list_response = app_client.get("/jobs")
    assert list_response.status_code == 200

    items = list_response.json()["items"]
    ids = {item["id"] for item in items}
    assert job_id in ids

    job_entry = next(item for item in items if item["id"] == job_id)
    assert job_entry["type"] == "catalog_execution"
    assert job_entry["state"] == "QUEUED"


def test_health_check(app_client: TestClient):
    response = app_client.get("/health")
    assert response.status_code == 200

    result = response.json()
    assert result["status"] == "healthy"
    assert "timestamp" in result
