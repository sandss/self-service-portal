from fastapi import APIRouter, Request, Depends, UploadFile, File, HTTPException, Body
from redis.asyncio import Redis
from datetime import datetime
import uuid
from ..deps import get_redis
from ..task_queue import enqueue_job
from .registry import (
    list_items, list_versions, get_descriptor, resolve_latest, upsert_version,
    sync_registry_with_local, get_sync_status, migrate_legacy_local_storage,
    sync_local_to_registry, sync_registry_to_local, _load, _save, _lock
)
from .bundles import load_descriptor_from_dir, pack_dir, write_blob
from .validate import validate_manifest, validate_schema
from ..common.db import SessionLocal
from .repository import CatalogRepo
from .models import CatalogItem, CatalogVersion
import os, tempfile, json, yaml, shutil

router = APIRouter(prefix="/catalog", tags=["catalog"])

@router.get("")
def api_list_items():
    return {"items": list_items()}

@router.get("/{item_id}/versions")
def api_list_versions(item_id: str):
    return {"versions": list_versions(item_id)}

@router.get("/{item_id}/{version}/descriptor")
def api_descriptor(item_id: str, version: str):
    d = get_descriptor(item_id, version)
    if not d: raise HTTPException(404, "not found")
    return {
        "manifest": d["manifest"], 
        "schema": d["schema"], 
        "ui": d.get("ui", {}),
        "additional_schemas": d.get("additional_schemas", {})
    }

@router.get("/{item_id}/{version}/schema/{schema_name}")
def api_get_additional_schema(item_id: str, version: str, schema_name: str):
    """
    Fetch a specific schema by name from the additional_schemas collection.
    This is used for automatic schema switching based on x-schema-map.
    """
    d = get_descriptor(item_id, version)
    if not d: 
        raise HTTPException(404, "Item or version not found")
    
    additional_schemas = d.get("additional_schemas", {})
    
    if schema_name not in additional_schemas:
        raise HTTPException(404, f"Schema '{schema_name}' not found in additional schemas")
    
    return additional_schemas[schema_name]

@router.get("/{item_id}/latest/descriptor")
def api_descriptor_latest(item_id: str):
    r = resolve_latest(item_id)
    if not r: raise HTTPException(404, "not found")
    version, d = r
    return {
        "version": version, 
        "manifest": d["manifest"], 
        "schema": d["schema"], 
        "ui": d.get("ui", {}),
        "additional_schemas": d.get("additional_schemas", {})
    }

# Local import (DEPRECATED - use /import instead)
@router.post("/local/import")
def api_local_import(body: dict = Body(...)):
    """
    DEPRECATED: This endpoint is deprecated and will be removed in a future version.
    Use /import instead which provides async processing and better reliability.
    """
    # body = { "path": "/app/catalog_local/items/backup-config" }
    path = body.get("path")
    if not path or not os.path.isdir(path):
        raise HTTPException(400, "invalid path")
    m, s, u, additional = load_descriptor_from_dir(path)
    validate_manifest(m); validate_schema(s)
    item_id = m["id"]; version = m["version"]
    blob = pack_dir(path)
    storage_uri = write_blob(item_id, version, blob)
    upsert_version(item_id, version, m, s, u, storage_uri, {"source": "local", "path": path}, additional_schemas=additional)
    return {
        "item_id": item_id, 
        "version": version,
        "warning": "This endpoint is deprecated. Use /import for async processing."
    }

