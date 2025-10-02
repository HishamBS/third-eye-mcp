"""Byakugan eye implementation: consistency checks."""
from __future__ import annotations

from typing import Any, Dict

from ..constants import EyeTag, PersonaKey, ToolName
from ..examples import EXAMPLE_BYAKUGAN
from ..schemas import ByakuganRequest, EyeResponse
from ._shared import build_llm_response, execute_eye

_EXAMPLE_REQUEST = EXAMPLE_BYAKUGAN


def consistency_check(raw: Dict[str, Any]) -> Dict[str, Any]:
    return execute_eye(
        tag=EyeTag.BYAKUGAN,
        model=ByakuganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def _handle(request: ByakuganRequest) -> EyeResponse:
    payload = request.model_dump(mode="json")
    return build_llm_response(
        tag=EyeTag.BYAKUGAN,
        tool=ToolName.BYAKUGAN_CONSISTENCY_CHECK,
        persona=PersonaKey.BYAKUGAN,
        payload=payload,
    )


__all__ = ["consistency_check"]
