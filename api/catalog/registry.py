import os, json, threading, yaml
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime

REGISTRY_PATH = "/app/data/catalog_registry.json"
LOCAL_CATALOG_PATH = "/app/catalog_local/items"
_lock = threading.Lock()

def _load() -> dict:
    if not os.path.exists(REGISTRY_PATH):
        return {"items": {}}
    with open(REGISTRY_PATH, "r") as f:
        return json.load(f)

def _save(data: dict):
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w") as f:
        json.dump(data, f, indent=2)


from api.common.db import SessionLocal
from api.catalog.repository import CatalogRepo

def upsert_version(item_id: str, version: str, manifest: dict, schema: dict, ui: dict|None,
                   storage_uri: str, source: dict, additional_schemas: dict = None):
    # Legacy implementation with dual-write support
    with _lock:
        # First, update JSON (source of truth)
        db = _load()
        items = db["items"].setdefault(item_id, {"versions": {}})
        
        items["versions"][version] = {
            "manifest": manifest,
            "schema": schema,
            "ui": ui or {},
            "additional_schemas": additional_schemas or {},
            "storage_uri": storage_uri,
            "source": source,
            "active": True
        }
        
        _save(db)
        
        # Then, dual-write to PostgreSQL if enabled
        try:
            with SessionLocal() as db_session:
                repo = CatalogRepo(db=db_session)
                repo.register_version(
                    item_id=item_id,
                    name=manifest.get("name", item_id),
                    manifest=manifest,
                    json_schema=schema,
                    ui_schema=ui,
                    version=version,
                    storage_uri=storage_uri,
                    source=source,
                    is_active=True,
                    labels=manifest.get("labels", {}),
                    description=manifest.get("description")
                )
        except Exception as e:
            # Log error but don't fail the request since JSON write succeeded
            print(f"❌ Failed to write {item_id} v{version} to database: {e}")
            import traceback
            traceback.print_exc()
            # In production, you might want to use proper logging here

def list_items() -> List[dict]:
    db = _load()
    out = []
    for iid, data in db["items"].items():
        versions = list(data.get("versions", {}).keys())
        latest = versions[-1] if versions else None
        out.append({"id": iid, "versions": versions, "latest": latest})
    return out

def list_versions(item_id: str) -> List[str]:
    db = _load()
    return list(db["items"].get(item_id, {}).get("versions", {}).keys())

def get_descriptor(item_id: str, version: str) -> Optional[dict]:
    db = _load()
    return db["items"].get(item_id, {}).get("versions", {}).get(version)

def resolve_latest(item_id: str) -> Optional[Tuple[str, dict]]:
    db = _load()
    vs = db["items"].get(item_id, {}).get("versions", {})
    if not vs:
        return None
    ver = sorted(vs.keys())[-1]
    return ver, vs[ver]

def sync_registry_with_local() -> Dict[str, Any]:
    """
    Sync the registry with what's actually stored locally.
    Returns a report of changes made.
    """
    with _lock:
        db = _load()
        report = {
            "sync_timestamp": datetime.utcnow().isoformat(),
            "items_added": [],
            "items_removed": [],
            "versions_added": [],
            "versions_removed": [],
            "errors": []
        }
        
        local_items = {}
        
        # Scan local filesystem for catalog items
        if os.path.exists(LOCAL_CATALOG_PATH):
            for item_id in os.listdir(LOCAL_CATALOG_PATH):
                item_path = os.path.join(LOCAL_CATALOG_PATH, item_id)
                if not os.path.isdir(item_path):
                    continue
                    
                local_items[item_id] = {}
                
                # Check for versioned structure (preferred)
                version_dirs = []
                for potential_version in os.listdir(item_path):
                    version_path = os.path.join(item_path, potential_version)
                    if os.path.isdir(version_path):
                        version_dirs.append((potential_version, version_path))
                
                if version_dirs:
                    # New versioned structure
                    for version, version_path in version_dirs:
                        try:
                            version_data = _load_version_from_path(version_path, item_id, version)
                            if version_data:
                                local_items[item_id][version] = version_data
                        except Exception as e:
                            report["errors"].append(f"Error loading {item_id} v{version}: {str(e)}")
                else:
                    # Legacy flat structure
                    try:
                        version_data = _load_version_from_path(item_path, item_id, "unknown")
                        if version_data:
                            # Try to get version from meta.json or manifest
                            detected_version = version_data.get("manifest", {}).get("version", "unknown")
                            local_items[item_id][detected_version] = version_data
                    except Exception as e:
                        report["errors"].append(f"Error loading legacy {item_id}: {str(e)}")
        
        # Compare with registry and update
        registry_items = db.get("items", {})
        
        # Find items to add or update
        for item_id, versions in local_items.items():
            if item_id not in registry_items:
                db["items"][item_id] = {"versions": {}}
                report["items_added"].append(item_id)
            
            for version, version_data in versions.items():
                if version not in registry_items.get(item_id, {}).get("versions", {}):
                    report["versions_added"].append(f"{item_id} v{version}")
                
                # Update registry with local data
                db["items"][item_id]["versions"][version] = version_data
        
        # Find registry items/versions that don't exist locally
        for item_id, item_data in list(registry_items.items()):
            if item_id not in local_items:
                # Item doesn't exist locally, remove from registry
                del db["items"][item_id]
                report["items_removed"].append(item_id)
            else:
                # Check versions
                for version in list(item_data.get("versions", {}).keys()):
                    if version not in local_items[item_id]:
                        del db["items"][item_id]["versions"][version]
                        report["versions_removed"].append(f"{item_id} v{version}")
                
                # Remove item if no versions left
                if not db["items"][item_id]["versions"]:
                    del db["items"][item_id]
                    report["items_removed"].append(item_id)
        
        _save(db)
        return report


