from api.settings import settings


def test_settings_expose_celery_defaults():
    assert isinstance(settings.CELERY_BROKER_URL, str)
    assert settings.CELERY_BROKER_URL

    assert isinstance(settings.CELERY_RESULT_BACKEND, str)
    assert settings.CELERY_RESULT_BACKEND

    assert isinstance(settings.CELERY_TASK_DEFAULT_QUEUE, str)
    assert settings.CELERY_TASK_DEFAULT_QUEUE

    assert isinstance(settings.CELERY_TASK_TRACK_STARTED, bool)
    assert settings.CELERY_TASK_TRACK_STARTED is True

    assert isinstance(settings.CELERY_TASK_TIME_LIMIT, int)
    assert settings.CELERY_TASK_TIME_LIMIT > 0

    assert isinstance(settings.CELERY_TASK_SOFT_TIME_LIMIT, int)
    assert 0 < settings.CELERY_TASK_SOFT_TIME_LIMIT <= settings.CELERY_TASK_TIME_LIMIT

    assert isinstance(settings.CELERY_BEAT_SCHEDULE_TZ, str)
    assert settings.CELERY_BEAT_SCHEDULE_TZ


def test_settings_retain_redis_configuration():
    assert isinstance(settings.REDIS_URL, str)
    assert settings.REDIS_URL
