import json
import asyncio
import os
import shutil
import tempfile
import yaml
from datetime import datetime
from typing import Dict, Any
from arq import ArqRedis

# Add catalog imports
from api.catalog.bundles import load_descriptor_from_dir, pack_dir, write_blob
from api.catalog.registry import upsert_version, sync_registry_with_local
from api.catalog.validate import validate_manifest, validate_schema
from .job_status import touch_job, set_status as update_job_status
from .example_long import run_example_long_task as execute_example_long_task


async def set_status(arq_redis: ArqRedis, job_id: str, state: str, additional_data: Dict[str, Any] | None = None):
    """Compatibility shim that delegates to shared job status helper."""
    return await update_job_status(arq_redis, job_id, state, additional_data)


async def example_long_task(ctx, job_id: str, payload: dict):
    """Example long-running task executed via ARQ."""
    arq_redis = ctx["redis"]
    await execute_example_long_task(arq_redis, job_id, payload)


async def provision_server_task(ctx, job_id: str, payload: dict):
    """
    Server provisioning task that demonstrates a long-running multi-step process
    """
    arq_redis = ctx["redis"]
    
    try:
        # Initialize job as QUEUED
        job_meta = {
            "id": job_id,
            "type": "provision_server",
            "state": "QUEUED",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "finished_at": None,
            "params": payload,
            "result": None,
            "error": None
        }
        await touch_job(arq_redis, job_meta)
        
        # Mark as RUNNING
        job_meta.update({
            "state": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Simulate server provisioning steps
        steps = [
            ("Validating configuration", 10),
            ("Allocating compute resources", 20),
            ("Setting up networking", 35),
            ("Installing operating system", 50),
            ("Configuring security groups", 65),
            ("Installing software packages", 80),
            ("Running health checks", 90),
            ("Finalizing setup", 100)
        ]
        
        for step_name, progress in steps:
            # Simulate variable step duration (2-4 seconds)
            await asyncio.sleep(2 + (progress % 3))
            
            job_meta.update({
                "progress": progress,
                "updated_at": datetime.utcnow().isoformat(),
                "current_step": step_name
            })
            await touch_job(arq_redis, job_meta)
        
        # Mark as SUCCEEDED
        server_config = payload.get("server_config", {})
        result = {
            "message": "Server provisioned successfully",
            "server_id": f"srv-{job_id[:8]}",
            "instance_type": server_config.get("instance_type", "t3.medium"),
            "region": server_config.get("region", "us-east-1"),
            "ip_address": f"10.0.{(hash(job_id) % 254) + 1}.{(hash(job_id[:8]) % 254) + 1}",
            "ssh_key": f"{server_config.get('name', 'server')}-key",
            "tags": server_config.get("tags", {}),
            "provisioned_at": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "SUCCEEDED",
            "progress": 100,
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": result,
            "current_step": "Completed"
        })
        await touch_job(arq_redis, job_meta)
        
    except Exception as e:
        # Mark as FAILED
        error_info = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "FAILED",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": error_info,
            "current_step": "Failed"
        })
        await touch_job(arq_redis, job_meta)
        raise


async def import_catalog_item(ctx, job_id: str, payload: dict):
    """
    Import a catalog item from a YAML descriptor file
    """
    arq_redis = ctx["redis"]
    tmp_dir = None
    
    try:
        # Initialize job as QUEUED
        job_meta = {
            "id": job_id,
            "type": "import_catalog_item",
            "state": "QUEUED",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "finished_at": None,
            "params": payload,
            "result": None,
            "error": None
        }
        await touch_job(arq_redis, job_meta)
        
        # Mark as RUNNING
        job_meta["state"] = "RUNNING"
        job_meta["started_at"] = datetime.utcnow().isoformat()
        await touch_job(arq_redis, job_meta)
        
        # Create temporary directory for import
        tmp_dir = tempfile.mkdtemp(prefix="catalog_import_")
        job_meta["temp_dir"] = tmp_dir
        await touch_job(arq_redis, job_meta)
        
        # Download and extract the catalog item bundle
        bundle_url = payload.get("bundle_url")
        if bundle_url:
            await download_file(bundle_url, tmp_dir)
            await extract_bundle(tmp_dir)
        
        # Load and validate the descriptor
        descriptor_path = os.path.join(tmp_dir, "descriptor.yaml")
        if not os.path.isfile(descriptor_path):
            raise FileNotFoundError(f"Descriptor file not found: {descriptor_path}")
        
        with open(descriptor_path, 'r') as stream:
            descriptor = yaml.safe_load(stream)
        
        # Validate the descriptor schema
        validate_schema(descriptor)
        
        # Check for existing version and upsert if needed
        existing_version = await arq_redis.hget("catalog:items", job_id)
        if existing_version:
            # Update existing item
            await update_catalog_item(job_id, descriptor, existing_version, arq_redis)
        else:
            # Create new item
            await create_catalog_item(job_id, descriptor, arq_redis)
        
        # Mark as SUCCEEDED
        job_meta["state"] = "SUCCEEDED"
        job_meta["progress"] = 100
        job_meta["finished_at"] = datetime.utcnow().isoformat()
        job_meta["result"] = {"message": "Catalog item imported successfully"}
        await touch_job(arq_redis, job_meta)
        
    except Exception as e:
        # Mark as FAILED
        error_info = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        job_meta["state"] = "FAILED"
        job_meta["finished_at"] = datetime.utcnow().isoformat()
        job_meta["error"] = error_info
        await touch_job(arq_redis, job_meta)
        raise
    
    finally:
        # Clean up temporary directory
        if tmp_dir and os.path.isdir(tmp_dir):
            shutil.rmtree(tmp_dir, ignore_errors=True)


