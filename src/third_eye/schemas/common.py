"""Shared schema primitives for Third Eye Overseer mode."""
from __future__ import annotations

from typing import Any, Dict

from pydantic import BaseModel, Field, field_validator

from ..constants import Lang


class StrictBaseModel(BaseModel):
    """Base model that forbids extras and preserves whitespace."""

    model_config = {
        "extra": "ignore",
        "populate_by_name": True,
        "str_strip_whitespace": False,
    }


class RequestContext(StrictBaseModel):
    """Context envelope attached to every Eye invocation."""

    session_id: str = Field(min_length=1)
    user_id: str | None = None
    tenant: str | None = None
    lang: Lang = Lang.AUTO
    budget_tokens: int = Field(ge=0)
    request_id: str | None = None
    settings: Dict[str, Any] | None = None

    @field_validator("session_id")
    @classmethod
    def _validate_session(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("session_id must not be blank")
        return value

    @field_validator("user_id")
    @classmethod
    def _validate_user(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("user_id must not be empty when provided")
        return value

    @field_validator("tenant")
    @classmethod
    def _validate_tenant(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("tenant must not be empty when provided")
        return value

    @field_validator("request_id")
    @classmethod
    def _validate_request_id(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("request_id must not be empty when provided")
        return value


class EyeResponse(StrictBaseModel):
    """Standardized response envelope returned by every Eye."""

    tag: str
    ok: bool
    code: str = Field(min_length=3)
    md: str = Field(min_length=1)
    data: Dict[str, Any]
    next: str = Field(alias="next")

    model_config = {
        "extra": "forbid",
        "populate_by_name": True,
    }


def require_markdown_heading(value: str, heading: str) -> str:
    """Ensure Markdown blobs start with the expected heading."""

    normalized = value.strip()
    if not normalized:
        raise ValueError(f"Markdown content must not be empty; expected heading '{heading}'")
    if not normalized.startswith(heading):
        raise ValueError(f"Markdown content must start with '{heading}'")
    return value


def require_reasoning(reasoning_md: str | None) -> str:
    """Validate that reasoning markdown is present and non-empty."""

    if reasoning_md is None:
        raise ValueError("`reasoning_md` is required")
    if not reasoning_md.strip():
        raise ValueError("`reasoning_md` must not be empty")
    return reasoning_md


__all__ = [
    "EyeResponse",
    "Lang",
    "RequestContext",
    "StrictBaseModel",
    "require_markdown_heading",
    "require_reasoning",
]
