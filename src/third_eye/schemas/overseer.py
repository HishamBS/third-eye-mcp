"""Schema for Overseer navigator tool."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class NavigatorPayload(StrictBaseModel):
    goal: str | None = Field(default=None, description="Optional high-level objective from the host agent")


class NavigatorRequest(StrictBaseModel):
    context: RequestContext | None = None
    payload: NavigatorPayload | None = None
    reasoning_md: str | None = None


__all__ = ["NavigatorPayload", "NavigatorRequest"]
