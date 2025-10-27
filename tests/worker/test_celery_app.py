from worker.celery_app import celery_app, create_celery_app
from api.settings import settings


def test_celery_app_module_configured():
    assert celery_app.main == "self_service_portal"
    assert celery_app.conf.broker_url == settings.CELERY_BROKER_URL
    assert celery_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
    assert celery_app.conf.task_default_queue == settings.CELERY_TASK_DEFAULT_QUEUE
    assert celery_app.conf.task_track_started is settings.CELERY_TASK_TRACK_STARTED
    assert celery_app.conf.task_time_limit == settings.CELERY_TASK_TIME_LIMIT
    assert celery_app.conf.task_soft_time_limit == settings.CELERY_TASK_SOFT_TIME_LIMIT
    assert celery_app.conf.timezone == settings.CELERY_BEAT_SCHEDULE_TZ
    assert celery_app.conf.result_expires == settings.JOB_TTL
    assert celery_app.conf.task_serializer == "json"
    assert celery_app.conf.result_serializer == "json"
    assert celery_app.conf.accept_content == ["json"]


def test_create_celery_app_returns_new_instance():
    new_app = create_celery_app()
    try:
        assert new_app is not celery_app
        assert new_app.conf.broker_url == settings.CELERY_BROKER_URL
        assert new_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
    finally:
        new_app.close()


def test_celery_eager_fixture_sets_synchronous_mode(celery_eager_app):
    assert celery_eager_app.conf.task_always_eager is True
    assert celery_eager_app.conf.task_eager_propagates is True
