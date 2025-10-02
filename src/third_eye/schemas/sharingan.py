"""Schemas for Sharingan ambiguity radar."""
from __future__ import annotations

from pydantic import Field

from ..constants import Lang
from .common import RequestContext, StrictBaseModel


class SharinganPayload(StrictBaseModel):
    prompt: str = Field(min_length=1)
    lang: Lang = Lang.AUTO


class SharinganRequest(StrictBaseModel):
    context: RequestContext
    payload: SharinganPayload
    reasoning_md: str | None = None


__all__ = ["SharinganPayload", "SharinganRequest"]
