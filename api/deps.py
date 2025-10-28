from __future__ import annotations

import redis.asyncio as redis
from redis.asyncio import Redis

from .settings import settings

_redis_client: Redis | None = None


async def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.REDIS_URL)
    return _redis_client


__all__ = ["get_redis"]
