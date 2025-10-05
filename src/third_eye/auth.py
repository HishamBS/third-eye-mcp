"""API key generation and verification."""
from __future__ import annotations

import asyncio
import hashlib
import secrets
import time
from typing import Dict

from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from .db import (
    fetch_api_key,
    fetch_api_key_async,
    touch_api_key,
    touch_api_key_async,
    upsert_api_key,
    upsert_api_key_async,
)

API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
_DEFAULT_ROLE = "consumer"


def generate_api_key(length: int = 32) -> str:
    return secrets.token_urlsafe(length)


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def create_api_key(
    *,
    key_id: str,
    raw_secret: str,
    role: str | None = None,
    limits: Dict[str, object] | None = None,
    tenant: str | None = None,
    ttl_seconds: int | None = None,
    revoked_at: float | None = None,
    account_id: str | None = None,
    display_name: str | None = None,
) -> None:
    expires_at = time.time() + ttl_seconds if ttl_seconds else None
    rotated_at = time.time()
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        upsert_api_key(
            key_id=key_id,
            hashed_secret=hash_api_key(raw_secret),
            role=role or _DEFAULT_ROLE,
            limits_json=limits or {},
            tenant=tenant,
            expires_at=expires_at,
            revoked_at=revoked_at,
            rotated_at=rotated_at,
            account_id=account_id,
            display_name=display_name,
        )
        return
    raise RuntimeError(
        "create_api_key() cannot be called from an active event loop; use "
        "await create_api_key_async() instead."
    )


async def create_api_key_async(
    *,
    key_id: str,
    raw_secret: str,
    role: str | None = None,
    limits: Dict[str, object] | None = None,
    tenant: str | None = None,
    ttl_seconds: int | None = None,
    revoked_at: float | None = None,
    account_id: str | None = None,
    display_name: str | None = None,
) -> None:
    expires_at = time.time() + ttl_seconds if ttl_seconds else None
    rotated_at = time.time()
    await upsert_api_key_async(
        key_id=key_id,
        hashed_secret=hash_api_key(raw_secret),
        role=role or _DEFAULT_ROLE,
        limits_json=limits or {},
        tenant=tenant,
        expires_at=expires_at,
        revoked_at=revoked_at,
        rotated_at=rotated_at,
        account_id=account_id,
        display_name=display_name,
    )


async def validate_api_key_async(raw_key: str | None) -> Dict[str, object]:
    if not raw_key:
        raise HTTPException(status_code=401, detail="Missing API key")
    record = await fetch_api_key_async(hashed_secret=hash_api_key(raw_key))
    if not record:
        raise HTTPException(status_code=403, detail="Invalid API key")
    if record.get("revoked_at"):
        raise HTTPException(status_code=403, detail="API key revoked")
    expires_at = record.get("expires_at")
    if expires_at and expires_at < time.time():
        raise HTTPException(status_code=403, detail="API key expired")
    await touch_api_key_async(key_id=record["id"])
    return record


def validate_api_key(raw_key: str | None) -> Dict[str, object]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(validate_api_key_async(raw_key))
    raise RuntimeError(
        "validate_api_key() cannot be called from an active event loop; use "
        "await validate_api_key_async() instead."
    )


async def verify_api_key(x_api_key: str | None = Security(API_KEY_HEADER)) -> Dict[str, object]:
    return await validate_api_key_async(x_api_key)


async def require_api_key(
    record: Dict[str, object] = Depends(verify_api_key)
) -> Dict[str, object]:  # noqa: B008
    return record


__all__ = [
    "generate_api_key",
    "hash_api_key",
    "create_api_key",
    "create_api_key_async",
    "validate_api_key",
    "validate_api_key_async",
    "verify_api_key",
    "require_api_key",
]
