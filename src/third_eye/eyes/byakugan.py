"""Byakugan eye implementation: consistency checks."""
from __future__ import annotations

import asyncio
import re
from typing import Any, Dict, Tuple, List

from ..constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
    CONSISTENCY_CONTRADICTION_PATTERNS,
)
from ..examples import EXAMPLE_BYAKUGAN
from ..schemas import ByakuganRequest, EyeResponse
from ._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_BYAKUGAN


async def consistency_check_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.BYAKUGAN,
        model=ByakuganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def consistency_check(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(consistency_check_async(raw))
    raise RuntimeError(
        "consistency_check() cannot be called from an active event loop; use await consistency_check_async() instead."
    )


def _resolve_tolerance(request: ByakuganRequest) -> float:
    context = getattr(request, "context", None)
    settings = getattr(context, "settings", None) if context else None
    candidate = None
    if isinstance(settings, dict):
        candidate = settings.get("consistency_tolerance")
    elif settings is not None:
        candidate = getattr(settings, "get", lambda *_: None)("consistency_tolerance")
    if candidate is None:
        return 0.85
    try:
        value = float(candidate)
    except (TypeError, ValueError):
        return 0.85
    return max(0.0, min(1.0, value))


def _consistency_score(markdown: str) -> Tuple[float, List[str]]:
    issues: List[str] = []
    score = 1.0
    lower = markdown.lower()
    has_todo_markers = any(
        re.search(pattern, lower)
        for pattern in (r"\btodo\b", r"\btbd\b", r"\bfixme\b")
    )
    if has_todo_markers:
        score -= 0.4
        issues.append("Remove TODO/TBD markers before approval.")

    for first, second in CONSISTENCY_CONTRADICTION_PATTERNS:
        if re.search(first, lower) and re.search(second, lower):
            score -= 0.3
            issues.append("Detected conflicting statements in draft.")

    if "no change" in lower and any(keyword in lower for keyword in ("increase", "decrease", "grew", "declined")):
        score -= 0.2
        issues.append("Draft mentions 'no change' alongside growth/decline statements.")

    return max(0.0, min(1.0, score)), issues


def _handle(request: ByakuganRequest) -> EyeResponse:
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.BYAKUGAN,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Describe how the draft was validated for contradictions.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.FIX_CONTRADICTIONS.value,
        )

    tolerance = _resolve_tolerance(request)
    draft_md = request.payload.draft_md
    score, issues = _consistency_score(draft_md)

    if issues and score < tolerance:
        issues_md = f"{Heading.CONSISTENCY.value}{NEWLINE}" + NEWLINE.join(f"- {item}" for item in issues)
        return build_response(
            tag=EyeTag.BYAKUGAN,
            ok=False,
            code=StatusCode.E_CONTRADICTION_DETECTED,
            md=f"{Heading.CONSISTENCY.value}{NEWLINE}Consistency score {score:.2f} below tolerance {tolerance:.2f}.",
            data={
                DataKey.ISSUES_MD.value: issues_md,
                "consistency_score": score,
            },
            next_action=NextAction.FIX_CONTRADICTIONS.value,
        )

    md = f"{Heading.CONSISTENCY.value}{NEWLINE}No contradictions detected for topic `{request.payload.topic}`."
    return build_response(
        tag=EyeTag.BYAKUGAN,
        ok=True,
        code=StatusCode.OK_CONSISTENT,
        md=md,
        data={
            DataKey.ISSUES_MD.value: "",
            "consistency_score": score,
        },
        next_action=NextAction.RETURN_DELIVERABLE.value,
    )


__all__ = ["consistency_check", "consistency_check_async"]
