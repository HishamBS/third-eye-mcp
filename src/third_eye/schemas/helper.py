"""Schemas for Prompt Helper eye."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class PromptHelperPayload(StrictBaseModel):
    user_prompt: str = Field(min_length=1)
    clarification_answers_md: str = Field(min_length=1)


class PromptHelperRequest(StrictBaseModel):
    context: RequestContext
    payload: PromptHelperPayload
    reasoning_md: str | None = None


__all__ = ["PromptHelperPayload", "PromptHelperRequest"]
