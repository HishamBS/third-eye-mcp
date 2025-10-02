"""Mangekyō implementation diff review."""
from __future__ import annotations

from typing import Any, Dict

from ...constants import EyeTag, PersonaKey, ToolName
from ...examples import EXAMPLE_IMPL
from ...schemas import EyeResponse, ReviewImplRequest
from .._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_IMPL


def review_impl(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.MANGEKYO_REVIEW_IMPL,
        model=ReviewImplRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: ReviewImplRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.MANGEKYO_REVIEW_IMPL,
        tool=ToolName.MANGEKYO_REVIEW_IMPL,
        persona=PersonaKey.MANGEKYO,
        payload=payload,
    )


__all__ = ["review_impl"]
