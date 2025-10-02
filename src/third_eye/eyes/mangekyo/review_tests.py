"""Mangekyō test review."""
from __future__ import annotations

from typing import Any, Dict

from ...constants import EyeTag, PersonaKey, ToolName
from ...examples import EXAMPLE_TESTS
from ...schemas import EyeResponse, ReviewTestsRequest
from .._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_TESTS


def review_tests(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.MANGEKYO_REVIEW_TESTS,
        model=ReviewTestsRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: ReviewTestsRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.MANGEKYO_REVIEW_TESTS,
        tool=ToolName.MANGEKYO_REVIEW_TESTS,
        persona=PersonaKey.MANGEKYO,
        payload=payload,
    )


__all__ = ["review_tests"]
