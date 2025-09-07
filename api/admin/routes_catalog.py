from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import os
from api.common.db import get_db
from api.catalog.repository import CatalogRepo

router = APIRouter(prefix="/admin/catalog", tags=["admin-catalog"])

def require_db_reads():
    if os.getenv("CATALOG_DB_READS_FOR_ADMIN", "false").lower() != "true":
        raise HTTPException(status_code=503, detail="Admin DB reads disabled")
    return True

@router.get("/items")
def list_items(
    q: str | None = Query(default=None), 
    limit: int = 50, 
    offset: int = 0, 
    _: bool = Depends(require_db_reads), 
    db: Session = Depends(get_db)
):
    repo = CatalogRepo(db=db)
    return {"items": repo.admin_list_items(q=q, limit=limit, offset=offset)}

@router.get("/items/{item_id}")
def get_item(
    item_id: str, 
    _: bool = Depends(require_db_reads), 
    db: Session = Depends(get_db)
):
    repo = CatalogRepo(db=db)
    data = repo.admin_item_detail(item_id)
    if not data:
        raise HTTPException(404, "Item not found")
    return data

@router.get("/items/{item_id}/versions")
def list_versions(
    item_id: str, 
    _: bool = Depends(require_db_reads), 
    db: Session = Depends(get_db)
):
    repo = CatalogRepo(db=db)
    data = repo.admin_item_detail(item_id)
    if not data:
        raise HTTPException(404, "Item not found")
    return {"versions": data["versions"]}

@router.get("/versions/{version_id}")
def version_detail(
    version_id: str, 
    _: bool = Depends(require_db_reads), 
    db: Session = Depends(get_db)
):
    from sqlalchemy import select
    from api.catalog.models import CatalogVersion
    
    try:
        # Parse UUID
        import uuid
        uuid.UUID(version_id)
    except ValueError:
        raise HTTPException(400, "Invalid version ID format")
    
    v = db.execute(select(CatalogVersion).where(CatalogVersion.id == version_id)).scalar_one_or_none()
    if not v: 
        raise HTTPException(404, "Version not found")
    
    return {
        "id": str(v.id),
        "item_id": v.item.item_id,
        "version": v.version,
        "manifest": v.manifest,
        "json_schema": v.json_schema,
        "ui_schema": v.ui_schema,
        "storage_uri": v.storage_uri,
        "source": v.source,
        "size_bytes": v.size_bytes,
        "checksum_sha256": v.checksum_sha256,
        "is_active": v.is_active,
        "created_at": v.created_at.isoformat() if v.created_at else None
    }
