"""Celery application bootstrap for the self-service portal worker."""

from __future__ import annotations

from celery import Celery

from api.settings import settings


def create_celery_app() -> Celery:
    """Create and configure a Celery application instance."""
    app = Celery(
        "self_service_portal",
        broker=settings.CELERY_BROKER_URL,
        backend=settings.CELERY_RESULT_BACKEND,
    )

    app.conf.update(
        task_default_queue=settings.CELERY_TASK_DEFAULT_QUEUE,
        task_track_started=settings.CELERY_TASK_TRACK_STARTED,
        task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
        task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
        timezone=settings.CELERY_BEAT_SCHEDULE_TZ,
        enable_utc=True,
        result_expires=settings.JOB_TTL,
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
    )

    return app


celery_app = create_celery_app()

__all__ = ["celery_app", "create_celery_app"]
