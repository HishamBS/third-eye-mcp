"""Overseer navigator tool providing pipeline guidance."""
from __future__ import annotations

import asyncio
import json
import time
from typing import Any, Dict

from ..constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ..schemas import EyeResponse, NavigatorRequest, RequestContext
from ..examples import (
    EXAMPLE_CONTEXT,
    EXAMPLE_NAVIGATOR,
    EXAMPLE_SHARINGAN,
)
from ._shared import build_response, execute_eye, execute_eye_async

_OVERVIEW_MD = (
    f"{Heading.OVERSEER_INTRO.value}{NEWLINE}"
    "Third Eye MCP is an Overseer. Host agents own all deliverables. This navigator is the required entry point; no other eye will respond until it runs." 
)

_REQUEST_ENVELOPE = {
    "context": {
        "session_id": "sess-<unique>",
        "user_id": "user-<optional>",
        "lang": "auto",
        "budget_tokens": 0,
    },
    "payload": {},
    "reasoning_md": "Required when submitting plans, diffs, tests, docs, or drafts.",
}

_REQUEST_SCHEMA_MD = (
    f"{Heading.REQUEST_ENVELOPE.value}{NEWLINE}"
    "Every tool call uses this JSON wrapper. The MCP bridge populates `context` automatically; clients only need to provide `payload` (and `reasoning_md` when required)."
    f"{NEWLINE}```json\n{json.dumps(_REQUEST_ENVELOPE, indent=2)}\n```"
)

_PIPELINE_MD = NEWLINE.join(
    [
        Heading.OVERSEER_NEXT_STEPS.value,
        "- The MCP bridge auto-populates session context; clients only send payload (and reasoning when required).",
        "- Call `sharingan/clarify` to score ambiguity and gather questions.",
        "- Use `helper/rewrite_prompt` to engineer a ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT brief.",
        "- Run `jogan/confirm_intent` to ensure scope and token budgets are approved.",
        "- Follow the Code branch (Rinnegan + Mangekyō phases) for implementation work.",
        "- Follow the Text branch (Rinnegan -> Tenseigan -> Byakugan) for factual or narrative work.",
        "- Finish with `rinnegan/final_approval` once every gate returns ok=true.",
    ]
)

_CONTRACT = {
    "tools": {
        "overseer/navigator": {
            "purpose": "Explain contract and point to Sharingan.",
            "payload": {"goal": "Optional free-form description"},
        },
        "sharingan/clarify": {
            "payload": {"prompt": "string", "lang": "auto|en|ar"},
        },
        "helper/rewrite_prompt": {
            "payload": {
                "user_prompt": "string",
                "clarification_answers_md": "Markdown list responding to Sharingan questions",
            },
        },
        "jogan/confirm_intent": {
            "payload": {
                "refined_prompt_md": "Markdown from Prompt Helper",
                "estimated_tokens": "int",
            },
        },
        "rinnegan/plan_review": {
            "payload": {"submitted_plan_md": "Markdown plan"},
            "reasoning_md": "Explain plan rationale",
        },
        "mangekyo/review_scaffold": {
            "payload": {
                "files": "[{path, intent, reason}]",
            },
            "reasoning_md": "Explain file coverage",
        },
        "mangekyo/review_impl": {
            "payload": {"diffs_md": "```diff ...```"},
            "reasoning_md": "Explain design choices",
        },
        "mangekyo/review_tests": {
            "payload": {
                "diffs_md": "```diff ...```",
                "coverage_summary_md": "Coverage data",
            },
            "reasoning_md": "Explain coverage strategy",
        },
        "mangekyo/review_docs": {
            "payload": {"diffs_md": "```diff ...```"},
            "reasoning_md": "Explain documentation changes",
        },
        "tenseigan/validate_claims": {
            "payload": {"draft_md": "Markdown draft"},
            "reasoning_md": "Evidence gathering notes",
        },
        "byakugan/consistency_check": {
            "payload": {"topic": "string", "draft_md": "Markdown"},
            "reasoning_md": "Compare against history",
        },
        "rinnegan/final_approval": {
            "payload": {
                "plan_approved": "bool",
                "scaffold_approved": "bool",
                "impl_approved": "bool",
                "tests_approved": "bool",
                "docs_approved": "bool",
                "text_validated": "bool",
                "consistent": "bool",
            },
        },
    },
    "envelope": _REQUEST_ENVELOPE,
    "notes": {
        "reasoning_md": "Mandatory whenever submitting work product.",
        "session_id": "Keep constant so checks can reference history.",
        "budget_tokens": "Set >0 only if you want budgeting enforcement; negative budgets are rejected.",
    },
}

_EXAMPLE_REQUEST: Dict[str, Any] = {
    "payload": {
        "goal": "Generate a quarterly engineering report",
    },
}


async def navigate_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.OVERSEER,
        model=NavigatorRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def navigate(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(navigate_async(raw))
    raise RuntimeError("navigate() cannot be called from an active event loop; use await navigate_async() instead.")


def _handle(request: NavigatorRequest) -> EyeResponse:
    goal = request.payload.goal if request.payload else None
    summary_lines = [_OVERVIEW_MD]
    if goal:
        summary_lines.append(f"Goal noted: `{goal}`. Overseer will guide; host model must produce deliverables.")
    md = NEWLINE.join(summary_lines)
    context = request.context
    if context is None:
        context = RequestContext(
            session_id=f"sess-{int(time.time()*1000):x}",
            user_id=None,
            lang="auto",
            budget_tokens=0,
        )
        request.context = context
    data = {
        DataKey.SUMMARY_MD.value: md,
        DataKey.INSTRUCTIONS_MD.value: _PIPELINE_MD,
        DataKey.SCHEMA_MD.value: _REQUEST_SCHEMA_MD,
        DataKey.EXAMPLE_MD.value: f"```json\n{json.dumps(_EXAMPLE_CLARIFY_CALL, indent=2)}\n```",
        DataKey.CONTRACT_JSON.value: _CONTRACT,
        DataKey.NEXT_ACTION_MD.value: f"{Heading.NEXT_ACTION.value}{NEWLINE}{NextAction.BEGIN_WITH_SHARINGAN.value}",
        "session_context": context.model_dump(),
    }
    return build_response(
        tag=EyeTag.OVERSEER,
        ok=True,
        code=StatusCode.OK_OVERSEER_GUIDE,
        md=md,
        data=data,
        next_action=NextAction.BEGIN_WITH_SHARINGAN.value,
    )


__all__ = ["navigate", "navigate_async"]
_EXAMPLE_CLARIFY_CALL = {
    "payload": EXAMPLE_SHARINGAN["payload"],
}
