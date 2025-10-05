"""Mangekyō scaffold review."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, List

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ...examples import EXAMPLE_SCAFFOLD
from ...schemas import EyeResponse, ReviewScaffoldRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_SCAFFOLD


def _strictness(request: ReviewScaffoldRequest) -> str:
    context = getattr(request, "context", None)
    settings = getattr(context, "settings", None) if context else None
    value = None
    if isinstance(settings, dict):
        value = settings.get("mangekyo")
    elif settings is not None:
        value = getattr(settings, "get", lambda *_: None)("mangekyo")
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"lenient", "normal", "strict"}:
            return lowered
    return "normal"


async def review_scaffold_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
        model=ReviewScaffoldRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def review_scaffold(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(review_scaffold_async(raw))
    raise RuntimeError(
        "review_scaffold() cannot be called from an active event loop; use await review_scaffold_async() instead."
    )


def _handle(request: ReviewScaffoldRequest) -> EyeResponse:
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Provide reasoning for proposed scaffold changes.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.RESUBMIT_SCAFFOLD.value,
        )

    files = request.payload.files
    seen: set[str] = set()
    duplicates: List[str] = []
    for file in files:
        path = file.path
        if path in seen:
            duplicates.append(path)
        seen.add(path)

    if duplicates:
        issue_lines = NEWLINE.join(f"- Duplicate entry for `{path}`" for path in duplicates)
        md = f"{Heading.SCAFFOLD_REJECTED.value}{NEWLINE}{issue_lines}"
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
            ok=False,
            code=StatusCode.E_SCAFFOLD_ISSUES,
            md=md,
            data={
                DataKey.ISSUES_MD.value: issue_lines,
                "mangekyo_strictness": _strictness(request),
            },
            next_action=NextAction.RESUBMIT_SCAFFOLD.value,
        )

    level = _strictness(request)
    checklist = NEWLINE.join(
        [Heading.SCAFFOLD_CHECKLIST.value]
        + [f"- `{file.path}` → {file.intent}: {file.reason}" for file in files]
        + [f"- Strictness: {level.title()}"]
    )
    data = {
        DataKey.CHECKLIST_MD.value: checklist,
        DataKey.ISSUES_MD.value: "",
        "mangekyo_strictness": level,
    }
    md = f"{Heading.SCAFFOLD_APPROVED.value}{NEWLINE}Scaffold looks ready."
    return build_response(
        tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
        ok=True,
        code=StatusCode.OK_SCAFFOLD_APPROVED,
        md=md,
        data=data,
        next_action=NextAction.GO_TO_IMPL.value,
    )


__all__ = ["review_scaffold", "review_scaffold_async"]
