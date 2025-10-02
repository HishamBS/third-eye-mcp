"""Schemas for Byakugan consistency checks."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class ByakuganPayload(StrictBaseModel):
    topic: str = Field(min_length=1)
    draft_md: str = Field(min_length=1)


class ByakuganRequest(StrictBaseModel):
    context: RequestContext
    payload: ByakuganPayload
    reasoning_md: str | None = None


__all__ = ["ByakuganPayload", "ByakuganRequest"]
