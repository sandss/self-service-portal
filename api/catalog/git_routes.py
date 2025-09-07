from fastapi import APIRouter, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
import json
import uuid
from datetime import datetime
from arq.connections import ArqRedis
from ..deps import get_arq_pool
from ..settings import settings

class GitImportRequest(BaseModel):
    repo_url: str
    item_name: str
    version: Optional[str] = None
    branch: Optional[str] = None

router = APIRouter(prefix="/catalog/git", tags=["catalog-git"])

@router.post("/webhook/github")
async def github_webhook(request: Request, arq: ArqRedis = Depends(get_arq_pool)):
    """GitHub webhook endpoint for automatic catalog sync on tag push"""
    body = await request.json()
    repo = body.get("repository", {})
    repo_url = repo.get("clone_url") or repo.get("ssh_url")
    if not repo_url:
        raise HTTPException(400, "missing repository url")
    ref = body.get("ref", "")
    if not ref.startswith("refs/tags/"):
        return {"queued": 0}  # ignore non-tag events
    tag = ref.split("/")[-1]
    job = await arq.enqueue_job("sync_catalog_item_from_git", repo_url=repo_url, ref=tag)
    
    # Create job status record for dashboard tracking
    await arq.set(
        f"{settings.JOB_STATUS_PREFIX}{job.job_id}", 
        json.dumps({
            "state": "QUEUED",
            "type": "git_webhook",
            "params": {
                "repo_url": repo_url,
                "ref": tag
            }
        }), 
        ex=settings.JOB_TTL
    )
    
    return {"queued": 1, "repo_url": repo_url, "ref": tag, "job_id": job.job_id}

@router.post("/import")
async def import_from_git(request: GitImportRequest, arq: ArqRedis = Depends(get_arq_pool)):
    """
    Import catalog item from git repository.
    
    Payload options:
    { 
        "repo_url": "https://github.com/user/repo", 
        "item_name": "ssl-certificate-check",
        "version": "1.2.1"           # Use specific version tag
    }
    OR
    { 
        "repo_url": "https://github.com/user/repo", 
        "item_name": "ssl-certificate-check",
        "branch": "main"             # Use latest from branch
    }
    """
    repo_url = request.repo_url
    item_name = request.item_name
    version = request.version
    branch = request.branch
    
    if not repo_url:
        raise HTTPException(400, "repo_url is required")
    if not item_name:
        raise HTTPException(400, "item_name is required")
    
    if version and branch:
        raise HTTPException(400, "specify either version OR branch, not both")
    
    if not version and not branch:
        raise HTTPException(400, "either version or branch is required")
    
    # Construct the ref for the worker
    if version:
        # For version: worker will checkout the version tag
        ref = f"{item_name}@{version}"
        source_type = "tag"
        source_ref = version
    else:
        # For branch: worker will checkout the branch
        ref = f"{item_name}@{branch}"
        source_type = "branch"
        source_ref = branch
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    job = await arq.enqueue_job("sync_catalog_item_from_git", job_id, {
        "repo_url": repo_url,
        "item_name": item_name,
        "source_type": source_type,
        "source_ref": source_ref,
        "ref": ref
    })
    
    # Create job status record for dashboard tracking
    job_data = {
        "id": job_id,
        "state": "QUEUED",
        "type": "git_import",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "started_at": None,
        "finished_at": None,
        "params": {
            "repo_url": repo_url,
            "item_name": item_name,
            "source_type": source_type,
            "source_ref": source_ref
        },
        "result": None,
        "error": None,
        "current_step": "Queued"
    }
    
    # Convert data to hash format
    hash_data = {}
    for key, value in job_data.items():
        if value is None:
            continue
        elif key in ["params", "result", "error"]:
            hash_data[key] = json.dumps(value)
        else:
            hash_data[key] = str(value)
    
    job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"
    await arq.hset(job_key, mapping=hash_data)
    await arq.expire(job_key, settings.JOB_TTL)
    
    return {
        "queued": True, 
        "repo_url": repo_url, 
        "item_name": item_name,
        "source_type": source_type,
        "source_ref": source_ref,
        "ref": ref, 
        "job_id": job_id
    }
