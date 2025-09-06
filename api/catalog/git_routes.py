from fastapi import APIRouter, Request, Depends, HTTPException
from arq.connections import ArqRedis
from ..deps import get_arq_pool

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
    return {"queued": 1, "repo_url": repo_url, "ref": tag, "job_id": job.job_id}

@router.post("/import")
async def import_from_git(payload: dict, arq: ArqRedis = Depends(get_arq_pool)):
    """
    Manual import trigger: { "repo_url": "...", "ref": "item@1.2.3" }
    """
    repo_url = payload.get("repo_url")
    ref = payload.get("ref")
    if not repo_url or not ref:
        raise HTTPException(400, "repo_url and ref required")
    job = await arq.enqueue_job("sync_catalog_item_from_git", repo_url=repo_url, ref=ref)
    return {"queued": True, "repo_url": repo_url, "ref": ref, "job_id": job.job_id}
