import os
import json
import hashlib
import pathlib
from typing import Optional, Dict, Any, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session
from api.common.db import get_db
from api.catalog.models import CatalogItem, CatalogVersion, StorageObject

REGISTRY_PATH = "/app/data/catalog_registry.json"

def _load_registry() -> dict:
    p = pathlib.Path(REGISTRY_PATH)
    if not p.exists():
        # Create directory if it doesn't exist
        p.parent.mkdir(parents=True, exist_ok=True)
        # Initialize with empty registry
        initial_data = {"items": {}}
        p.write_text(json.dumps(initial_data, indent=2))
        return initial_data
    try:
        return json.loads(p.read_text())
    except (json.JSONDecodeError, FileNotFoundError):
        # If file is corrupted or missing, reinitialize
        initial_data = {"items": {}}
        p.write_text(json.dumps(initial_data, indent=2))
        return initial_data

def _write_registry(data: dict) -> None:
    p = pathlib.Path(REGISTRY_PATH)
    # Ensure parent directory exists
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2, sort_keys=True))

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

class CatalogRepo:
    def __init__(self, db: Session, db_enabled: bool = True):
        self.db = db
        self.db_enabled = db_enabled and (os.getenv("CATALOG_DB_ENABLED", "false").lower() == "true")

    # ---- WRITE PATH (dual-write) ----
    def register_version(
        self,
        *,
        item_id: str,
        name: str,
        manifest: Dict[str, Any],
        json_schema: Dict[str, Any],
        ui_schema: Optional[Dict[str, Any]],
        version: str,
        storage_uri: str,
        source: Dict[str, Any],
        is_active: bool,
        labels: Optional[Dict[str, Any]] = None,
        description: Optional[str] = None,
    ) -> Tuple[str, str]:
        # NOTE: JSON write is handled by upsert_version() in registry.py
        # We only handle database writes here to avoid overwriting the JSON file
        # which may have additional fields like additional_schemas
        
        # Best-effort DB write (must not fail silently; raise if DB_enabled and write fails)
        if self.db_enabled:
            try:
                ci = self.db.execute(select(CatalogItem).where(CatalogItem.item_id == item_id)).scalar_one_or_none()
                if not ci:
                    ci = CatalogItem(
                        item_id=item_id, 
                        name=name, 
                        description=description or "", 
                        labels=labels or {}
                    )
                    self.db.add(ci)
                    self.db.flush()
                
                # Calculate file stats if path exists
                sha = None
                size = None
                if os.path.exists(storage_uri):
                    sha = sha256_file(storage_uri)
                    size = pathlib.Path(storage_uri).stat().st_size
                
                cv = CatalogVersion(
                    catalog_item_id=ci.id, 
                    version=version,
                    manifest=manifest, 
                    json_schema=json_schema, 
                    ui_schema=ui_schema,
                    storage_uri=storage_uri, 
                    source=source,
                    is_active=is_active, 
                    size_bytes=size, 
                    checksum_sha256=sha,
                )
                self.db.add(cv)
                
                # Add storage object if not exists
                if sha and size:
                    so = self.db.execute(select(StorageObject).where(StorageObject.uri == storage_uri)).scalar_one_or_none()
                    if not so:
                        self.db.add(StorageObject(uri=storage_uri, bytes=size, checksum_sha256=sha))
                
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                # Re-raise to fail the request if DB write fails
                raise RuntimeError(f"Database write failed: {str(e)}")

        return (item_id, version)

    # ---- READ PATH (admin) ----
    def admin_list_items(self, q: Optional[str] = None, limit: int = 50, offset: int = 0):
        stmt = select(CatalogItem).order_by(CatalogItem.item_id).limit(limit).offset(offset)
        if q:
            stmt = select(CatalogItem).where(
                CatalogItem.item_id.ilike(f"%{q}%") | CatalogItem.name.ilike(f"%{q}%")
            ).order_by(CatalogItem.item_id).limit(limit).offset(offset)
        
        rows = self.db.execute(stmt).scalars().all()
        return [{
            "id": str(r.id),
            "item_id": r.item_id,
            "name": r.name,
            "description": r.description,
            "labels": r.labels or {},
            "version_count": len(r.versions),
            "created_at": r.created_at.isoformat() if r.created_at else None
        } for r in rows]

    def admin_item_detail(self, item_id: str):
        ci = self.db.execute(select(CatalogItem).where(CatalogItem.item_id == item_id)).scalar_one_or_none()
        if not ci: 
            return None
        
        return {
            "id": str(ci.id),
            "item_id": ci.item_id,
            "name": ci.name,
            "description": ci.description,
            "labels": ci.labels or {},
            "versions": [{
                "id": str(v.id),
                "version": v.version,
                "is_active": v.is_active,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "storage_uri": v.storage_uri,
                "size_bytes": v.size_bytes,
                "checksum_sha256": v.checksum_sha256,
            } for v in sorted(ci.versions, key=lambda x: x.created_at or x.version, reverse=True)]
        }
