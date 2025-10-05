"""Schemas for Tenseigan evidence validation."""
from __future__ import annotations

from typing import List

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class CitationEntry(StrictBaseModel):
    statement: str = Field(min_length=1)
    citation: str | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class TenseiganPayload(StrictBaseModel):
    draft_md: str = Field(min_length=1)
    citations: List[CitationEntry] | None = None


class TenseiganRequest(StrictBaseModel):
    context: RequestContext
    payload: TenseiganPayload
    reasoning_md: str | None = None


__all__ = ["CitationEntry", "TenseiganPayload", "TenseiganRequest"]