# Unified import endpoint - queues import job for async processing
@router.post("/import")
async def api_import(body: dict = Body(...)):
    try:
        item_id = body.get("itemId")
        version = body.get("version")
        schema = body.get("schema")
        ui_schema = body.get("uiSchema", {})
        manifest = body.get("manifest", {})
        
        if not item_id or not version or not schema:
            raise HTTPException(400, "itemId, version, and schema are required")
        
        # Create default manifest if not provided
        if not manifest:
            manifest = {
                "id": item_id,
                "name": item_id,
                "version": version,
                "description": f"Imported catalog item: {item_id}",
                "entrypoint": "task:run",
                "tags": ["imported"]
            }
        
        # Ensure manifest has required fields
        manifest["id"] = item_id
        manifest["version"] = version
        if "entrypoint" not in manifest:
            manifest["entrypoint"] = "task:run"
        if "name" not in manifest:
            manifest["name"] = item_id
        
        # Basic validation before queuing
        validate_manifest(manifest)
        validate_schema(schema)
        
        # Queue the import job for async processing
        job_id = str(uuid.uuid4())
        job = await enqueue_job(
            "import_catalog_item_task",
            job_id,
            payload={
                "item_id": item_id,
                "version": version,
                "manifest": manifest,
                "schema": schema,
                "ui_schema": ui_schema,
                "source": "ui_import",
            },
        )
        
        return {
            "success": True,
            "job_id": job.job_id,
            "item_id": item_id, 
            "version": version,
            "message": f"Import job queued for {item_id} v{version}",
            "status": "QUEUED"
        }
    
    except Exception as e:
        raise HTTPException(400, f"Import failed: {str(e)}")

