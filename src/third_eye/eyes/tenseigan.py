"""Tenseigan eye implementation: validate citations for factual claims."""
from __future__ import annotations

from typing import Any, Dict

from ..constants import EyeTag, PersonaKey, ToolName
from ..examples import EXAMPLE_TENSEIGAN
from ..schemas import EyeResponse, TenseiganRequest
from ._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_TENSEIGAN


def validate_claims(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.TENSEIGAN,
        model=TenseiganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: TenseiganRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.TENSEIGAN,
        tool=ToolName.TENSEIGAN_VALIDATE_CLAIMS,
        persona=PersonaKey.TENSEIGAN,
        payload=payload,
    )


__all__ = ["validate_claims"]
