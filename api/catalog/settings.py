from pydantic import BaseSettings

class CatalogSettings(BaseSettings):
    # Blob store for bundles (tar.gz) and/or local manifests
    CATALOG_BLOB_DIR: str = "/app/data/catalog_bundles"
    # Optional: path to a local-dev catalog root to auto-load on startup
    CATALOG_LOCAL_ROOT: str = "/app/catalog_local"    # leave empty if not used
    # Git repos table is in DB; for demo we use a simple JSON list
    GIT_EXECUTE_DIRECT: bool = False  # if True, worker fetches repo@ref on execute

catalog_settings = CatalogSettings()
