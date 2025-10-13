import io, os, tarfile, json, yaml
from typing import Tuple, Optional
from .settings import catalog_settings

def pack_dir(path: str) -> bytes:
    bio = io.BytesIO()
    with tarfile.open(fileobj=bio, mode="w:gz") as tar:
        tar.add(path, arcname=".")
    bio.seek(0); return bio.read()

def unpack_to_temp(data: bytes, tempdir: str):
    import tarfile
    with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as tar:
        tar.extractall(tempdir)

def load_descriptor_from_dir(path: str) -> Tuple[dict, dict, Optional[dict], dict]:
    with open(os.path.join(path, "manifest.yaml")) as f:
        manifest = yaml.safe_load(f)
    with open(os.path.join(path, "schema.json")) as f:
        schema = json.load(f)
    ui_path = os.path.join(path, "ui.json")
    ui = json.load(open(ui_path)) if os.path.exists(ui_path) else None
    
    # Load additional schemas based on x-schema-map in the main schema
    additional_schemas = {}
    schema_map = schema.get("x-schema-map", {})
    
    if schema_map:
        for action, schema_filename in schema_map.items():
            schema_path = os.path.join(path, schema_filename)
            if os.path.exists(schema_path):
                with open(schema_path) as f:
                    additional_schemas[schema_filename] = json.load(f)
    
    return manifest, schema, ui, additional_schemas

def write_blob(item_id: str, version: str, data: bytes) -> str:
    root = catalog_settings.CATALOG_BLOB_DIR
    os.makedirs(root, exist_ok=True)
    fp = os.path.join(root, f"{item_id}@{version}.tar.gz")
    with open(fp, "wb") as f:
        f.write(data)
    return fp

def read_blob(storage_uri: str) -> bytes:
    with open(storage_uri, "rb") as f:
        return f.read()
