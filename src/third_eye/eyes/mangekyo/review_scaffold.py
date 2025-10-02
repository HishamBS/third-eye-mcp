"""Mangekyō scaffold review."""
from __future__ import annotations

from typing import Any, Dict

from ...constants import EyeTag, PersonaKey, ToolName
from ...examples import EXAMPLE_SCAFFOLD
from ...schemas import EyeResponse, ReviewScaffoldRequest
from .._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_SCAFFOLD


def review_scaffold(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
        model=ReviewScaffoldRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: ReviewScaffoldRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
        tool=ToolName.MANGEKYO_REVIEW_SCAFFOLD,
        persona=PersonaKey.MANGEKYO,
        payload=payload,
    )


__all__ = ["review_scaffold"]
