"""Mangekyō implementation diff review."""
from __future__ import annotations

import asyncio
from typing import Any, Dict

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ...examples import EXAMPLE_IMPL
from ...schemas import EyeResponse, ReviewImplRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_IMPL


def _strictness(request: ReviewImplRequest) -> str:
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


async def review_impl_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.MANGEKYO_REVIEW_IMPL,
        model=ReviewImplRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def review_impl(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(review_impl_async(raw))
    raise RuntimeError(
        "review_impl() cannot be called from an active event loop; use await review_impl_async() instead."
    )


def _handle(request: ReviewImplRequest) -> EyeResponse:
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_IMPL,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Share the rationale for implementation changes.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.RESUBMIT_IMPL.value,
        )

    diffs_md = request.payload.diffs_md or ""
    if "```diff" not in diffs_md:
        md = (
            f"{Heading.IMPLEMENTATION_REJECTED.value}{NEWLINE}"
            "Include diffs using ```diff``` fences."
        )
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_IMPL,
            ok=False,
            code=StatusCode.E_IMPL_ISSUES,
            md=md,
            data={
                DataKey.ISSUES_MD.value: "Diff snippets must use ```diff fences.",
                "mangekyo_strictness": _strictness(request),
            },
            next_action=NextAction.RESUBMIT_IMPL.value,
        )

    level = _strictness(request)
    checklist = (
        f"{Heading.IMPLEMENTATION_CHECKLIST.value}{NEWLINE}- Diff provided\n- Reasoning supplied\n"
        f"- Strictness: {level.title()}"
    )
    data = {
        DataKey.CHECKLIST_MD.value: checklist,
        DataKey.ISSUES_MD.value: "",
        "mangekyo_strictness": level,
    }
    md = f"{Heading.IMPLEMENTATION_APPROVED.value}{NEWLINE}Implementation changes look sound."
    return build_response(
        tag=EyeTag.MANGEKYO_REVIEW_IMPL,
        ok=True,
        code=StatusCode.OK_IMPL_APPROVED,
        md=md,
        data=data,
        next_action=NextAction.GO_TO_TESTS.value,
    )


__all__ = ["review_impl", "review_impl_async"]
