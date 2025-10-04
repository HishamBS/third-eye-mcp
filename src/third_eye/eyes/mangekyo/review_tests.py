"""Mangekyō test review."""
from __future__ import annotations

import asyncio
import re
from typing import Any, Dict

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ...examples import EXAMPLE_TESTS
from ...schemas import EyeResponse, ReviewTestsRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_TESTS

_COVERAGE_PATTERN = re.compile(r"(lines|branches)\s*:\s*(\d+)%", re.IGNORECASE)
_THRESHOLDS = {
    "lenient": {"lines": 70, "branches": 55},
    "normal": {"lines": 75, "branches": 60},
    "strict": {"lines": 85, "branches": 75},
}


def _strictness(request: ReviewTestsRequest) -> str:
    context = getattr(request, "context", None)
    settings = getattr(context, "settings", None) if context else None
    value = None
    if isinstance(settings, dict):
        value = settings.get("mangekyo")
    elif settings is not None:
        value = getattr(settings, "get", lambda *_: None)("mangekyo")
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in _THRESHOLDS:
            return lowered
    return "normal"


async def review_tests_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.MANGEKYO_REVIEW_TESTS,
        model=ReviewTestsRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def review_tests(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(review_tests_async(raw))
    raise RuntimeError(
        "review_tests() cannot be called from an active event loop; use await review_tests_async() instead."
    )


def _parse_coverage(summary: str) -> Dict[str, int]:
    results: Dict[str, int] = {}
    for label, value in _COVERAGE_PATTERN.findall(summary or ""):
        results[label.lower()] = int(value)
    return results


def _handle(request: ReviewTestsRequest) -> EyeResponse:
    if not request.reasoning_md or not request.reasoning_md.strip():
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_TESTS,
            ok=False,
            code=StatusCode.E_REASONING_MISSING,
            md=f"{Heading.REASONING.value}{NEWLINE}Explain the regression coverage provided.",
            data={DataKey.ISSUES_MD.value: "Reasoning required."},
            next_action=NextAction.RESUBMIT_TESTS.value,
        )

    level = _strictness(request)
    thresholds = _THRESHOLDS[level]

    coverage_summary = request.payload.coverage_summary_md or ""
    coverage = _parse_coverage(coverage_summary)
    lines = coverage.get("lines", 0)
    branches = coverage.get("branches", 0)

    if lines < thresholds["lines"] or branches < thresholds["branches"]:
        issues = (
            f"Coverage insufficient for {level} mode (lines: {lines}% / required {thresholds['lines']}%, "
            f"branches: {branches}% / required {thresholds['branches']}%)."
        )
        md = f"{Heading.TESTS_REJECTED.value}{NEWLINE}{issues}"
        return build_response(
            tag=EyeTag.MANGEKYO_REVIEW_TESTS,
            ok=False,
            code=StatusCode.E_TESTS_INSUFFICIENT,
            md=md,
            data={
                DataKey.ISSUES_MD.value: issues,
                "mangekyo_strictness": level,
            },
            next_action=NextAction.RESUBMIT_TESTS.value,
        )

    checklist = f"{Heading.TEST_CHECKLIST.value}{NEWLINE}- Coverage summary provided\n- Reasoning supplied\n- Strictness: {level.title()}"
    data = {
        DataKey.CHECKLIST_MD.value: checklist,
        DataKey.ISSUES_MD.value: "",
        "mangekyo_strictness": level,
    }
    md = f"{Heading.TEST_GATE.value}{NEWLINE}Test coverage meets expectations."
    return build_response(
        tag=EyeTag.MANGEKYO_REVIEW_TESTS,
        ok=True,
        code=StatusCode.OK_TESTS_APPROVED,
        md=md,
        data=data,
        next_action=NextAction.GO_TO_DOCS.value,
    )


__all__ = ["review_tests", "review_tests_async"]
