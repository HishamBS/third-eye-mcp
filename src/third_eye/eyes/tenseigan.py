"""Tenseigan eye implementation: validate citations for factual claims."""
from __future__ import annotations

import asyncio
from typing import Any, Dict

from ..constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ..examples import EXAMPLE_TENSEIGAN
from ..schemas import EyeResponse, TenseiganRequest
from ._shared import build_response, execute_eye, execute_eye_async

DEFAULT_CUTOFF = 0.80

_EXAMPLE_REQUEST = EXAMPLE_TENSEIGAN


async def validate_claims_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.TENSEIGAN,
        model=TenseiganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def validate_claims(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(validate_claims_async(raw))
    raise RuntimeError(
        "validate_claims() cannot be called from an active event loop; use await validate_claims_async() instead."
    )

def _resolve_cutoff(request: TenseiganRequest) -> float:
    context = getattr(request, "context", None)
    settings = getattr(context, "settings", None) if context else None
    candidate = None
    if isinstance(settings, dict):
        candidate = settings.get("citation_cutoff")
    elif settings is not None:
        candidate = getattr(settings, "get", lambda *_: None)("citation_cutoff")
    if candidate is None:
        return DEFAULT_CUTOFF
    try:
        value = float(candidate)
    except (TypeError, ValueError):
        return DEFAULT_CUTOFF
    return max(0.0, min(1.0, value))


def _has_citations(markdown: str) -> bool:
    lower = markdown.lower()
    if "### citations" not in lower:
        return False
    return "|" in markdown


def _handle(request: TenseiganRequest) -> EyeResponse:
    draft_md = request.payload.draft_md or ""
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.TENSEIGAN,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Explain how the evidence was reviewed before submitting.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.ADD_CITATIONS.value,
        )

    if not _has_citations(draft_md):
        md = f"{Heading.CITATIONS.value}{NEWLINE}Provide a citations table for each factual claim."
        return build_response(
            tag=EyeTag.TENSEIGAN,
            ok=False,
            code=StatusCode.E_CITATIONS_MISSING,
            md=md,
            data={DataKey.ISSUES_MD.value: "Citations table missing or incomplete."},
            next_action=NextAction.ADD_CITATIONS.value,
        )

    cutoff = _resolve_cutoff(request)
    weak_citations: list[str] = []
    if request.payload.citations:
        for entry in request.payload.citations:
            confidence = entry.confidence if entry.confidence is not None else 0.0
            citation = entry.citation or "(missing)"
            if confidence < cutoff or not entry.citation:
                weak_citations.append(f"{entry.statement} → {citation} ({confidence:.2f})")

    if weak_citations:
        issues_md = f"{Heading.CITATIONS.value}{NEWLINE}" + NEWLINE.join(f"- {item}" for item in weak_citations)
        return build_response(
            tag=EyeTag.TENSEIGAN,
            ok=False,
            code=StatusCode.E_CITATIONS_MISSING,
            md=f"{Heading.CITATIONS.value}{NEWLINE}Citations fall below confidence threshold ({cutoff:.2f}).",
            data={DataKey.ISSUES_MD.value: issues_md},
            next_action=NextAction.ADD_CITATIONS.value,
        )

    md = f"{Heading.CLAIMS_VALIDATED.value}{NEWLINE}Citations present for each claim."
    data = {
        DataKey.ISSUES_MD.value: "",
        DataKey.CLAIMS_MD.value: draft_md,
    }
    return build_response(
        tag=EyeTag.TENSEIGAN,
        ok=True,
        code=StatusCode.OK_TEXT_VALIDATED,
        md=md,
        data=data,
        next_action=NextAction.GO_TO_BYAKUGAN.value,
    )


__all__ = ["validate_claims", "validate_claims_async"]
