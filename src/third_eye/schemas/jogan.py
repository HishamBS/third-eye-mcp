"""Schemas for Jōgan intent confirmation."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class JoganPayload(StrictBaseModel):
    refined_prompt_md: str = Field(min_length=1)
    estimated_tokens: int = Field(ge=0)


class JoganRequest(StrictBaseModel):
    context: RequestContext
    payload: JoganPayload
    reasoning_md: str | None = None


__all__ = ["JoganPayload", "JoganRequest"]
