import os, io, tarfile, tempfile, json, yaml, subprocess
from datetime import datetime
from arq.connections import ArqRedis
from api.catalog.descriptor_utils import atomic_write
from api.catalog.registry import upsert_version
from worker.job_status import touch_job

BUNDLES_DIR = "/app/data/bundles"
ITEMS_SUBDIR = "items"

def parse_tag(tag: str):
    """Parse tag in format <item>@<semver>"""
    if "@" not in tag:
        raise ValueError("tag must be in format <item>@<semver>")
    return tag.split("@", 1)

def pack_dir(path: str) -> bytes:
    """Pack directory into tar.gz bytes"""
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        tar.add(path, arcname=".")
    bio.seek(0)
    return bio.read()

def load_descriptor_from_dir(path: str):
    """Load manifest, schema, and ui from directory"""
    manifest_path = os.path.join(path, "manifest.yaml")
    schema_path = os.path.join(path, "schema.json")
    ui_path = os.path.join(path, "ui.json")
    
    manifest = yaml.safe_load(open(manifest_path))
    schema = json.load(open(schema_path))
    ui = {}
    if os.path.exists(ui_path):
        ui = json.load(open(ui_path))
    
    return manifest, schema, ui

async def sync_catalog_item_from_git(ctx, job_id: str, payload: dict):
    """
    Sync catalog item from Git repository.
    Clones repo at specific tag or branch, validates structure, and imports item.
    """
    # Get the job context for status updates
    arq_redis = ctx["redis"]
    
    # Extract parameters from payload
    repo_url = payload["repo_url"]
    ref = payload["ref"]
    item_name = payload["item_name"]
    
    try:
        # Initialize job metadata
        job_meta = {
            "id": job_id,
            "type": "git_import",
            "state": "RUNNING",
            "progress": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "started_at": datetime.utcnow().isoformat(),
            "finished_at": None,
            "params": payload,
            "result": None,
            "error": None,
            "current_step": "Starting git import"
        }
        await touch_job(arq_redis, job_meta)
    
        item_id, git_ref = parse_tag(ref)
    
        with tempfile.TemporaryDirectory() as td:
            def run(*args):
                """Helper to run git commands"""
                result = subprocess.run(
                    args, cwd=td, 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True
                )
                if result.returncode != 0:
                    raise RuntimeError(f"git {' '.join(args)} failed: {result.stderr}")
                return result.stdout
        
            # Clone the repository
            job_meta.update({
                "progress": 10,
                "current_step": "Cloning repository",
                "updated_at": datetime.utcnow().isoformat()
            })
            await touch_job(arq_redis, job_meta)
            
            run("git", "init")
            run("git", "remote", "add", "origin", repo_url)
        
            # Try to fetch as tag first, then as branch if tag fails
            try:
                # Try fetching as a tag (for version releases)
                run("git", "fetch", "--depth", "1", "--tags", "origin", git_ref)
                run("git", "checkout", "FETCH_HEAD")
                print(f"✅ Checked out tag: {git_ref}")
            except RuntimeError:
                try:
                    # Try fetching as a branch (for development/latest)
                    run("git", "fetch", "--depth", "1", "origin", git_ref)
                    run("git", "checkout", "FETCH_HEAD")
                    print(f"✅ Checked out branch: {git_ref}")
                except RuntimeError as e:
                    raise RuntimeError(f"Failed to fetch '{git_ref}' as tag or branch: {e}")
            
            job_meta.update({
                "progress": 30,
                "current_step": "Processing repository structure",
                "updated_at": datetime.utcnow().isoformat()
            })
            await touch_job(arq_redis, job_meta)
            
            # Find item directory - support both flat and nested structures
            try:
                print(f"🔍 Temp directory contents: {os.listdir(td)}")
            except Exception as e:
                print(f"🔍 Error listing temp directory: {e}")
            item_dir = os.path.join(td, ITEMS_SUBDIR, item_id)
            print(f"🔍 Looking for nested structure at: {item_dir}")
            if not os.path.isdir(item_dir):
                # Try flat structure (item files directly in repo root)
                item_dir = td
                print(f"🔍 Using flat structure at: {item_dir}")
                try:
                    print(f"🔍 Flat directory contents: {os.listdir(item_dir)}")
                except Exception as e:
                    print(f"🔍 Error listing flat directory: {e}")
                # Verify this is a catalog item by checking for required files
                if not (os.path.exists(os.path.join(item_dir, "manifest.yaml")) and 
                        os.path.exists(os.path.join(item_dir, "schema.json"))):
                    raise FileNotFoundError(f"Neither {ITEMS_SUBDIR}/{item_id} nor catalog item files found in repository")
                print(f"✅ Using flat repository structure")
            else:
                print(f"✅ Using nested repository structure: {ITEMS_SUBDIR}/{item_id}")

            # Determine version from git ref or manifest
            if git_ref.replace('v', '').replace('.', '').replace('-', '').isalnum():
                # Looks like a version tag (e.g., "1.2.1", "v1.2.1")
                version = git_ref.lstrip('v')
            else:
                # Branch checkout - read version from manifest
                manifest, _, _ = load_descriptor_from_dir(item_dir)
                version = manifest.get('version', 'latest')
        
            # Load and validate descriptors
            job_meta.update({
                "progress": 50,
                "current_step": "Validating catalog item",
                "updated_at": datetime.utcnow().isoformat()
            })
            await touch_job(arq_redis, job_meta)
            
            manifest, schema, ui = load_descriptor_from_dir(item_dir)
            
            # Validate manifest matches tag
            manifest_id = manifest.get("id") or manifest.get("name")
            manifest_version = manifest.get("version")
            
            if manifest_id != item_id:
                raise ValueError(f"manifest id/name '{manifest_id}' must match item_id '{item_id}' from tag {ref}")
            if manifest_version != version:
                raise ValueError(f"manifest version '{manifest_version}' must match version '{version}' from tag {ref}")
            
            # Pack item directory
            job_meta.update({
                "progress": 70,
                "current_step": "Creating bundle",
                "updated_at": datetime.utcnow().isoformat()
            })
            await touch_job(arq_redis, job_meta)
            
            bundle_bytes = pack_dir(item_dir)
            
            # Save bundle
            os.makedirs(BUNDLES_DIR, exist_ok=True)
            bundle_path = os.path.join(BUNDLES_DIR, f"{item_id}@{version}.tar.gz")
            atomic_write(bundle_path, bundle_bytes)
            
            # Update registry with dual-write (JSON + DB)
            job_meta.update({
                "progress": 90,
                "current_step": "Updating catalog registry",
                "updated_at": datetime.utcnow().isoformat()
            })
            await touch_job(arq_redis, job_meta)
            
            upsert_version(
                item_id=item_id, 
                version=version, 
                manifest=manifest, 
                schema=schema, 
                ui=ui, 
                storage_uri=bundle_path,
                source={
                    "source": "git-sync",
                    "repo": repo_url, 
                    "ref": ref, 
                    "path": f"{ITEMS_SUBDIR}/{item_id}",
                    "sync_timestamp": datetime.utcnow().isoformat()
                }
            )

            result = {
                "item_id": item_id,
                "version": version,
                "bundle_path": bundle_path,
                "repo_url": repo_url,
                "ref": ref
            }
            
            # Mark job as completed
            job_meta.update({
                "state": "SUCCEEDED",
                "progress": 100,
                "current_step": "Completed",
                "finished_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "result": result
            })
            await touch_job(arq_redis, job_meta)

            return result
        
    except Exception as e:
        # Mark job as failed
        job_meta.update({
            "state": "FAILED",
            "progress": 0,
            "finished_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "error": str(e)
        })
        await touch_job(arq_redis, job_meta)
        raise
