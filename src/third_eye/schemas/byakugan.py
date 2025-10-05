"""Schemas for Byakugan consistency checks."""
from __future__ import annotations

from typing import List, Optional

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class MemoryReference(StrictBaseModel):
    session_id: Optional[str] = None
    excerpt: Optional[str] = None
    ts: Optional[str] = None
    similarity: Optional[float] = None


class ByakuganPayload(StrictBaseModel):
    topic: str = Field(min_length=1)
    draft_md: str = Field(min_length=1)
    memory_references: Optional[List[MemoryReference]] = None


class ByakuganRequest(StrictBaseModel):
    context: RequestContext
    payload: ByakuganPayload
    reasoning_md: str | None = None


__all__ = ["ByakuganPayload", "ByakuganRequest", "MemoryReference"]
