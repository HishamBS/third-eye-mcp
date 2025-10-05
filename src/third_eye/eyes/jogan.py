"""Jōgan eye implementation: intent confirmation."""
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
from ..examples import EXAMPLE_JOGAN
from ..schemas import EyeResponse, JoganRequest
from ._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_JOGAN


async def confirm_intent_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.JOGAN,
        model=JoganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def confirm_intent(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(confirm_intent_async(raw))
    raise RuntimeError(
        "confirm_intent() cannot be called from an active event loop; use await confirm_intent_async() instead."
    )


def _missing_sections(markdown: str) -> list[str]:
    sections = ["ROLE:", "TASK:", "CONTEXT:", "REQUIREMENTS:", "OUTPUT:"]
    upper = markdown.upper()
    return [section.strip(":") for section in sections if section not in upper]


def _handle(request: JoganRequest) -> EyeResponse:
    prompt_md = request.payload.refined_prompt_md.strip()
    missing = _missing_sections(prompt_md)
    estimated_tokens = request.payload.estimated_tokens

    data = {
        DataKey.INTENT_CONFIRMED.value: False,
        DataKey.ISSUES_MD.value: "",
    }

    if missing:
        issues = f"Missing sections: {', '.join(missing)}."
        data[DataKey.ISSUES_MD.value] = issues
        md = f"{Heading.INTENT_NOT_CONFIRMED.value}{NEWLINE}{issues}"
        return build_response(
            tag=EyeTag.JOGAN,
            ok=False,
            code=StatusCode.E_INTENT_UNCONFIRMED,
            md=md,
            data=data,
            next_action=NextAction.RERUN_JOGAN.value,
        )

    if estimated_tokens <= 0:
        issues = "Estimated token count must be greater than zero."
        data[DataKey.ISSUES_MD.value] = issues
        md = f"{Heading.INTENT_NOT_CONFIRMED.value}{NEWLINE}{issues}"
        return build_response(
            tag=EyeTag.JOGAN,
            ok=False,
            code=StatusCode.E_INTENT_UNCONFIRMED,
            md=md,
            data=data,
            next_action=NextAction.RERUN_JOGAN.value,
        )

    data[DataKey.INTENT_CONFIRMED.value] = True
    data[DataKey.ISSUES_MD.value] = ""
    md = f"{Heading.INTENT_CONFIRMED.value}{NEWLINE}Prompt structure looks complete."
    return build_response(
        tag=EyeTag.JOGAN,
        ok=True,
        code=StatusCode.OK_INTENT_CONFIRMED,
        md=md,
        data=data,
        next_action=NextAction.CALL_PLAN_REQUIREMENTS.value,
    )


__all__ = ["confirm_intent", "confirm_intent_async"]
