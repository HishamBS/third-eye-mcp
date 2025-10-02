"""Schemas for Mangekyō code review phases."""
from __future__ import annotations

from typing import Literal

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class ReviewFile(StrictBaseModel):
    path: str = Field(min_length=1)
    intent: Literal["create", "modify", "delete"]
    reason: str = Field(min_length=1)


class ReviewScaffoldPayload(StrictBaseModel):
    files: list[ReviewFile] = Field(min_length=1)


class ReviewDiffPayload(StrictBaseModel):
    diffs_md: str = Field(min_length=1)


class ReviewTestsPayload(ReviewDiffPayload):
    coverage_summary_md: str = Field(min_length=1)


class ReviewRequestBase(StrictBaseModel):
    context: RequestContext
    reasoning_md: str | None = None


class ReviewScaffoldRequest(ReviewRequestBase):
    payload: ReviewScaffoldPayload


class ReviewImplRequest(ReviewRequestBase):
    payload: ReviewDiffPayload


class ReviewTestsRequest(ReviewRequestBase):
    payload: ReviewTestsPayload


class ReviewDocsRequest(ReviewRequestBase):
    payload: ReviewDiffPayload


__all__ = [
    "ReviewFile",
    "ReviewScaffoldPayload",
    "ReviewDiffPayload",
    "ReviewTestsPayload",
    "ReviewScaffoldRequest",
    "ReviewImplRequest",
    "ReviewTestsRequest",
    "ReviewDocsRequest",
]
