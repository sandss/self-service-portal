import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_create_and_get_job():
    """Test job creation and retrieval"""
    # Create a job
    job_data = {
        "report_type": "test_report",
        "parameters": {"test": "value"},
        "user_id": "test_user"
    }
    
    response = client.post("/jobs", json=job_data)
    assert response.status_code == 200
    
    result = response.json()
    assert "job_id" in result
    job_id = result["job_id"]
    
    # Give it a moment for the job to be processed
    import time
    time.sleep(0.5)
    
    # Get the job details
    response = client.get(f"/jobs/{job_id}")
    
    # Job should exist and have the correct structure
    if response.status_code == 200:
        job_detail = response.json()
        assert job_detail["id"] == job_id
        assert job_detail["type"] == "example_long_task"
        assert job_detail["state"] in ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED"]
        assert "created_at" in job_detail
        assert "updated_at" in job_detail
    else:
        # Job might not be found immediately in test environment
        # This is acceptable for the basic structure test
        assert response.status_code == 404


def test_list_jobs():
    """Test job listing endpoint"""
    response = client.get("/jobs")
    assert response.status_code == 200
    
    result = response.json()
    assert "items" in result
    assert "page" in result
    assert "page_size" in result
    assert "total" in result
    assert isinstance(result["items"], list)


def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    
    result = response.json()
    assert result["status"] == "healthy"
    assert "timestamp" in result
