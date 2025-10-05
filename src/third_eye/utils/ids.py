
"""Helpers for generating human-readable identifiers."""
from __future__ import annotations

import secrets
import string

_DEFAULT_ALPHABET = string.ascii_lowercase + string.digits


def generate_key_id(*, prefix: str = 'key', length: int = 16, alphabet: str = _DEFAULT_ALPHABET) -> str:
    """Generate a short, URL-safe identifier with a prefix."""

    if length <= 0:
        raise ValueError('length must be positive')
    suffix = ''.join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}_{suffix}"


__all__ = ['generate_key_id']
