"""Admin account management utilities."""
from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from typing import Any, Dict, Tuple

from passlib.context import CryptContext

from .auth import create_api_key, create_api_key_async, generate_api_key
from .config import CONFIG
from .db import (
    admin_account_count,
    admin_account_count_async,
    create_admin_account_async,
    fetch_admin_by_email,
    fetch_admin_by_email_async,
    fetch_admin_by_id,
    fetch_admin_by_id_async,
    revoke_api_keys_for_account,
    revoke_api_keys_for_account_async,
    touch_admin_login,
    touch_admin_login_async,
    update_admin_password,
    update_admin_password_async,
    update_admin_profile,
    update_admin_profile_async,
)

LOG = logging.getLogger(__name__)

_pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)


class AuthenticationError(ValueError):
    """Raised when admin authentication fails."""


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _pwd_context.verify(password, password_hash)
    except ValueError:
        return False


def sanitize_admin_record(record: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": record["id"],
        "email": record["email"],
        "display_name": record.get("display_name"),
        "require_password_reset": bool(record.get("require_password_reset", False)),
        "created_at": record.get("created_at"),
        "updated_at": record.get("updated_at"),
        "last_login_at": record.get("last_login_at"),
    }


async def ensure_bootstrap_admin_async(*, require_secret: bool = True) -> None:
    if await admin_account_count_async() > 0:
        return

    cfg = CONFIG.admin
    password = os.getenv(cfg.password_env)
    if not password:
        message = (
            f"Bootstrap admin password environment variable '{cfg.password_env}' is not set; "
            "skipping auto bootstrap"
        )
        if require_secret:
            raise RuntimeError(message)
        LOG.warning(message, extra={"email": cfg.email})
        return

    admin_id = str(uuid.uuid4())
    await create_admin_account_async(
        admin_id=admin_id,
        email=cfg.email,
        display_name=cfg.display_name,
        password_hash=hash_password(password),
        require_password_reset=True,
    )
    LOG.warning(
        "Bootstrap admin account created.",
        extra={"email": cfg.email, "admin_id": admin_id},
    )


def ensure_bootstrap_admin(*, require_secret: bool = True) -> None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(ensure_bootstrap_admin_async(require_secret=require_secret))
        return
    raise RuntimeError(
        "ensure_bootstrap_admin() cannot be called from an active event loop; use "
        "await ensure_bootstrap_admin_async() instead."
    )


async def authenticate_admin_async(email: str, password: str) -> Dict[str, Any]:
    record = await fetch_admin_by_email_async(email)
    if not record or not verify_password(password, record["password_hash"]):
        raise AuthenticationError("Invalid credentials")
    await touch_admin_login_async(record["id"])
    now = time.time()
    record["last_login_at"] = now
    record["updated_at"] = now
    return record


def authenticate_admin(email: str, password: str) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(authenticate_admin_async(email, password))
    raise RuntimeError(
        "authenticate_admin() cannot be called from an active event loop; use "
        "await authenticate_admin_async() instead."
    )


async def issue_admin_api_key_async(admin_id: str, *, rotate_existing: bool = True) -> Tuple[str, str]:
    if rotate_existing:
        await revoke_api_keys_for_account_async(account_id=admin_id)
    key_id = f"admin-{uuid.uuid4()}"
    secret = generate_api_key()
    await create_api_key_async(
        key_id=key_id,
        raw_secret=secret,
        role="admin",
        limits={},
        tenant=None,
        account_id=admin_id,
    )
    return key_id, secret


def issue_admin_api_key(admin_id: str, *, rotate_existing: bool = True) -> Tuple[str, str]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(
            issue_admin_api_key_async(admin_id, rotate_existing=rotate_existing)
        )
    raise RuntimeError(
        "issue_admin_api_key() cannot be called from an active event loop; use "
        "await issue_admin_api_key_async() instead."
    )


def reset_admin_password(admin_id: str, new_password: str, *, force_reset: bool) -> None:
    update_admin_password(
        admin_id=admin_id,
        password_hash=hash_password(new_password),
        require_password_reset=force_reset,
    )


async def change_admin_password_async(admin_id: str, new_password: str) -> Tuple[str, str]:
    await update_admin_password_async(
        admin_id=admin_id,
        password_hash=hash_password(new_password),
        require_password_reset=False,
    )
    await revoke_api_keys_for_account_async(account_id=admin_id)
    key_id, secret = await issue_admin_api_key_async(admin_id, rotate_existing=False)
    await touch_admin_login_async(admin_id)
    return key_id, secret


def change_admin_password(admin_id: str, new_password: str) -> Tuple[str, str]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(change_admin_password_async(admin_id, new_password))
    raise RuntimeError(
        "change_admin_password() cannot be called from an active event loop; use "
        "await change_admin_password_async() instead."
    )


def update_admin_account(admin_id: str, *, email: str | None = None, display_name: str | None = None) -> None:
    update_admin_profile(admin_id=admin_id, email=email, display_name=display_name)


async def update_admin_account_async(
    admin_id: str,
    *,
    email: str | None = None,
    display_name: str | None = None,
) -> None:
    await update_admin_profile_async(
        admin_id=admin_id,
        email=email,
        display_name=display_name,
    )


async def get_admin_account_async(admin_id: str) -> Dict[str, Any] | None:
    return await fetch_admin_by_id_async(admin_id)


def get_admin_account(admin_id: str) -> Dict[str, Any] | None:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(get_admin_account_async(admin_id))
    raise RuntimeError(
        "get_admin_account() cannot be called from an active event loop; use "
        "await get_admin_account_async() instead."
    )


__all__ = [
    "AuthenticationError",
    "authenticate_admin",
    "authenticate_admin_async",
    "change_admin_password",
    "change_admin_password_async",
    "ensure_bootstrap_admin",
    "ensure_bootstrap_admin_async",
    "get_admin_account",
    "get_admin_account_async",
    "hash_password",
    "issue_admin_api_key",
    "issue_admin_api_key_async",
    "reset_admin_password",
    "sanitize_admin_record",
    "update_admin_account",
    "update_admin_account_async",
    "verify_password",
]
