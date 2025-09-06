import os, io, tarfile, tempfile, json, yaml, subprocess
from arq.connections import ArqRedis
from api.catalog.descriptor_utils import atomic_write, update_item_registry

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

async def sync_catalog_item_from_git(ctx, repo_url: str, ref: str):
    """
    Sync catalog item from Git repository.
    Clones repo at specific tag, validates structure, and imports item.
    """
    item_id, version = parse_tag(ref)
    
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
        
        # Shallow clone at specific tag
        run("git", "init")
        run("git", "remote", "add", "origin", repo_url)
        run("git", "fetch", "--depth", "1", "--tags", "origin", ref)
        run("git", "checkout", "FETCH_HEAD")
        
        # Find item directory
        item_dir = os.path.join(td, ITEMS_SUBDIR, item_id)
        if not os.path.isdir(item_dir):
            raise FileNotFoundError(f"{ITEMS_SUBDIR}/{item_id} not found in tag {ref}")
        
        # Load and validate descriptors
        manifest, schema, ui = load_descriptor_from_dir(item_dir)
        
        # Validate manifest matches tag
        if manifest.get("id") != item_id or manifest.get("version") != version:
            raise ValueError(f"manifest id/version must match tag {ref}")
        
        # Pack item directory
        bundle_bytes = pack_dir(item_dir)
        
        # Save bundle
        os.makedirs(BUNDLES_DIR, exist_ok=True)
        bundle_path = os.path.join(BUNDLES_DIR, f"{item_id}@{version}.tar.gz")
        atomic_write(bundle_path, bundle_bytes)
        
        # Update registry
        update_item_registry(
            item_id, version, manifest, schema, ui, bundle_path,
            source={
                "source": "git-sync",
                "repo": repo_url, 
                "ref": ref, 
                "path": f"{ITEMS_SUBDIR}/{item_id}"
            }
        )
        
        return {
            "item_id": item_id,
            "version": version,
            "bundle_path": bundle_path,
            "repo_url": repo_url,
            "ref": ref
        }
