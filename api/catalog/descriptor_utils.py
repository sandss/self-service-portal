import os, io, json, yaml

REG_DIR = "/app/data/registry"

def atomic_write(path: str, data: bytes):
    """Atomically write data to file"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, path)

def update_item_registry(item_id: str, version: str, manifest: dict, schema: dict, ui: dict, bundle_path: str, source: dict):
    """Update the registry with new catalog item version"""
    os.makedirs(REG_DIR, exist_ok=True)
    fp = os.path.join(REG_DIR, f"{item_id}.json")
    data = {"versions": {}}
    
    if os.path.exists(fp):
        with open(fp, "r") as f:
            data = json.load(f)
    
    data.setdefault("versions", {})
    data["versions"][version] = {
        "manifest": manifest,
        "schema": schema,
        "ui": ui or {},
        "bundle_path": bundle_path,
        "source": source,
        "active": True
    }
    
    atomic_write(fp, json.dumps(data, indent=2).encode())

def load_descriptor_from_temp(root: str):
    """
    Load manifest, schema, and ui from unpacked bundle root.
    Handles both direct root and items/<id> nested structure.
    """
    mpath = os.path.join(root, "manifest.yaml")
    spath = os.path.join(root, "schema.json")
    
    if not os.path.exists(mpath) or not os.path.exists(spath):
        # Try nested items/<id> structure
        items = os.path.join(root, "items")
        if os.path.isdir(items):
            # Find first folder with both required files
            for name in os.listdir(items):
                p = os.path.join(items, name)
                if (os.path.isdir(p) and 
                    os.path.exists(os.path.join(p, "manifest.yaml")) and 
                    os.path.exists(os.path.join(p, "schema.json"))):
                    root = p
                    break
    
    # Load required files
    manifest_path = os.path.join(root, "manifest.yaml")
    schema_path = os.path.join(root, "schema.json")
    ui_path = os.path.join(root, "ui.json")
    
    if not os.path.exists(manifest_path):
        raise ValueError("manifest.yaml not found")
    if not os.path.exists(schema_path):
        raise ValueError("schema.json not found")
    
    manifest = yaml.safe_load(open(manifest_path))
    schema = json.load(open(schema_path))
    ui = json.load(open(ui_path)) if os.path.exists(ui_path) else {}
    
    # Minimal validation
    if "version" not in manifest:
        raise ValueError("manifest missing required field: version")
    if "id" not in manifest and "name" not in manifest:
        raise ValueError("manifest missing required field: id or name")
    
    return manifest, schema, ui
