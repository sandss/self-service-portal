"""Shared Redis job status helpers usable by both ARQ and Celery workers."""

from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any, Dict, Tuple

try:
    from redis.exceptions import ResponseError
except ImportError:  # pragma: no cover - redis not installed in some environments
    ResponseError = Exception

from api.settings import settings

_JSON_FIELDS = {"params", "result", "error"}
_STATE_INDEXES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"]


def _clean_for_json(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): _clean_for_json(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, (list, tuple)):
        return [_clean_for_json(item) for item in obj]
    if isinstance(obj, bytes):
        return obj.decode("utf-8", errors="replace")
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    return str(obj)


def _decode_job_hash(raw: Dict[Any, Any]) -> Dict[str, Any]:
    decoded: Dict[str, Any] = {}
    for key, value in raw.items():
        key_str = key.decode() if isinstance(key, bytes) else str(key)
        value_obj: Any = value.decode() if isinstance(value, bytes) else value

        if key_str in _JSON_FIELDS and value_obj:
            try:
                decoded[key_str] = json.loads(value_obj)
            except (json.JSONDecodeError, TypeError):
                decoded[key_str] = value_obj
        elif key_str == "progress":
            try:
                decoded[key_str] = float(value_obj)
            except (TypeError, ValueError):
                decoded[key_str] = 0.0
        else:
            decoded[key_str] = value_obj
    return decoded


def _decode_job_string(raw: Any) -> Dict[str, Any]:
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    try:
        decoded = json.loads(raw)
        if isinstance(decoded, dict):
            return decoded
    except (TypeError, json.JSONDecodeError):
        pass
    return {}


async def fetch_job_metadata(redis_client, job_id: str) -> Tuple[Dict[str, Any], str]:
    """Return existing job metadata and the Redis key type."""
    job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"
    try:
        hash_data = await redis_client.hgetall(job_key)
    except ResponseError:
        hash_data = {}
    if hash_data:
        return _decode_job_hash(hash_data), "hash"

    raw = await redis_client.get(job_key)
    if raw:
        return _decode_job_string(raw), "string"

    return {}, "none"


async def publish_job_update(redis_client, job_meta: Dict[str, Any]) -> None:
    payload = {"type": "upsert", "job": _clean_for_json(job_meta)}
    await redis_client.publish("channel:jobs", json.dumps(payload))


async def touch_job(redis_client, job_meta: Dict[str, Any]) -> None:
    job_id = job_meta["id"]
    job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"

    hash_data = {}
    for key, value in job_meta.items():
        if value is None:
            continue
        if key in _JSON_FIELDS:
            hash_data[key] = json.dumps(value)
        else:
            hash_data[key] = str(value)

    if hash_data:
        await redis_client.hset(job_key, mapping=hash_data)

    timestamp = time.time()
    await redis_client.zadd("jobs:index", {job_id: timestamp})

    state = job_meta.get("state", "UNKNOWN")
    await redis_client.zadd(f"jobs:index:state:{state}", {job_id: timestamp})
    for other_state in _STATE_INDEXES:
        if other_state != state:
            await redis_client.zrem(f"jobs:index:state:{other_state}", job_id)

    await redis_client.expire(job_key, settings.JOB_TTL)
    await publish_job_update(redis_client, job_meta)


async def set_status(redis_client, job_id: str, state: str, additional_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Merge existing job metadata, update state, and persist to Redis."""
    job_key = f"{settings.JOB_STATUS_PREFIX}{job_id}"
    existing_data, key_type = await fetch_job_metadata(redis_client, job_id)

    if key_type == "string":
        await redis_client.delete(job_key)

    job_meta: Dict[str, Any] = {
        "id": job_id,
        "state": state,
        "updated_at": datetime.utcnow().isoformat(),
    }

    if existing_data:
        for key, value in existing_data.items():
            if key == "state":
                continue
            job_meta[key] = value

    if additional_data:
        job_meta.update(additional_data)

    if state == "RUNNING" and "started_at" not in job_meta:
        job_meta["started_at"] = datetime.utcnow().isoformat()
    elif state in {"SUCCEEDED", "FAILED"} and "finished_at" not in job_meta:
        job_meta["finished_at"] = datetime.utcnow().isoformat()

    await touch_job(redis_client, job_meta)
    return job_meta


__all__ = [
    "fetch_job_metadata",
    "publish_job_update",
    "set_status",
    "touch_job",
]
