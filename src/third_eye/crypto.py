"""Simple symmetric encryption utilities for protecting sensitive fields."""
from __future__ import annotations

import base64
import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


class SecretKeyMissing(RuntimeError):
    """Raised when the encryption key is not configured."""


def _load_raw_key() -> bytes:
    env_value = os.getenv("THIRD_EYE_SECRET_KEY")
    if not env_value:
        raise SecretKeyMissing("THIRD_EYE_SECRET_KEY must be set for credential encryption")
    try:
        raw = base64.urlsafe_b64decode(env_value)
    except Exception as exc:  # pragma: no cover - invalid env caught at runtime
        raise SecretKeyMissing("THIRD_EYE_SECRET_KEY is not valid base64") from exc
    if len(raw) != 32:
        raise SecretKeyMissing("THIRD_EYE_SECRET_KEY must decode to 32 bytes")
    return base64.urlsafe_b64encode(raw)


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(_load_raw_key())


def encrypt_text(plaintext: str) -> str:
    if not plaintext:
        return ""
    token = _fernet().encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_text(ciphertext: str) -> str:
    if not ciphertext:
        return ""
    try:
        value = _fernet().decrypt(ciphertext.encode("utf-8"))
    except InvalidToken as exc:
        raise ValueError("Invalid ciphertext provided") from exc
    return value.decode("utf-8")


__all__ = ["encrypt_text", "decrypt_text", "SecretKeyMissing"]
