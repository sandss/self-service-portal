import os, tempfile, json, yaml
from git import Repo
from arq.connections import ArqRedis
from typing import Tuple
from api.catalog.bundles import pack_dir, load_descriptor_from_dir, write_blob
from api.catalog.validate import validate_manifest, validate_schema
from api.catalog.registry import upsert_version

def parse_tag(tag: str) -> Tuple[str, str]:
    if "@" not in tag:
        raise ValueError("tag must be <item_id>@<semver>")
    return tag.split("@", 1)

async def sync_catalog_item(ctx, repo_url: str, ref: str, subdir: str = "items"):
    # clone and checkout tag/ref
    with tempfile.TemporaryDirectory() as td:
        Repo.clone_from(repo_url, td, depth=1)
        r = Repo(td)
        r.git.fetch("--tags", "--force")
        r.git.checkout(ref)

        item_id, version = parse_tag(ref)
        item_dir = os.path.join(td, subdir, item_id)

        manifest, schema, ui = load_descriptor_from_dir(item_dir)
        validate_manifest(manifest)
        validate_schema(schema)

        blob = pack_dir(item_dir)
        storage_uri = write_blob(item_id, version, blob)

        upsert_version(
            item_id=item_id,
            version=version,
            manifest=manifest,
            schema=schema,
            ui=ui,
            storage_uri=storage_uri,
            source={"repo": repo_url, "ref": ref, "path": f"{subdir}/{item_id}"}
        )
        # optional: publish a registry event via Redis pub/sub if you want UI auto-refresh
