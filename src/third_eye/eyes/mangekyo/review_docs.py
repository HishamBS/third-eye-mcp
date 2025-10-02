"""Mangekyō documentation review."""
from __future__ import annotations

from typing import Any, Dict

from ...constants import EyeTag, PersonaKey, ToolName
from ...examples import EXAMPLE_DOCS
from ...schemas import EyeResponse, ReviewDocsRequest
from .._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_DOCS


def review_docs(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.MANGEKYO_REVIEW_DOCS,
        model=ReviewDocsRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: ReviewDocsRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.MANGEKYO_REVIEW_DOCS,
        tool=ToolName.MANGEKYO_REVIEW_DOCS,
        persona=PersonaKey.MANGEKYO,
        payload=payload,
    )


__all__ = ["review_docs"]
