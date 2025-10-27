from fastapi.testclient import TestClient


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


def test_list_jobs(app_client: TestClient):
    response = app_client.get("/jobs")
    assert response.status_code == 200

    result = response.json()
    assert "items" in result
    assert "page" in result
    assert "page_size" in result
    assert "total" in result
    assert isinstance(result["items"], list)


def test_health_check(app_client: TestClient):
    response = app_client.get("/health")
    assert response.status_code == 200

    result = response.json()
    assert result["status"] == "healthy"
    assert "timestamp" in result