def _load_version_from_path(path: str, item_id: str, version: str) -> Optional[Dict[str, Any]]:
    """Load version data from a local filesystem path"""
    manifest_path = os.path.join(path, "manifest.yaml")
    schema_path = os.path.join(path, "schema.json")
    ui_path = os.path.join(path, "ui.json")
    meta_path = os.path.join(path, "meta.json")
    task_path = os.path.join(path, "task.py")
    
    # Required files
    if not os.path.exists(schema_path):
        return None
    
    try:
        # Load schema (required)
        with open(schema_path, "r") as f:
            schema = json.load(f)
        
        # Load manifest (optional)
        manifest = {}
        if os.path.exists(manifest_path):
            with open(manifest_path, "r") as f:
                manifest = yaml.safe_load(f) or {}
        
        # Load UI schema (optional)
        ui = {}
        if os.path.exists(ui_path):
            with open(ui_path, "r") as f:
                ui = json.load(f)
        
        # Load additional schemas based on x-schema-map in the main schema
        additional_schemas = {}
        schema_map = schema.get("x-schema-map", {})
        
        if schema_map:
            for action, schema_filename in schema_map.items():
                additional_schema_path = os.path.join(path, schema_filename)
                if os.path.exists(additional_schema_path):
                    with open(additional_schema_path) as f:
                        additional_schemas[schema_filename] = json.load(f)
        
        # Load task code (optional)
        task_code = None
        if os.path.exists(task_path):
            with open(task_path, "r") as f:
                task_code = f.read()
        
        # Load metadata (optional)
        meta = {}
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                meta = json.load(f)
        
        # Create storage URI (blob storage simulation)
        from api.catalog.bundles import pack_dir, write_blob
        blob = pack_dir(path)
        storage_uri = write_blob(item_id, version, blob)
        
        version_data = {
            "manifest": manifest,
            "schema": schema,
            "ui": ui,
            "additional_schemas": additional_schemas,
            "storage_uri": storage_uri,
            "source": meta.get("source", {"type": "local_sync", "sync_timestamp": datetime.utcnow().isoformat()}),
            "active": True
        }
        
        # Include task code if present
        if task_code:
            version_data["task_code"] = task_code
        
        return version_data
        
    except Exception as e:
        raise Exception(f"Failed to load version data: {str(e)}")


