"""Schemas for Tenseigan evidence validation."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class TenseiganPayload(StrictBaseModel):
    draft_md: str = Field(min_length=1)


class TenseiganRequest(StrictBaseModel):
    context: RequestContext
    payload: TenseiganPayload
    reasoning_md: str | None = None


__all__ = ["TenseiganPayload", "TenseiganRequest"]
