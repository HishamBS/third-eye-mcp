"""Rinnegan plan review implementation."""
from __future__ import annotations

from typing import Dict, List

from ...constants import (
    CHECKBOX_TEMPLATE,
    DataKey,
    EyeTag,
    Heading,
    ISSUE_BULLET_TEMPLATE,
    NEWLINE,
    NextAction,
    NO_ACTION_NEEDED,
    SCHEMA_SECTION_LABELS,
    SCHEMA_TABLE_DIVIDER,
    SCHEMA_TABLE_HEADER,
    StatusCode,
)
from ...examples import EXAMPLE_PLAN_REVIEW
from ...schemas import EyeResponse, PlanReviewRequest
from .._shared import build_response, execute_eye

_EXAMPLE_REQUEST: Dict[str, object] = EXAMPLE_PLAN_REVIEW


def plan_review(raw: Dict[str, object]) -> Dict[str, object]:
    return execute_eye(
        tag=EyeTag.RINNEGAN_PLAN_REVIEW,
        model=PlanReviewRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: PlanReviewRequest) -> EyeResponse:
    plan_md = request.payload.submitted_plan_md
    missing_sections = _missing_sections(plan_md)
    issues: List[str] = []

    if missing_sections:
        issues.append(f"Missing sections: {', '.join(missing_sections)}")
    if SCHEMA_TABLE_HEADER not in plan_md or SCHEMA_TABLE_DIVIDER not in plan_md:
        issues.append("File Impact Table must include a Markdown table with Path, Action, Reason columns.")

    checklist_md = _checklist_md(missing_sections, plan_md)
    issues_md = _issues_md(issues)
    fix_instructions_md = _fix_instructions_md(issues)

    if issues:
        return build_response(
            tag=EyeTag.RINNEGAN_PLAN_REVIEW,
            ok=False,
            code=StatusCode.E_PLAN_INCOMPLETE,
            md=f"{Heading.PLAN_REJECTED.value}{NEWLINE}Resolve the issues listed before resubmitting.",
            data={
                DataKey.APPROVED.value: False,
                DataKey.CHECKLIST_MD.value: checklist_md,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: fix_instructions_md,
            },
            next_action=NextAction.RESUBMIT_PLAN.value,
        )

    return build_response(
        tag=EyeTag.RINNEGAN_PLAN_REVIEW,
        ok=True,
        code=StatusCode.OK_PLAN_APPROVED,
        md=f"{Heading.PLAN_APPROVED.value}{NEWLINE}All acceptance criteria satisfied.",
        data={
            DataKey.APPROVED.value: True,
            DataKey.CHECKLIST_MD.value: checklist_md,
            DataKey.ISSUES_MD.value: issues_md,
            DataKey.FIX_INSTRUCTIONS_MD.value: fix_instructions_md,
        },
        next_action=NextAction.GO_TO_MANGEKYO_SCAFFOLD.value,
    )


def _missing_sections(markdown: str) -> List[str]:
    return [section for section in SCHEMA_SECTION_LABELS if section not in markdown]


def _checklist_md(missing_sections: List[str], markdown: str) -> str:
    lines: List[str] = [Heading.PLAN_CHECKLIST.value]
    for section in SCHEMA_SECTION_LABELS:
        mark = "x" if section not in missing_sections else " "
        lines.append(CHECKBOX_TEMPLATE.format(mark=mark, label=section))
    table_present = SCHEMA_TABLE_HEADER in markdown and SCHEMA_TABLE_DIVIDER in markdown
    lines.append(
        CHECKBOX_TEMPLATE.format(
            mark="x" if table_present else " ",
            label="File impact table uses Markdown columns",
        )
    )
    return NEWLINE.join(lines)


def _issues_md(issues: List[str]) -> str:
    if not issues:
        return f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None"
    bullet_lines = NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
    return f"{Heading.PLAN_ISSUES.value}{NEWLINE}{bullet_lines}"


def _fix_instructions_md(issues: List[str]) -> str:
    if not issues:
        return NO_ACTION_NEEDED
    bullet_lines = NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
    return f"{Heading.PLAN_FIX.value}{NEWLINE}{bullet_lines}"


__all__ = ["plan_review"]