# Job status endpoint for tracking import progress
@router.get("/import/status/{job_id}")
async def api_import_status(job_id: str, redis_client: Redis = Depends(get_redis)):
    """Get the status of an import job"""
    try:
        job_key = f"job:{job_id}"
        job_data = await redis_client.hgetall(job_key)
        
        if not job_data:
            raise HTTPException(404, "Job not found")
        
        # Convert bytes to strings and parse JSON fields
        result = {}
        for key, value in job_data.items():
            if isinstance(key, bytes):
                key = key.decode('utf-8')
            if isinstance(value, bytes):
                value = value.decode('utf-8')
            
            if key in ["params", "result", "error"] and value:
                try:
                    result[key] = json.loads(value)
                except json.JSONDecodeError:
                    result[key] = value
            else:
                result[key] = value
        
        return {
            "job_id": job_id,
            "status": result.get("state", "UNKNOWN"),
            "progress": int(result.get("progress", 0)),
            "current_step": result.get("current_step"),
            "created_at": result.get("created_at"),
            "started_at": result.get("started_at"),
            "finished_at": result.get("finished_at"),
            "result": result.get("result"),
            "error": result.get("error")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to get job status: {str(e)}")

# Git webhook (simplified: expects JSON {repo_url, tags: ["item@1.2.3", ...]})
@router.post("/git/webhook")
async def api_git_webhook(req: Request):
    payload = await req.json()
    repo_url = payload.get("repo_url")
    tags = payload.get("tags", [])
    if not repo_url or not tags:
        raise HTTPException(400, "repo_url and tags required")
    job_ids = []
    for tag in tags:
        job_id = str(uuid.uuid4())
        job = await enqueue_job(
            "sync_catalog_item",
            job_id,
            payload={"repo_url": repo_url, "ref": tag},
        )
        job_ids.append(job.job_id)
    return {"queued": len(job_ids), "job_ids": job_ids}

# List local catalog items
@router.get("/local")
def api_list_local_items():
    """List all locally stored catalog items with version support"""
    local_base_dir = "/app/catalog_local/items"
    items = []
    
    if os.path.exists(local_base_dir):
        for item_name in os.listdir(local_base_dir):
            item_path = os.path.join(local_base_dir, item_name)
            if os.path.isdir(item_path):
                versions = []
                
                # Check if this is the new versioned structure
                for version_dir in os.listdir(item_path):
                    version_path = os.path.join(item_path, version_dir)
                    if os.path.isdir(version_path):
                        # New versioned structure: items/{item_id}/{version}/
                        meta_path = os.path.join(version_path, "meta.json")
                        manifest_path = os.path.join(version_path, "manifest.yaml")
                        
                        version_info = {"version": version_dir, "path": version_path}
                        
                        # Read metadata if available
                        if os.path.exists(meta_path):
                            try:
                                with open(meta_path, "r") as f:
                                    meta = json.load(f)
                                version_info.update(meta)
                            except Exception:
                                pass
                        
                        # Read manifest if available  
                        if os.path.exists(manifest_path):
                            try:
                                with open(manifest_path, "r") as f:
                                    manifest = yaml.safe_load(f)
                                version_info["manifest"] = manifest
                            except Exception:
                                pass
                        
                        versions.append(version_info)
                
                # If no versions found, check for legacy flat structure
                if not versions:
                    meta_path = os.path.join(item_path, "meta.json")
                    manifest_path = os.path.join(item_path, "manifest.yaml")
                    
                    if os.path.exists(meta_path) or os.path.exists(manifest_path):
                        # Legacy flat structure: items/{item_id}/
                        version_info = {"version": "unknown", "path": item_path, "legacy": True}
                        
                        # Read metadata if available
                        if os.path.exists(meta_path):
                            try:
                                with open(meta_path, "r") as f:
                                    meta = json.load(f)
                                version_info.update(meta)
                            except Exception:
                                pass
                        
                        # Read manifest if available
                        if os.path.exists(manifest_path):
                            try:
                                with open(manifest_path, "r") as f:
                                    manifest = yaml.safe_load(f)
                                version_info["manifest"] = manifest
                            except Exception:
                                pass
                        
                        versions.append(version_info)
                
                if versions:
                    items.append({
                        "id": item_name,
                        "versions": versions,
                        "total_versions": len(versions)
                    })
    
    return {"items": items}

# Sync endpoints
@router.get("/sync/status")
def api_get_sync_status():
    """Get the sync status between registry and local filesystem"""
    return get_sync_status()

@router.post("/sync")
def api_sync_registry():
    """Sync the registry with local filesystem contents"""
    try:
        report = sync_registry_with_local()
        return {
            "success": True,
            "message": "Registry synced with local filesystem",
            "report": report
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")

@router.post("/sync/async")
async def api_sync_registry_async():
    """Start an async sync job to sync registry with local filesystem"""
    import uuid
    job_id = str(uuid.uuid4())
    
    try:
        await enqueue_job(
            "sync_catalog_registry_task",
            job_id,
            payload={
                "trigger": "manual",
                "requested_at": datetime.utcnow().isoformat(),
            },
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "message": "Sync job queued",
            "status_url": f"/catalog/sync/status/{job_id}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue sync job: {str(e)}")

@router.get("/sync/status/{job_id}")
async def api_get_sync_job_status(job_id: str, redis_client: Redis = Depends(get_redis)):
    """Get the status of a sync job"""
    from api.settings import settings
    import json
    
    job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"
    try:
        # Try to get as hash first
        job_data = await redis_client.hgetall(job_key)
        if not job_data:
            # Try as string
            job_str = await redis_client.get(job_key)
            if job_str:
                job_data = json.loads(job_str)
            else:
                raise HTTPException(status_code=404, detail="Sync job not found")
        
        # Decode bytes if needed
        if isinstance(job_data, dict):
            for key, value in job_data.items():
                if isinstance(key, bytes):
                    key = key.decode('utf-8')
                if isinstance(value, bytes):
                    value = value.decode('utf-8')
                
                if key in ["params", "result", "error"] and value:
                    try:
                        job_data[key] = json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        pass
        
        return job_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get job status: {str(e)}")

# Migration and sync endpoints
@router.post("/migrate-legacy")
def api_migrate_legacy_local_storage():
    """Migrate legacy flat local storage to versioned structure"""
    try:
        migrated = migrate_legacy_local_storage()
        return {
            "success": True,
            "migrated_items": migrated,
            "total_migrated": len(migrated)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


@router.post("/sync-local-to-registry")
def api_sync_local_to_registry():
    """Sync local storage to registry"""
    try:
        result = sync_local_to_registry()
        return {
            "success": True,
            "added_to_registry": result["added"],
            "errors": result["errors"],
            "total_added": len(result["added"]),
            "total_errors": len(result["errors"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/sync-registry-to-local")
def api_sync_registry_to_local():
    """Sync registry to local storage by creating missing local files"""
    try:
        result = sync_registry_to_local()
        return {
            "success": True,
            "created_locally": result["created"],
            "errors": result["errors"],
            "total_created": len(result["created"]),
            "total_errors": len(result["errors"])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registry to local sync failed: {str(e)}")


@router.post("/full-sync")
def api_full_sync():
    """Perform a full sync: migrate legacy, sync local to registry, sync registry to local"""
    try:
        # Step 1: Migrate legacy storage
        migrated = migrate_legacy_local_storage()
        
        # Step 2: Sync local to registry
        local_to_registry = sync_local_to_registry()
        
        # Step 3: Sync registry to local
        registry_to_local = sync_registry_to_local()
        
        return {
            "success": True,
            "migration": {
                "migrated_items": migrated,
                "total_migrated": len(migrated)
            },
            "local_to_registry": {
                "added": local_to_registry["added"],
                "errors": local_to_registry["errors"],
                "total_added": len(local_to_registry["added"])
            },
            "registry_to_local": {
                "created": registry_to_local["created"],
                "errors": registry_to_local["errors"],
                "total_created": len(registry_to_local["created"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full sync failed: {str(e)}")

@router.delete("/{item_id}")
def delete_catalog_item(item_id: str):
    """Delete an entire catalog item (all versions) from registry, database, and storage"""
    try:
        deleted_count = 0
        deleted_bundles = []
        errors = []
        
        # Load current registry
        with _lock:
            db = _load()
            
            if item_id not in db.get("items", {}):
                raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")
            
            item_data = db["items"][item_id]
            versions = list(item_data.get("versions", {}).keys())
            
            # Delete bundle files for each version
            for version in versions:
                version_data = item_data["versions"][version]
                storage_uri = version_data.get("storage_uri")
                
                if storage_uri and os.path.exists(storage_uri):
                    try:
                        os.remove(storage_uri)
                        deleted_bundles.append(storage_uri)
                    except Exception as e:
                        errors.append(f"Failed to delete bundle {storage_uri}: {str(e)}")
                
                # Also remove extracted files from catalog_local if they exist
                local_path = os.path.join("/app/catalog_local/items", item_id, version)
                if os.path.exists(local_path):
                    try:
                        import shutil
                        shutil.rmtree(local_path)
                        deleted_bundles.append(f"catalog_local: {local_path}")
                    except Exception as e:
                        errors.append(f"Failed to delete catalog_local {local_path}: {str(e)}")
                
                deleted_count += 1
            
            # Remove from JSON registry
            del db["items"][item_id]
            _save(db)
        
        # Remove from database if enabled
        try:
            with SessionLocal() as db_session:
                # Get the catalog item
                catalog_item = db_session.query(CatalogItem).filter(
                    CatalogItem.item_id == item_id
                ).first()
                
                if catalog_item:
                    # Delete all versions first (foreign key constraint)
                    db_session.query(CatalogVersion).filter(
                        CatalogVersion.catalog_item_id == catalog_item.id
                    ).delete()
                    
                    # Delete the item
                    db_session.delete(catalog_item)
                    db_session.commit()
                
        except Exception as e:
            errors.append(f"Database deletion failed: {str(e)}")
        
        # Remove extracted item directory from catalog_local if it exists
        item_dir = os.path.join("/app/catalog_local/items", item_id)
        if os.path.exists(item_dir):
            try:
                import shutil
                shutil.rmtree(item_dir)
                deleted_bundles.append(f"item directory: {item_dir}")
            except Exception as e:
                errors.append(f"Failed to delete item directory {item_dir}: {str(e)}")
        
        # Remove individual registry file if it exists
        individual_registry_file = f"/app/data/registry/{item_id}.json"
        if os.path.exists(individual_registry_file):
            try:
                os.remove(individual_registry_file)
            except Exception as e:
                errors.append(f"Failed to delete individual registry file: {str(e)}")
        
        return {
            "deleted": True,
            "item_id": item_id,
            "versions_deleted": deleted_count,
            "bundles_deleted": deleted_bundles,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

@router.delete("/{item_id}/{version}")
def delete_catalog_version(item_id: str, version: str):
    """Delete a specific version of a catalog item from registry, database, and storage"""
    try:
        deleted_bundle = None
        errors = []
        
        # Load current registry
        with _lock:
            db = _load()
            
            if item_id not in db.get("items", {}):
                raise HTTPException(status_code=404, detail=f"Item '{item_id}' not found")
            
            item_data = db["items"][item_id]
            if version not in item_data.get("versions", {}):
                raise HTTPException(status_code=404, detail=f"Version '{version}' not found for item '{item_id}'")
            
            version_data = item_data["versions"][version]
            storage_uri = version_data.get("storage_uri")
            
            # Delete bundle file
            if storage_uri and os.path.exists(storage_uri):
                try:
                    os.remove(storage_uri)
                    deleted_bundle = storage_uri
                except Exception as e:
                    errors.append(f"Failed to delete bundle {storage_uri}: {str(e)}")
            
            # Also remove extracted files from catalog_local if they exist
            local_path = os.path.join("/app/catalog_local/items", item_id, version)
            if os.path.exists(local_path):
                try:
                    import shutil
                    shutil.rmtree(local_path)
                    if not deleted_bundle:
                        deleted_bundle = f"catalog_local: {local_path}"
                    else:
                        deleted_bundle += f" and catalog_local: {local_path}"
                except Exception as e:
                    errors.append(f"Failed to delete catalog_local {local_path}: {str(e)}")
            
            # Remove version from JSON registry
            del item_data["versions"][version]
            
            # If no versions left, remove the entire item
            if not item_data["versions"]:
                del db["items"][item_id]
                item_removed = True
                
                # Also remove the entire item directory from catalog_local if it exists
                item_dir = os.path.join("/app/catalog_local/items", item_id)
                if os.path.exists(item_dir):
                    try:
                        import shutil
                        shutil.rmtree(item_dir)
                        deleted_bundle += f" and item directory: {item_dir}"
                    except Exception as e:
                        errors.append(f"Failed to delete item directory {item_dir}: {str(e)}")
            else:
                item_removed = False
            
            _save(db)
        
        # Remove from database if enabled
        try:
            with SessionLocal() as db_session:
                # Get the catalog item
                catalog_item = db_session.query(CatalogItem).filter(
                    CatalogItem.item_id == item_id
                ).first()
                
                if catalog_item:
                    # Delete the specific version
                    version_obj = db_session.query(CatalogVersion).filter(
                        CatalogVersion.catalog_item_id == catalog_item.id,
                        CatalogVersion.version == version
                    ).first()
                    
                    if version_obj:
                        db_session.delete(version_obj)
                    
                    # Check if there are any remaining versions
                    remaining_versions = db_session.query(CatalogVersion).filter(
                        CatalogVersion.catalog_item_id == catalog_item.id
                    ).count()
                    
                    # If no versions left, delete the item too
                    if remaining_versions == 0:
                        db_session.delete(catalog_item)
                    
                    db_session.commit()
                
        except Exception as e:
            errors.append(f"Database deletion failed: {str(e)}")
        
        # Update individual registry file if it exists
        individual_registry_file = f"/app/data/registry/{item_id}.json"
        if os.path.exists(individual_registry_file):
            try:
                with open(individual_registry_file, 'r') as f:
                    individual_data = json.load(f)
                
                if version in individual_data.get("versions", {}):
                    del individual_data["versions"][version]
                    
                    if not individual_data["versions"]:
                        # Remove file if no versions left
                        os.remove(individual_registry_file)
                    else:
                        # Update file with remaining versions
                        with open(individual_registry_file, 'w') as f:
                            json.dump(individual_data, f, indent=2)
                            
            except Exception as e:
                errors.append(f"Failed to update individual registry file: {str(e)}")
        
        return {
            "deleted": True,
            "item_id": item_id,
            "version": version,
            "item_removed": item_removed,
            "bundle_deleted": deleted_bundle,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
