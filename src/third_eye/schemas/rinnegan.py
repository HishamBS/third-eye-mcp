"""Schemas for Rinnegan orchestration phases."""
from __future__ import annotations

from pydantic import Field

from .common import RequestContext, StrictBaseModel


class PlanRequirementsPayload(StrictBaseModel):
    summary_md: str | None = None


class PlanRequirementsRequest(StrictBaseModel):
    context: RequestContext
    payload: PlanRequirementsPayload
    reasoning_md: str | None = None


class PlanReviewPayload(StrictBaseModel):
    submitted_plan_md: str = Field(min_length=1)


class PlanReviewRequest(StrictBaseModel):
    context: RequestContext
    payload: PlanReviewPayload
    reasoning_md: str | None = None


class FinalApprovalPayload(StrictBaseModel):
    plan_approved: bool
    scaffold_approved: bool
    impl_approved: bool
    tests_approved: bool
    docs_approved: bool
    text_validated: bool
    consistent: bool


class FinalApprovalRequest(StrictBaseModel):
    context: RequestContext
    payload: FinalApprovalPayload
    reasoning_md: str | None = None


__all__ = [
    "PlanRequirementsPayload",
    "PlanRequirementsRequest",
    "PlanReviewPayload",
    "PlanReviewRequest",
    "FinalApprovalPayload",
    "FinalApprovalRequest",
]
