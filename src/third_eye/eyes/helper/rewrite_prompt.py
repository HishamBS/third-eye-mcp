"""Prompt Helper implementation."""
from __future__ import annotations

from typing import Any, Dict

from ...constants import EyeTag, PersonaKey, ToolName
from ...examples import EXAMPLE_PROMPT_HELPER
from ...schemas import EyeResponse, PromptHelperRequest
from .._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_PROMPT_HELPER


def rewrite_prompt(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.PROMPT_HELPER,
        model=PromptHelperRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: PromptHelperRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.PROMPT_HELPER,
        tool=ToolName.PROMPT_HELPER_REWRITE,
        persona=PersonaKey.PROMPT_HELPER,
        payload=payload,
    )


__all__ = ["rewrite_prompt"]
