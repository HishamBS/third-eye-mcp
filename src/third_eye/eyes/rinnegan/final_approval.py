"""Rinnegan final approval gate."""
from __future__ import annotations

from typing import Dict

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
    SUMMARY_BULLET_TEMPLATE,
)
from ...examples import EXAMPLE_FINAL_APPROVAL
from ...schemas import EyeResponse, FinalApprovalRequest
from .._shared import build_response, execute_eye

_EXAMPLE_REQUEST: Dict[str, object] = EXAMPLE_FINAL_APPROVAL

_PHASE_LABELS: Dict[str, str] = {
    "plan_approved": "Plan",
    "scaffold_approved": "Scaffold",
    "impl_approved": "Implementation",
    "tests_approved": "Tests",
    "docs_approved": "Docs",
    "text_validated": "Evidence",
    "consistent": "Consistency",
}


def final_approval(raw: Dict[str, object]) -> Dict[str, object]:
    return execute_eye(
        tag=EyeTag.RINNEGAN_FINAL,
        model=FinalApprovalRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: FinalApprovalRequest) -> EyeResponse:
    summary_lines = [Heading.SUMMARY.value]
    missing_labels: list[str] = []
    for field, label in _PHASE_LABELS.items():
        approved = getattr(request.payload, field)
        status = "OK" if approved else "Pending"
        summary_lines.append(SUMMARY_BULLET_TEMPLATE.format(label=label, status=status))
        if not approved:
            missing_labels.append(label)
    summary_md = NEWLINE.join(summary_lines)

    if missing_labels:
        return build_response(
            tag=EyeTag.RINNEGAN_FINAL,
            ok=False,
            code=StatusCode.E_PHASES_INCOMPLETE,
            md=f"{Heading.FINAL_BLOCKED.value}{NEWLINE}Outstanding phases: {', '.join(missing_labels)}",
            data={
                DataKey.APPROVED.value: False,
                DataKey.SUMMARY_MD.value: summary_md,
            },
            next_action=NextAction.COMPLETE_PHASES.value,
        )

    return build_response(
        tag=EyeTag.RINNEGAN_FINAL,
        ok=True,
        code=StatusCode.OK_ALL_APPROVED,
        md=f"{Heading.FINAL_APPROVAL.value}{NEWLINE}All phases approved. Host may deliver the final artifact.",
        data={
            DataKey.APPROVED.value: True,
            DataKey.SUMMARY_MD.value: summary_md,
        },
        next_action=NextAction.RETURN_DELIVERABLE.value,
    )


__all__ = ["final_approval"]
