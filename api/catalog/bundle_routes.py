import os, tempfile, tarfile, json, yaml
from fastapi import APIRouter, UploadFile, File, HTTPException
from .descriptor_utils import atomic_write, load_descriptor_from_temp
from .registry import upsert_version

router = APIRouter(prefix="/catalog/bundle", tags=["catalog-bundle"])
BUNDLES_DIR = "/app/data/bundles"

@router.post("/import")
async def import_bundle(file: UploadFile = File(...)):
    """Import catalog item from uploaded .tar.gz bundle"""
    if not file.filename or not file.filename.endswith((".tar.gz", ".tgz")):
        raise HTTPException(400, "expected .tar.gz file")
    
    data = await file.read()
    with tempfile.TemporaryDirectory() as td:
        tmp_tar = os.path.join(td, "bundle.tgz")
        atomic_write(tmp_tar, data)
        
        with tarfile.open(tmp_tar, "r:gz") as tar:
            tar.extractall(td)
        
        manifest, schema, ui = load_descriptor_from_temp(td)
        item_id = manifest["id"]
        version = manifest["version"]
        
        # Save bundle to storage
        os.makedirs(BUNDLES_DIR, exist_ok=True)
        bundle_path = os.path.join(BUNDLES_DIR, f"{item_id}@{version}.tar.gz")
        atomic_write(bundle_path, data)
        
        # Update registry
        upsert_version(item_id, version, manifest, schema, ui, bundle_path,
                       source={"source": "bundle-upload", "filename": file.filename})
        
        return {"item_id": item_id, "version": version, "bundle_path": bundle_path}

@router.post("/sync")
async def sync_existing_bundles():
    """Sync existing bundle files from the bundles directory to the registry"""
    if not os.path.exists(BUNDLES_DIR):
        return {"synced": 0, "message": "No bundles directory found"}
    
    synced_count = 0
    results = []
    
    for filename in os.listdir(BUNDLES_DIR):
        if not filename.endswith((".tar.gz", ".tgz")):
            continue
            
        bundle_path = os.path.join(BUNDLES_DIR, filename)
        
        try:
            with tempfile.TemporaryDirectory() as td:
                # Extract bundle
                with tarfile.open(bundle_path, "r:gz") as tar:
                    tar.extractall(td)
                
                # Load descriptors
                manifest, schema, ui = load_descriptor_from_temp(td)
                item_id = manifest.get("id") or manifest.get("name")
                if not item_id:
                    raise ValueError("manifest missing required field: id or name")
                version = manifest["version"]
                
                # Update registry
                upsert_version(item_id, version, manifest, schema, ui, bundle_path,
                               source={"source": "bundle-sync", "filename": filename})
                
                synced_count += 1
                results.append({"item_id": item_id, "version": version, "filename": filename, "status": "synced"})
                
        except Exception as e:
            results.append({"filename": filename, "status": "error", "error": str(e)})
    
    return {
        "synced": synced_count,
        "total_files": len([f for f in os.listdir(BUNDLES_DIR) if f.endswith((".tar.gz", ".tgz"))]),
        "results": results
    }
