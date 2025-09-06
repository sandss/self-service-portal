import os, tempfile, tarfile, json, yaml
from fastapi import APIRouter, UploadFile, File, HTTPException
from .descriptor_utils import atomic_write, update_item_registry, load_descriptor_from_temp

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
        update_item_registry(item_id, version, manifest, schema, ui, bundle_path,
                           source={"source": "bundle-upload", "filename": file.filename})
        
        return {"item_id": item_id, "version": version, "bundle_path": bundle_path}
