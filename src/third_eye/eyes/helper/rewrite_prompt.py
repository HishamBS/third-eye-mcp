"""Prompt Helper implementation."""
from __future__ import annotations

import asyncio
import textwrap
from typing import Any, Dict

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ...examples import EXAMPLE_PROMPT_HELPER
from ...schemas import EyeResponse, PromptHelperRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_PROMPT_HELPER


async def rewrite_prompt_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.PROMPT_HELPER,
        model=PromptHelperRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def rewrite_prompt(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(rewrite_prompt_async(raw))
    raise RuntimeError(
        "rewrite_prompt() cannot be called from an active event loop; use await rewrite_prompt_async() instead."
    )


def _sanitize_lines(markdown: str) -> list[str]:
    return [line.strip("- ") for line in markdown.splitlines() if line.strip()]


def _build_prompt_md(user_prompt: str, clarifications_md: str) -> str:
    clarifications = _sanitize_lines(clarifications_md)
    if clarifications:
        context_section = NEWLINE.join(f"- {line}" for line in clarifications)
    else:
        context_section = "- No additional clarifications supplied."

    optimized = textwrap.dedent(
        f"""\
        ### Optimized Prompt
        ROLE: Host analyst acting on behalf of the requester
        TASK: {user_prompt.strip()}
        CONTEXT:
        {context_section}
        REQUIREMENTS:
        - Follow the clarified constraints and cite sources when appropriate.
        OUTPUT:
        - Deliverable that satisfies the clarified intent with actionable detail.
        """
    ).strip()
    return optimized


def _handle(request: PromptHelperRequest) -> EyeResponse:
    user_prompt = request.payload.user_prompt.strip()
    clarifications_md = request.payload.clarification_answers_md.strip()

    prompt_md = _build_prompt_md(user_prompt, clarifications_md)
    data = {
        DataKey.PROMPT_MD.value: prompt_md,
        DataKey.NEXT_ACTION_MD.value: f"{Heading.NEXT_ACTION.value}{NEWLINE}{NextAction.SEND_TO_JOGAN.value}",
    }
    md = f"{Heading.PROMPT_READY.value}{NEWLINE}Prompt ready for confirmation."
    return build_response(
        tag=EyeTag.PROMPT_HELPER,
        ok=True,
        code=StatusCode.OK_PROMPT_READY,
        md=md,
        data=data,
        next_action=NextAction.SEND_TO_JOGAN.value,
    )


__all__ = ["rewrite_prompt", "rewrite_prompt_async"]