async def download_file(url: str, dest_dir: str):
    """Download a file from a URL to the specified directory"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            file_name = os.path.basename(url)
            file_path = os.path.join(dest_dir, file_name)
            with open(file_path, 'wb') as f:
                f.write(await response.read())
            return file_path


async def extract_bundle(bundle_dir: str):
    """Extract the catalog item bundle (ZIP or TAR.GZ)"""
    import zipfile
    import tarfile
    
    bundle_path = os.path.join(bundle_dir, "bundle.zip")
    if os.path.isfile(bundle_path):
        with zipfile.ZipFile(bundle_path, 'r') as zip_ref:
            zip_ref.extractall(bundle_dir)
    else:
        bundle_path = os.path.join(bundle_dir, "bundle.tar.gz")
        if os.path.isfile(bundle_path):
            with tarfile.open(bundle_path, 'r:gz') as tar_ref:
                tar_ref.extractall(bundle_dir)
        else:
            raise FileNotFoundError("No valid bundle file found (bundle.zip or bundle.tar.gz)")


async def update_catalog_item(job_id: str, descriptor: dict, existing_version: str, arq_redis: ArqRedis):
    """Update an existing catalog item version"""
    # Update the descriptor with new values
    descriptor["metadata"]["name"] = f"{descriptor['metadata']['name']}-updated"
    
    # Validate the updated descriptor
    validate_manifest(descriptor)
    
    # Write the updated bundle to the blob store
    bundle_path = await pack_dir(descriptor["metadata"]["name"], arq_redis)
    
    # Upsert the new version
    await upsert_version(job_id, descriptor, bundle_path, arq_redis)
    
    # Clean up the local bundle file
    if os.path.isfile(bundle_path):
        os.remove(bundle_path)


async def create_catalog_item(job_id: str, descriptor: dict, arq_redis: ArqRedis):
    """Create a new catalog item"""
    # Validate the descriptor
    validate_manifest(descriptor)
    
    # Write the bundle to the blob store
    bundle_path = await pack_dir(descriptor["metadata"]["name"], arq_redis)
    
    # Create the catalog item
    await upsert_version(job_id, descriptor, bundle_path, arq_redis)
    
    # Clean up the local bundle file
    if os.path.isfile(bundle_path):
        os.remove(bundle_path)


async def import_catalog_item_task(ctx, job_id: str, payload: dict):
    """
    Import catalog item task - saves to local filesystem and updates registry
    """
    arq_redis = ctx["redis"]
    
    try:
        # Initialize job as QUEUED
        job_meta = {
            "id": job_id,
            "type": "import_catalog_item",
            "state": "QUEUED",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "finished_at": None,
            "params": payload,
            "result": None,
            "error": None
        }
        await touch_job(arq_redis, job_meta)
        
        # Mark as RUNNING
        job_meta.update({
            "state": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "current_step": "Starting import"
        })
        await touch_job(arq_redis, job_meta)
        
        # Extract payload data
        item_id = payload.get("item_id")
        version = payload.get("version")
        manifest = payload.get("manifest")
        schema = payload.get("schema")
        ui_schema = payload.get("ui_schema", {})
        task_code = payload.get("task_code")  # Python task code
        source = payload.get("source", "ui_import")
        
        # Step 1: Validate input (10%)
        job_meta.update({
            "progress": 10,
            "current_step": "Validating input data",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        if not item_id or not version or not schema:
            raise ValueError("item_id, version, and schema are required")
        
        validate_manifest(manifest)
        validate_schema(schema)
        
        # Step 2: Prepare local directory (30%)
        job_meta.update({
            "progress": 30,
            "current_step": "Preparing local storage directory",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Create local directory structure: /app/catalog_local/items/{item_id}/{version}/
        local_base_dir = "/app/catalog_local/items"
        item_local_dir = os.path.join(local_base_dir, item_id, version)
        os.makedirs(item_local_dir, exist_ok=True)
        
        # Step 3: Save files locally (50%)
        job_meta.update({
            "progress": 50,
            "current_step": "Saving files to local storage",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Write manifest.yaml
        manifest_path = os.path.join(item_local_dir, "manifest.yaml")
        with open(manifest_path, "w") as f:
            yaml.dump(manifest, f)
        
        # Write schema.json
        schema_path = os.path.join(item_local_dir, "schema.json")
        with open(schema_path, "w") as f:
            json.dump(schema, f, indent=2)
        
        # Write ui.json if provided
        if ui_schema:
            ui_path = os.path.join(item_local_dir, "ui.json")
            with open(ui_path, "w") as f:
                json.dump(ui_schema, f, indent=2)
        
        # Write task.py if provided
        if task_code:
            task_path = os.path.join(item_local_dir, "task.py")
            with open(task_path, "w") as f:
                f.write(task_code)
        
        # Write metadata about this version
        meta_path = os.path.join(item_local_dir, "meta.json")
        meta_data = {
            "version": version,
            "imported_at": datetime.utcnow().isoformat(),
            "source": source,
            "job_id": job_id
        }
        with open(meta_path, "w") as f:
            json.dump(meta_data, f, indent=2)
        
        # Step 4: Pack and store in registry (70%)
        job_meta.update({
            "progress": 70,
            "current_step": "Packing and storing in registry",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Pack the directory for blob storage
        blob = pack_dir(item_local_dir)
        storage_uri = write_blob(item_id, version, blob)
        
        # Step 5: Update registry (90%)
        job_meta.update({
            "progress": 90,
            "current_step": "Updating registry",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Update the registry
        metadata = {
            "source": source,
            "imported_at": datetime.utcnow().isoformat(),
            "job_id": job_id,
            "local_path": item_local_dir
        }
        upsert_version(item_id, version, manifest, schema, ui_schema, storage_uri, metadata)
        
        # Mark as SUCCEEDED
        result = {
            "message": "Catalog item imported successfully",
            "item_id": item_id,
            "version": version,
            "local_path": item_local_dir,
            "storage_uri": storage_uri,
            "imported_at": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "SUCCEEDED",
            "progress": 100,
            "current_step": "Completed",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": result
        })
        await touch_job(arq_redis, job_meta)
        
    except Exception as e:
        # Mark as FAILED
        error_info = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "FAILED",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": error_info,
            "current_step": "Failed"
        })
        await touch_job(arq_redis, job_meta)
        raise


async def sync_catalog_registry_task(ctx, job_id: str, payload: dict):
    """
    Sync catalog registry with local filesystem - can be run periodically
    """
    arq_redis = ctx["redis"]
    
    try:
        # Initialize job as QUEUED
        job_meta = {
            "id": job_id,
            "type": "sync_catalog_registry",
            "state": "QUEUED",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": None,
            "finished_at": None,
            "params": payload,
            "result": None,
            "error": None
        }
        await touch_job(arq_redis, job_meta)
        
        # Mark as RUNNING
        job_meta.update({
            "state": "RUNNING",
            "started_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "current_step": "Starting registry sync"
        })
        await touch_job(arq_redis, job_meta)
        
        # Step 1: Check sync status (20%)
        job_meta.update({
            "progress": 20,
            "current_step": "Checking sync status",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        # Step 2: Perform sync (80%)
        job_meta.update({
            "progress": 80,
            "current_step": "Synchronizing registry with local files",
            "updated_at": datetime.utcnow().isoformat()
        })
        await touch_job(arq_redis, job_meta)
        
        sync_report = sync_registry_with_local()
        
        # Mark as SUCCEEDED
        result = {
            "message": "Registry sync completed",
            "sync_report": sync_report,
            "completed_at": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "SUCCEEDED",
            "progress": 100,
            "current_step": "Completed",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "result": result
        })
        await touch_job(arq_redis, job_meta)
        
    except Exception as e:
        # Mark as FAILED
        error_info = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        job_meta.update({
            "state": "FAILED",
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": error_info,
            "current_step": "Failed"
        })
        await touch_job(arq_redis, job_meta)
        raise
