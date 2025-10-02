"""Shared helpers for Eye implementations."""
from __future__ import annotations

import json
import textwrap
import time
from typing import Any, Callable, Dict, Tuple, Type

from pydantic import ValidationError

from ..constants import (
    BUDGET_EXCEEDED_MESSAGE,
    BUDGET_NEXT_ACTION,
    DataKey,
    EyeTag,
    Heading,
    INTERNAL_ERROR_HEADING,
    INTERNAL_ERROR_NEXT,
    INVALID_PAYLOAD_HEADING,
    INVALID_PAYLOAD_MESSAGE,
    NEWLINE,
    PersonaKey,
    REASONING_DETAILS_CONSISTENCY,
    REASONING_DETAILS_DOCS,
    REASONING_DETAILS_EVIDENCE,
    REASONING_DETAILS_IMPL,
    REASONING_DETAILS_PLAN,
    REASONING_DETAILS_SCAFFOLD,
    REASONING_DETAILS_TESTS,
    REASONING_NEXT_CONSISTENCY,
    REASONING_NEXT_DOCS,
    REASONING_NEXT_EVIDENCE,
    REASONING_NEXT_IMPL,
    REASONING_NEXT_PLAN,
    REASONING_NEXT_SCAFFOLD,
    REASONING_NEXT_TESTS,
    REASONING_REQUIRED_BODY,
    REASONING_REQUIRED_HEADING,
    SCHEMA_ERROR_NEXT_ACTION,
    StatusCode,
    UNKNOWN_STATUS_TEMPLATE,
    ToolName,
)
from ..schemas import EyeResponse, RequestContext, StrictBaseModel
from ._llm import invoke_llm

EyeHandler = Callable[[StrictBaseModel], EyeResponse]


_STATUS_CODES = {code for code in StatusCode}


def build_response(
    *,
    tag: EyeTag,
    ok: bool,
    code: StatusCode,
    md: str,
    data: Dict[str, Any] | None = None,
    next_action: str,
) -> EyeResponse:
    if code not in _STATUS_CODES:
        raise ValueError(UNKNOWN_STATUS_TEMPLATE.format(code=code.value))
    payload = EyeResponse(
        tag=tag.value,
        ok=ok,
        code=code.value,
        md=md,
        data=data or {},
        next=next_action,
    )
    return payload


def reasoning_missing(tag: EyeTag, *, details: str, next_action: str) -> EyeResponse:
    message = f"{REASONING_REQUIRED_HEADING}{NEWLINE}{REASONING_REQUIRED_BODY} {details}".strip()
    return build_response(
        tag=tag,
        ok=False,
        code=StatusCode.E_REASONING_MISSING,
        md=message,
        data={},
        next_action=next_action,
    )


_REASONING_METADATA = {
    EyeTag.RINNEGAN_PLAN_REVIEW: (REASONING_DETAILS_PLAN, REASONING_NEXT_PLAN),
    EyeTag.MANGEKYO_REVIEW_SCAFFOLD: (REASONING_DETAILS_SCAFFOLD, REASONING_NEXT_SCAFFOLD),
    EyeTag.MANGEKYO_REVIEW_IMPL: (REASONING_DETAILS_IMPL, REASONING_NEXT_IMPL),
    EyeTag.MANGEKYO_REVIEW_TESTS: (REASONING_DETAILS_TESTS, REASONING_NEXT_TESTS),
    EyeTag.MANGEKYO_REVIEW_DOCS: (REASONING_DETAILS_DOCS, REASONING_NEXT_DOCS),
    EyeTag.TENSEIGAN: (REASONING_DETAILS_EVIDENCE, REASONING_NEXT_EVIDENCE),
    EyeTag.BYAKUGAN: (REASONING_DETAILS_CONSISTENCY, REASONING_NEXT_CONSISTENCY),
}


def enforce_reasoning(tag: EyeTag, reasoning_md: str | None) -> EyeResponse | None:
    if tag not in _REASONING_METADATA:
        return None
    if reasoning_md and reasoning_md.strip():
        return None
    details, next_action = _REASONING_METADATA[tag]
    return reasoning_missing(tag, details=details, next_action=next_action)


def schema_example_md(example: Dict[str, Any]) -> str:
    body = json.dumps(example, indent=2)
    return textwrap.dedent(
        f"""\
        {INVALID_PAYLOAD_HEADING}
        {INVALID_PAYLOAD_MESSAGE}
        ```json
        {body}
        ```
        """
    ).strip()


def parse_request(
    *,
    model: Type[StrictBaseModel],
    raw: Dict[str, Any],
    tag: EyeTag,
    example: Dict[str, Any],
) -> Tuple[StrictBaseModel | None, EyeResponse | None]:
    try:
        request = model.model_validate(raw)
        return request, None
    except ValidationError as exc:
        md = schema_example_md(example)
        data = {DataKey.ISSUES_MD.value: exc.errors()}
        response = build_response(
            tag=tag,
            ok=False,
            code=StatusCode.E_BAD_PAYLOAD_SCHEMA,
            md=md,
            data=data,
            next_action=SCHEMA_ERROR_NEXT_ACTION,
        )
        return None, response


def budget_guard(context: RequestContext, tag: EyeTag) -> EyeResponse | None:
    if context.budget_tokens == 0:
        return None
    if context.budget_tokens < 0:
        return build_response(
            tag=tag,
            ok=False,
            code=StatusCode.E_BUDGET_EXCEEDED,
            md=BUDGET_EXCEEDED_MESSAGE,
            data={DataKey.BUDGET_TOKENS.value: context.budget_tokens},
            next_action=BUDGET_NEXT_ACTION,
        )
    return None


def execute_eye(
    *,
    tag: EyeTag,
    model: Type[StrictBaseModel],
    handler: EyeHandler,
    raw: Dict[str, Any],
    example: Dict[str, Any],
) -> Dict[str, Any]:
    start = time.perf_counter()
    request, error = parse_request(model=model, raw=raw, tag=tag, example=example)
    if error is not None:
        return error.model_dump()

    assert isinstance(request, StrictBaseModel)
    context = getattr(request, "context", None)
    if isinstance(context, RequestContext):
        reasoning_error = enforce_reasoning(tag, getattr(request, "reasoning_md", None))
        if reasoning_error is not None:
            return reasoning_error.model_dump()
        budget_error = budget_guard(context, tag)
        if budget_error is not None:
            return budget_error.model_dump()

    try:
        response = handler(request)
    except ValueError as exc:
        _ = time.perf_counter() - start
        failure = build_response(
            tag=tag,
            ok=False,
            code=StatusCode.E_INTERNAL_ERROR,
            md=f"{INTERNAL_ERROR_HEADING}{NEWLINE}{exc}",
            data={},
            next_action=INTERNAL_ERROR_NEXT,
        )
        return failure.model_dump()

    _ = time.perf_counter() - start
    return response.model_dump()


__all__ = [
    "build_response",
    "execute_eye",
    "enforce_reasoning",
    "build_llm_response",
]


def build_llm_response(
    *,
    tag: EyeTag,
    tool: ToolName,
    persona: PersonaKey,
    payload: Dict[str, Any],
) -> EyeResponse:
    raw = invoke_llm(tool, persona, payload)
    return build_response(
        tag=tag,
        ok=bool(raw["ok"]),
        code=StatusCode(raw["code"]),
        md=raw["md"],
        data=raw.get("data", {}),
        next_action=raw["next"],
    )
