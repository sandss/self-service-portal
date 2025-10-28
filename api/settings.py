from pydantic import BaseSettings


class Settings(BaseSettings):
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CELERY_TASK_DEFAULT_QUEUE: str = "default"
    CELERY_TASK_TRACK_STARTED: bool = True
    CELERY_TASK_TIME_LIMIT: int = 60 * 30  # 30 minutes
    CELERY_TASK_SOFT_TIME_LIMIT: int = 60 * 25  # 25 minutes
    CELERY_BEAT_SCHEDULE_TZ: str = "UTC"
    CELERY_TASKS: list[str] = [
        "example_long_task",
        "run_catalog_item",
        "import_catalog_item_task",
        "sync_catalog_registry_task",
        "sync_catalog_item",
        "sync_catalog_item_from_git",
        "provision_server_task",
    ]
    JOB_TTL: int = 60 * 60 * 24 * 3  # 3 days
    JOB_STATUS_PREFIX: str = "job:"
    
    class Config:
        env_file = ".env"


settings = Settings()
