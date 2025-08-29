import arq
from arq.connections import RedisSettings
from .settings import settings

_arq_pool = None


async def get_arq_pool():
    global _arq_pool
    if _arq_pool is None:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        _arq_pool = await arq.create_pool(redis_settings)
    return _arq_pool
