import json
import uuid
import time
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis

from .deps import get_arq_pool
from .settings import settings
from .catalog.routes import router as catalog_router
from .task_queue import enqueue_job
from worker.job_status import touch_job, fetch_job_metadata


app = FastAPI(title="Jobs Dashboard API", version="1.0.0")

# Add CORS middleware for demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include catalog routers
app.include_router(catalog_router)
from .catalog.git_routes import router as git_routes
from .catalog.bundle_routes import router as bundle_routes
app.include_router(git_routes)
app.include_router(bundle_routes)

# Include admin routers
from .admin.routes_catalog import router as admin_catalog_router
app.include_router(admin_catalog_router)


# Pydantic models
class JobCreate(BaseModel):
    report_type: str
    parameters: Dict[str, Any] = {}
    user_id: Optional[str] = "demo_user"


class JobResponse(BaseModel):
    job_id: str


class JobDetail(BaseModel):
    id: str
    type: str
    state: str
    progress: float
    created_at: str
    updated_at: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    params: Optional[Dict[str, Any]] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[Union[str, Dict[str, Any]]] = None


class JobList(BaseModel):
    items: List[JobDetail]
    page: int
    page_size: int
    total: int


def _normalize_job_meta(raw: Dict[str, Any], job_id: str) -> Dict[str, Any]:
    job = dict(raw) if raw else {}
    job.setdefault("id", job_id)
    job.setdefault("type", "unknown")
    job.setdefault("state", "UNKNOWN")

    if not job.get("created_at"):
        job["created_at"] = job.get("updated_at", datetime.utcnow().isoformat())
    if not job.get("updated_at"):
        job["updated_at"] = job["created_at"]

    progress = job.get("progress")
    if isinstance(progress, str):
        try:
            job["progress"] = float(progress)
        except ValueError:
            job["progress"] = 0.0
    elif progress is None:
        job["progress"] = 0.0

    return job


# Pydantic models for self-service
class ServerProvisionRequest(BaseModel):
    name: str
    instance_type: str = "t3.medium"
    region: str = "us-east-1"
    tags: Dict[str, str] = {}
    user_id: Optional[str] = "demo_user"


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Failed to send to WebSocket client: {e}")
                # Mark for removal
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            if connection in self.active_connections:
                self.active_connections.remove(connection)


manager = ConnectionManager()


async def get_redis_client():
    """Get Redis client for direct operations"""
    return redis.from_url(settings.REDIS_URL)


@app.post("/jobs", response_model=JobResponse)
async def create_job(job_data: JobCreate, arq_pool=Depends(get_arq_pool)):
    """Enqueue a new job"""
    job_id = str(uuid.uuid4())
    
    # Handle catalog execution
    if job_data.report_type == "catalog":
        p = job_data.parameters or {}
        item_id = p.get("item_id")
        version = p.get("version") 
        inputs = p.get("inputs", {})
        if not (item_id and version):
            raise HTTPException(400, "item_id and version required for catalog")
        job = await enqueue_job(
            arq_pool,
            "run_catalog_item",
            item_id=item_id,
            version=version,
            inputs=inputs,
            user_id=job_data.user_id,
        )
        
        # Create proper job status record for dashboard tracking
        job_status = {
            "id": job.job_id,
            "state": "QUEUED",
            "type": "catalog_execution",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "finished_at": None,
            "params": {
                "item_id": item_id,
                "version": version,
                "inputs": inputs,
                "user_id": job_data.user_id
            },
            "result": None,
            "error": None
        }
        
        await touch_job(arq_pool, job_status)
        return JobResponse(job_id=job.job_id)
    
    # Handle regular jobs
    payload = {
        "report_type": job_data.report_type,
        "parameters": job_data.parameters,
        "user_id": job_data.user_id
    }
    
    # Enqueue the job
    await enqueue_job(arq_pool, "example_long_task", job_id, payload)
    
    return JobResponse(job_id=job_id)


