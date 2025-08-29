from arq.connections import RedisSettings
from api.settings import settings
from .tasks import example_long_task, provision_server_task, import_catalog_item_task, sync_catalog_registry_task
from .catalog_sync import sync_catalog_item
from .catalog_execute import run_catalog_item


class WorkerSettings:
    functions = [example_long_task, provision_server_task, import_catalog_item_task, sync_catalog_item, run_catalog_item, sync_catalog_registry_task]
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
    keep_result = 0  # Don't store results in ARQ (we handle this manually)
    # max_jobs = 10  # Uncomment to limit concurrent jobs