def get_sync_status() -> Dict[str, Any]:
    """Get sync status between registry and local filesystem"""
    registry_items = {}
    local_items = {}
    
    # Get registry items
    db = _load()
    for item_id, item_data in db.get("items", {}).items():
        registry_items[item_id] = list(item_data.get("versions", {}).keys())
    
    # Get local items
    if os.path.exists(LOCAL_CATALOG_PATH):
        for item_id in os.listdir(LOCAL_CATALOG_PATH):
            item_path = os.path.join(LOCAL_CATALOG_PATH, item_id)
            if not os.path.isdir(item_path):
                continue
            
            versions = []
            for potential_version in os.listdir(item_path):
                version_path = os.path.join(item_path, potential_version)
                if os.path.isdir(version_path):
                    schema_path = os.path.join(version_path, "schema.json")
                    if os.path.exists(schema_path):
                        versions.append(potential_version)
            
            if not versions:
                # Check for legacy structure
                schema_path = os.path.join(item_path, "schema.json")
                if os.path.exists(schema_path):
                    versions.append("unknown")
            
            if versions:
                local_items[item_id] = versions
    
    # Compare
    all_items = set(list(registry_items.keys()) + list(local_items.keys()))
    
    status = {
        "in_sync": True,
        "registry_only": [],
        "local_only": [],
        "version_mismatches": [],
        "total_registry_items": len(registry_items),
        "total_local_items": len(local_items)
    }
    
    for item_id in all_items:
        reg_versions = set(registry_items.get(item_id, []))
        local_versions = set(local_items.get(item_id, []))
        
        if item_id in registry_items and item_id not in local_items:
            status["registry_only"].append({"item_id": item_id, "versions": list(reg_versions)})
            status["in_sync"] = False
        elif item_id in local_items and item_id not in registry_items:
            status["local_only"].append({"item_id": item_id, "versions": list(local_versions)})
            status["in_sync"] = False
        elif reg_versions != local_versions:
            status["version_mismatches"].append({
                "item_id": item_id,
                "registry_versions": list(reg_versions),
                "local_versions": list(local_versions),
                "missing_in_registry": list(local_versions - reg_versions),
                "missing_locally": list(reg_versions - local_versions)
            })
            status["in_sync"] = False
    
    return status

def migrate_legacy_local_storage():
    """Migrate legacy flat local storage to versioned structure"""
    local_base_dir = "/app/catalog_local/items"
    if not os.path.exists(local_base_dir):
        return []
    
    migrated_items = []
    
    for item_name in os.listdir(local_base_dir):
        item_path = os.path.join(local_base_dir, item_name)
        if not os.path.isdir(item_path):
            continue
            
        # Check if this is legacy flat structure (has files directly in item directory)
        has_direct_files = False
        for file_name in os.listdir(item_path):
            file_path = os.path.join(item_path, file_name)
            if os.path.isfile(file_path) and file_name in ['manifest.yaml', 'schema.json', 'ui.json', 'meta.json', 'task.py']:
                has_direct_files = True
                break
        
        if has_direct_files:
            # This is legacy flat structure, migrate it
            # First, determine the version from registry or meta.json
            version = "1.0.0"  # default version
            
            meta_path = os.path.join(item_path, "meta.json")
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r") as f:
                        meta = json.load(f)
                    version = meta.get("version", "1.0.0")
                except:
                    pass
            
            # Create versioned directory
            versioned_path = os.path.join(item_path, version)
            os.makedirs(versioned_path, exist_ok=True)
            
            # Move files to versioned directory
            moved_files = []
            for file_name in ['manifest.yaml', 'schema.json', 'ui.json', 'meta.json', 'task.py']:
                old_file = os.path.join(item_path, file_name)
                new_file = os.path.join(versioned_path, file_name)
                if os.path.exists(old_file):
                    import shutil
                    shutil.move(old_file, new_file)
                    moved_files.append(file_name)
            
            migrated_items.append({
                "item_id": item_name,
                "version": version,
                "moved_files": moved_files,
                "new_path": versioned_path
            })
    
    return migrated_items


def sync_local_to_registry():
    """Sync local storage to registry - add missing registry entries for local items"""
    local_base_dir = "/app/catalog_local/items"
    if not os.path.exists(local_base_dir):
        return {"added": [], "errors": []}
    
    added = []
    errors = []
    
    for item_name in os.listdir(local_base_dir):
        item_path = os.path.join(local_base_dir, item_name)
        if not os.path.isdir(item_path):
            continue
            
        # Check for version directories
        for version_dir in os.listdir(item_path):
            version_path = os.path.join(item_path, version_dir)
            if not os.path.isdir(version_path):
                continue
                
            try:
                # Check if this version exists in registry
                existing = get_descriptor(item_name, version_dir)
                if existing:
                    continue  # Already in registry
                
                # Load local files
                manifest_path = os.path.join(version_path, "manifest.yaml")
                schema_path = os.path.join(version_path, "schema.json")
                ui_path = os.path.join(version_path, "ui.json")
                meta_path = os.path.join(version_path, "meta.json")
                
                if not os.path.exists(manifest_path) or not os.path.exists(schema_path):
                    errors.append(f"{item_name}:{version_dir} - missing required files")
                    continue
                
                # Load the data
                with open(manifest_path, "r") as f:
                    manifest = json.load(f) if manifest_path.endswith('.json') else yaml.safe_load(f)
                
                with open(schema_path, "r") as f:
                    schema = json.load(f)
                
                ui_schema = {}
                if os.path.exists(ui_path):
                    with open(ui_path, "r") as f:
                        ui_schema = json.load(f)
                
                source_meta = {"source": "local_sync", "synced_at": datetime.utcnow().isoformat()}
                if os.path.exists(meta_path):
                    with open(meta_path, "r") as f:
                        local_meta = json.load(f)
                    source_meta.update(local_meta)
                
                # Add to registry
                storage_uri = f"file://{version_path}"  # Local file reference
                upsert_version(item_name, version_dir, manifest, schema, ui_schema, storage_uri, source_meta)
                
                added.append(f"{item_name}:{version_dir}")
                
            except Exception as e:
                errors.append(f"{item_name}:{version_dir} - {str(e)}")
    
    return {"added": added, "errors": errors}