@app.get("/jobs", response_model=JobList)
async def list_jobs(
    state: Optional[str] = Query(None, description="Filter by state: QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED"),
    q: Optional[str] = Query(None, description="Search in job ID or type"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """List jobs with optional filtering and pagination"""
    redis_client = await get_redis_client()
    
    try:
        # Determine which index to use
        if state:
            index_key = f"jobs:index:state:{state}"
        else:
            index_key = "jobs:index"
        
        # Get total count
        total = await redis_client.zcard(index_key)
        
        # Calculate pagination
        start = (page - 1) * page_size
        end = start + page_size - 1
        
        # Get job IDs (newest first)
        job_ids = await redis_client.zrevrange(index_key, start, end)
        
        jobs = []
        for raw_job_id in job_ids:
            job_id = raw_job_id.decode() if isinstance(raw_job_id, bytes) else str(raw_job_id)
            job_meta, _ = await fetch_job_metadata(redis_client, job_id)

            if not job_meta:
                continue

            job_dict = _normalize_job_meta(job_meta, job_id)

            if q:
                text = f"{job_dict.get('id', '')} {job_dict.get('type', '')}".lower()
                if q.lower() not in text:
                    continue

            jobs.append(JobDetail(**job_dict))
        
        return JobList(
            items=jobs,
            page=page,
            page_size=page_size,
            total=total
        )
    
    finally:
        await redis_client.aclose()


@app.get("/jobs/{job_id}", response_model=JobDetail)
async def get_job(job_id: str):
    """Get job details by ID"""
    redis_client = await get_redis_client()
    
    try:
        job_meta, _ = await fetch_job_metadata(redis_client, job_id)

        if not job_meta:
            raise HTTPException(status_code=404, detail="Job not found")

        job_dict = _normalize_job_meta(job_meta, job_id)

        return JobDetail(**job_dict)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching job: {str(e)}")
    finally:
        await redis_client.aclose()


@app.post("/jobs/{job_id}/retry", response_model=JobResponse)
async def retry_job(job_id: str, arq_pool=Depends(get_arq_pool)):
    """Retry a failed or cancelled job"""
    # Get current job details
    redis_client = await get_redis_client()
    
    try:
        job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"
        job_data = await redis_client.hgetall(job_key)
        
        if not job_data:
            raise HTTPException(status_code=404, detail="Job not found")
        
        state = job_data.get(b"state", b"").decode()
        if state not in ["FAILED", "CANCELLED"]:
            raise HTTPException(status_code=400, detail="Job can only be retried if it's FAILED or CANCELLED")
        
        # Get original parameters
        params_str = job_data.get(b"params", b"{}").decode()
        try:
            params = json.loads(params_str)
        except json.JSONDecodeError:
            params = {}
        
        # Create new job
        new_job_id = str(uuid.uuid4())
        await enqueue_job(arq_pool, "example_long_task", new_job_id, params)
        
        return JobResponse(job_id=new_job_id)
    
    finally:
        await redis_client.aclose()


@app.websocket("/ws/jobs")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time job updates"""
    await manager.connect(websocket)
    redis_client = None
    pubsub = None
    
    try:
        # Create a dedicated Redis client for pubsub
        redis_client = redis.from_url(settings.REDIS_URL)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe("channel:jobs")
        
        print(f"WebSocket connected and subscribed to channel:jobs")
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                # Forward message to WebSocket clients
                data = message["data"]
                if isinstance(data, bytes):
                    data = data.decode()
                print(f"Broadcasting WebSocket message: {data}")
                await manager.broadcast(data)
    
    except WebSocketDisconnect:
        print("WebSocket disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
    finally:
        try:
            if pubsub:
                await pubsub.unsubscribe("channel:jobs")
                await pubsub.close()
            if redis_client:
                await redis_client.close()
        except Exception as e:
            print(f"Error cleaning up WebSocket resources: {e}")


@app.post("/dev/seed")
async def seed_jobs(arq_pool=Depends(get_arq_pool)):
    """Development endpoint to seed demo jobs"""
    demo_jobs = [
        {"report_type": "sales_report", "parameters": {"region": "US", "month": "2024-01"}},
        {"report_type": "user_analytics", "parameters": {"dashboard": "main", "period": "weekly"}},
        {"report_type": "financial_summary", "parameters": {"quarter": "Q4", "year": 2024}},
        {"report_type": "inventory_check", "parameters": {"warehouse": "east", "category": "electronics"}},
        {"report_type": "performance_metrics", "parameters": {"team": "engineering", "sprint": "2024-02"}}
    ]
    
    job_ids = []
    for job_data in demo_jobs:
        job_id = str(uuid.uuid4())
        await enqueue_job(arq_pool, "example_long_task", job_id, job_data)
        job_ids.append(job_id)
    
    return {"message": f"Seeded {len(job_ids)} demo jobs", "job_ids": job_ids}


@app.post("/provision/server", response_model=JobResponse)
async def provision_server(request: ServerProvisionRequest, arq_pool=Depends(get_arq_pool)):
    """Provision a new server"""
    job_id = str(uuid.uuid4())
    
    payload = {
        "service_type": "server_provisioning",
        "server_config": {
            "name": request.name,
            "instance_type": request.instance_type,
            "region": request.region,
            "tags": request.tags
        },
        "user_id": request.user_id
    }
    
    # Enqueue the server provisioning job
    await enqueue_job(arq_pool, "provision_server_task", job_id, payload)
    
    return JobResponse(job_id=job_id)


# TODO: Add JWT authentication and user-scoped job access
# TODO: Add job cancellation support (check job:{id}:cancel flag in worker)
# TODO: Add metrics collection for Prometheus/OpenTelemetry

@app.get("/")
async def root():
    return {"message": "Jobs Dashboard API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
