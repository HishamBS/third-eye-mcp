"""Redis helpers for caching results."""
from __future__ import annotations

import hashlib
import json
from typing import Any

import redis.asyncio as aioredis

from .config import CONFIG

_REDIS_CLIENT: aioredis.Redis | None = None


def key_of(prefix: str, payload: dict[str, Any]) -> str:
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


async def get_redis() -> aioredis.Redis:
    global _REDIS_CLIENT
    if _REDIS_CLIENT is None:
        _REDIS_CLIENT = aioredis.from_url(
            f"redis://{CONFIG.redis.host}:{CONFIG.redis.port}/{CONFIG.redis.db}",
            encoding="utf-8",
            decode_responses=True,
        )
    return _REDIS_CLIENT


async def cache_json(prefix: str, payload: dict[str, Any], value: dict[str, Any], *, ttl_seconds: int = 3600) -> None:
    client = await get_redis()
    await client.set(key_of(prefix, payload), json.dumps(value, ensure_ascii=False), ex=ttl_seconds)


async def get_cached_json(prefix: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    client = await get_redis()
    raw = await client.get(key_of(prefix, payload))
    return json.loads(raw) if raw else None


async def append_list(key: str, value: list[float], *, max_items: int = 200) -> None:
    client = await get_redis()
    data = ",".join(f"{x:.8f}" for x in value)
    pipe = client.pipeline()
    pipe.rpush(key, data)
    pipe.ltrim(key, -max_items, -1)
    await pipe.execute()


async def list_vectors(key: str) -> list[list[float]]:
    client = await get_redis()
    raw = await client.lrange(key, 0, -1)
    vectors: list[list[float]] = []
    for item in raw:
        vectors.append([float(x) for x in item.split(",")])
    return vectors


__all__ = [
    "get_redis",
    "cache_json",
    "get_cached_json",
    "append_list",
    "list_vectors",
    "key_of",
]
