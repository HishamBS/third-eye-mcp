"""Mangekyō documentation review."""
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
from ...examples import EXAMPLE_DOCS
from ...schemas import EyeResponse, ReviewDocsRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_DOCS


def _strictness(request: ReviewDocsRequest) -> str:
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


async def review_docs_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.MANGEKYO_REVIEW_DOCS,
        model=ReviewDocsRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def review_docs(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(review_docs_async(raw))
    raise RuntimeError(
        "review_docs() cannot be called from an active event loop; use await review_docs_async() instead."
    )


def _handle(request: ReviewDocsRequest) -> EyeResponse:
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_DOCS,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Describe documentation updates before submitting.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.RESUBMIT_DOCS.value,
        )

    diffs_md = (request.payload.diffs_md or "").lower()
    if not any(token in diffs_md for token in ("readme", "docs/", "doc/", "documentation")):
        md = f"{Heading.DOCS_REJECTED.value}{NEWLINE}Reference the documentation artifact being updated."
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_DOCS,
            ok=False,
            code=StatusCode.E_DOCS_MISSING,
            md=md,
            data={
                DataKey.ISSUES_MD.value: "Mention README/docs/changelog updates in the diff.",
                "mangekyo_strictness": _strictness(request),
            },
            next_action=NextAction.RESUBMIT_DOCS.value,
        )

    level = _strictness(request)
    checklist = (
        f"{Heading.DOCUMENTATION_CHECKLIST.value}{NEWLINE}- Diff references documentation\n- Reasoning supplied\n"
        f"- Strictness: {level.title()}"
    )
    data = {
        DataKey.CHECKLIST_MD.value: checklist,
        DataKey.ISSUES_MD.value: "",
        "mangekyo_strictness": level,
    }
    md = f"{Heading.DOCS_APPROVED.value}{NEWLINE}Documentation updates look complete."
    return build_response(
        tag=EyeTag.MANGEKYO_REVIEW_DOCS,
        ok=True,
        code=StatusCode.OK_DOCS_APPROVED,
        md=md,
        data=data,
        next_action=NextAction.GO_TO_FINAL.value,
    )


__all__ = ["review_docs", "review_docs_async"]