def sync_registry_to_local():
    """Sync registry to local storage - create missing local files for registry entries"""
    db = _load()
    created = []
    errors = []
    
    for item_id, item_data in db["items"].items():
        versions = item_data.get("versions", {})
        
        for version, version_data in versions.items():
            try:
                # Check if local files exist
                version_path = os.path.join(LOCAL_CATALOG_PATH, item_id, version)
                manifest_path = os.path.join(version_path, "manifest.yaml")
                schema_path = os.path.join(version_path, "schema.json")
                
                if os.path.exists(manifest_path) and os.path.exists(schema_path):
                    continue  # Already exists locally
                
                # Create the version directory
                os.makedirs(version_path, exist_ok=True)
                
                # Write manifest.yaml
                if not os.path.exists(manifest_path):
                    with open(manifest_path, "w") as f:
                        yaml.dump(version_data.get("manifest", {}), f)
                
                # Write schema.json
                if not os.path.exists(schema_path):
                    with open(schema_path, "w") as f:
                        json.dump(version_data.get("schema", {}), f, indent=2)
                
                # Write ui.json if present
                ui_path = os.path.join(version_path, "ui.json")
                if version_data.get("ui") and not os.path.exists(ui_path):
                    with open(ui_path, "w") as f:
                        json.dump(version_data["ui"], f, indent=2)
                
                # Write task.py if present
                task_path = os.path.join(version_path, "task.py")
                if version_data.get("task_code") and not os.path.exists(task_path):
                    with open(task_path, "w") as f:
                        f.write(version_data["task_code"])
                
                # Write meta.json
                meta_path = os.path.join(version_path, "meta.json")
                if not os.path.exists(meta_path):
                    meta_data = {
                        "version": version,
                        "synced_from_registry_at": datetime.utcnow().isoformat(),
                        "source": "registry_sync"
                    }
                    # Include source metadata if available
                    if "source" in version_data:
                        meta_data["original_source"] = version_data["source"]
                    
                    with open(meta_path, "w") as f:
                        json.dump(meta_data, f, indent=2)
                
                created.append(f"{item_id}:{version}")
                
            except Exception as e:
                errors.append(f"{item_id}:{version} - {str(e)}")
    
    return {"created": created, "errors": errors}

def get_local_catalog_item_path(item_id: str, version: str) -> str:
    """
    Get path to catalog item, extracting from bundle if necessary.
    
    Priority:
    1. Check if already extracted in catalog_local
    2. Extract from bundle if exists
    3. Raise error if neither found
    """
    import tarfile
    
    # Check if locally extracted version exists
    local_path = os.path.join(LOCAL_CATALOG_PATH, item_id, version)
    task_file = os.path.join(local_path, "task.py")
    
    if os.path.exists(task_file):
        return local_path
    
    # Check if bundle exists and extract it
    bundle_path = f"/app/data/bundles/{item_id}@{version}.tar.gz"
    if os.path.exists(bundle_path):
        os.makedirs(local_path, exist_ok=True)
        
        with tarfile.open(bundle_path, 'r:gz') as tar:
            tar.extractall(local_path)
        
        # Verify extraction worked
        if os.path.exists(task_file):
            return local_path
        else:
            raise FileNotFoundError(f"task.py not found in bundle {item_id}@{version}")
    
    # Neither local nor bundle found
    raise FileNotFoundError(f"Catalog item {item_id}@{version} not found (checked local and bundles)")
