"""Redis helpers for caching results."""
from __future__ import annotations

import hashlib
import json
import os
from typing import Any

import redis.asyncio as aioredis

from .config import CONFIG

_CFG = CONFIG.redis
_REDIS_CLIENT: aioredis.Redis | None = None


def _build_redis_url() -> str:
    if _CFG.url_env:
        env_value = os.getenv(_CFG.url_env)
        if env_value:
            return env_value
    host = _CFG.host or "localhost"
    port = _CFG.port or 6379
    username = os.getenv(_CFG.username_env, "") if _CFG.username_env else ""
    password = os.getenv(_CFG.password_env, "") if _CFG.password_env else ""
    if _CFG.require_auth and not password:
        raise RuntimeError("Redis password not configured; set the environment variable defined by redis.password_env")
    auth_segment = ""
    if username or password:
        auth_segment = f"{username}:{password}@"
    scheme = "rediss" if _CFG.use_tls else "redis"
    return f"{scheme}://{auth_segment}{host}:{port}/{_CFG.db}"


def key_of(prefix: str, payload: dict[str, Any]) -> str:
    digest = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()
    return f"{prefix}:{digest}"


async def get_redis() -> aioredis.Redis:
    global _REDIS_CLIENT
    if _REDIS_CLIENT is None:
        url = _build_redis_url()
        use_tls = url.startswith("rediss://") or _CFG.use_tls
        _REDIS_CLIENT = aioredis.from_url(
            url,
            encoding=_CFG.encoding,
            decode_responses=True,
            health_check_interval=_CFG.healthcheck_seconds,
            client_name=_CFG.client_name,
            ssl=use_tls,
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


async def redis_health_check() -> bool:
    try:
        client = await get_redis()
        await client.ping()
    except Exception:  # pragma: no cover - surfaced via health endpoint
        return False
    return True


async def close_redis() -> None:
    global _REDIS_CLIENT
    if _REDIS_CLIENT is not None:
        await _REDIS_CLIENT.close()
        _REDIS_CLIENT = None


__all__ = [
    "get_redis",
    "cache_json",
    "get_cached_json",
    "append_list",
    "list_vectors",
    "key_of",
    "redis_health_check",
    "close_redis",
]
