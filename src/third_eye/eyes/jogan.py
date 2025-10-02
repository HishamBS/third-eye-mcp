"""Jōgan eye implementation: intent confirmation."""
from __future__ import annotations

from typing import Any, Dict

from ..constants import EyeTag, PersonaKey, ToolName
from ..examples import EXAMPLE_JOGAN
from ..schemas import EyeResponse, JoganRequest
from ._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_JOGAN


def confirm_intent(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.JOGAN,
        model=JoganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: JoganRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.JOGAN,
        tool=ToolName.JOGAN_CONFIRM_INTENT,
        persona=PersonaKey.JOGAN,
        payload=payload,
    )


__all__ = ["confirm_intent"]
