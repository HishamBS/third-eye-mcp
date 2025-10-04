"""Sharingan eye implementation: ambiguity radar and classifier."""
from __future__ import annotations

import math
import re
from typing import Any, Dict, Iterable, List, Sequence

from ..constants import (
    AMBIGUITY_LENGTH_THRESHOLD,
    AMBIGUITY_SCORE_THRESHOLD,
    AMBIGUITY_UNSPECIFIED_WORDS,
    AMBIGUITY_VAGUE_WORDS,
    AMBIGUITY_VERB_PATTERN,
    CLARIFICATION_MAX_COUNT,
    CLARIFICATION_MIN_COUNT,
    CLARIFICATION_MULTIPLIER,
    CLARIFYING_QUESTION_BANK,
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    SHARINGAN_AMBIGUITY_SUFFIX,
    SHARINGAN_CODE_ACTION_KEYWORDS,
    SHARINGAN_CODE_ARTIFACT_KEYWORDS,
    SHARINGAN_CODE_EXTENSIONS,
    SHARINGAN_CODE_FENCE_PREFIXES,
    SHARINGAN_CODE_TECH_KEYWORDS,
    SHARINGAN_CODE_TOOLING_KEYWORDS,
    SHARINGAN_STRONG_CODE_ACTION_KEYWORDS,
    SHARINGAN_POLICY_TEMPLATE,
    SHARINGAN_READY_SUFFIX,
    StatusCode,
)
from ..examples import EXAMPLE_SHARINGAN
from ..schemas import EyeResponse, SharinganRequest
import asyncio

from ._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_SHARINGAN


async def clarify_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.SHARINGAN,
        model=SharinganRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def clarify(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(clarify_async(raw))
    raise RuntimeError("clarify() cannot be called from an active event loop; use await clarify_async() instead.")


_TOKEN_PATTERN = re.compile(r"[a-z0-9_./+-]+")
_VERB_PATTERN = re.compile(AMBIGUITY_VERB_PATTERN, flags=re.IGNORECASE)
_IMPERATIVE_HINTS = {
    "write",
    "summarize",
    "explain",
    "create",
    "draft",
    "analyze",
    "plan",
    "design",
    "fix",
    "build",
    "generate",
    "compare",
    "investigate",
    "update",
    "improve",
}


def _normalize_tokens(text: str) -> set[str]:
    return {token for token in _TOKEN_PATTERN.findall(text.lower()) if token}


def _ambiguity_score(prompt: str, threshold: float = AMBIGUITY_SCORE_THRESHOLD) -> tuple[float, bool, int]:
    stripped = prompt.strip()
    raw_tokens = stripped.split()
    tokens = [token.strip(".,:;?!") for token in raw_tokens if token.strip(".,:;?!")]
    token_count = len(tokens)

    base = 0.0
    if token_count < 8:
        base += 0.4
    elif token_count < 15:
        base += 0.25
    elif token_count < AMBIGUITY_LENGTH_THRESHOLD:
        base += 0.1

    question_marks = stripped.count("?")
    if question_marks == 0:
        base += 0.05
    elif question_marks == 1:
        base += 0.02

    vague_hits = sum(1 for token in tokens if token.lower() in AMBIGUITY_VAGUE_WORDS)
    unspecified_hits = sum(1 for token in tokens if token.lower() in AMBIGUITY_UNSPECIFIED_WORDS)
    base += 0.12 * vague_hits
    base += 0.1 * unspecified_hits

    verb_count = len([token for token in tokens if _VERB_PATTERN.match(token)])
    verb_count += sum(1 for token in tokens if token.lower() in _IMPERATIVE_HINTS)
    if verb_count == 0:
        base += 0.1
    score = max(0.0, min(1.0, base))
    threshold = max(0.0, min(1.0, threshold))
    ambiguous = score >= threshold
    clarification_target = math.ceil(score * CLARIFICATION_MULTIPLIER)
    x = max(CLARIFICATION_MIN_COUNT, min(CLARIFICATION_MAX_COUNT, clarification_target))
    return round(score, 2), ambiguous, x


def _keyword_matches(prompt_lower: str, tokens: set[str], keywords: Sequence[str]) -> list[str]:
    hits: list[str] = []
    for keyword in keywords:
        needle = keyword.lower()
        if " " in needle or "." in needle:
            if needle in prompt_lower:
                hits.append(keyword)
        elif needle in tokens:
            hits.append(keyword)
    return hits


def _code_extension_matches(prompt_lower: str, extensions: Sequence[str]) -> list[str]:
    hits = []
    for ext in extensions:
        needle = ext.lower()
        if needle in prompt_lower:
            hits.append(ext)
    return hits


def _code_fence_present(prompt: str) -> bool:
    for fence in SHARINGAN_CODE_FENCE_PREFIXES:
        if fence in prompt:
            return True
    return False


def _detect_code_features(prompt: str) -> tuple[bool, List[str]]:
    prompt_lower = prompt.lower()
    tokens = _normalize_tokens(prompt)
    features: list[str] = []

    tooling_hits = _keyword_matches(prompt_lower, tokens, SHARINGAN_CODE_TOOLING_KEYWORDS)
    artifact_hits = _keyword_matches(prompt_lower, tokens, SHARINGAN_CODE_ARTIFACT_KEYWORDS)
    tech_hits = _keyword_matches(prompt_lower, tokens, SHARINGAN_CODE_TECH_KEYWORDS)
    extension_hits = _code_extension_matches(prompt_lower, SHARINGAN_CODE_EXTENSIONS)

    for keyword in tooling_hits:
        features.append(f"Tooling reference '{keyword}'")
    for keyword in artifact_hits:
        features.append(f"Implementation artifact '{keyword}'")
    for keyword in tech_hits:
        features.append(f"Tech keyword '{keyword}'")
    for ext in extension_hits:
        features.append(f"File extension '{ext}'")
    if _code_fence_present(prompt):
        features.append("Code fence detected")

    action_hits = _keyword_matches(prompt_lower, tokens, SHARINGAN_CODE_ACTION_KEYWORDS)
    strong_actions = [
        keyword for keyword in action_hits if keyword.lower() in SHARINGAN_STRONG_CODE_ACTION_KEYWORDS
    ]
    weak_actions = [
        keyword for keyword in action_hits if keyword.lower() not in SHARINGAN_STRONG_CODE_ACTION_KEYWORDS
    ]

    for keyword in strong_actions:
        features.append(f"Action keyword '{keyword}'")

    code_word_present = any(token in {"code", "codes", "coding"} for token in tokens)
    other_indicators = bool(features) or code_word_present
    if other_indicators:
        for keyword in weak_actions:
            features.append(f"Action keyword '{keyword}'")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_features = []
    for feat in features:
        if feat not in seen:
            seen.add(feat)
            unique_features.append(feat)

    is_code_related = bool(unique_features)
    return is_code_related, unique_features


def _build_questions_md(x: int) -> str:
    questions = list(CLARIFYING_QUESTION_BANK[:x])
    # If we ever request more than the bank size, cycle through.
    while len(questions) < x:
        questions.extend(CLARIFYING_QUESTION_BANK[: x - len(questions)])
    bullets = NEWLINE.join(f"- {question}" for question in questions[:x])
    return f"{Heading.CLARIFYING_QUESTIONS.value}{NEWLINE}{bullets}"


def _build_reasoning_md(
    *,
    score: float,
    ambiguous: bool,
    is_code_related: bool,
    code_features: Iterable[str],
) -> str:
    lines = [Heading.REASONING.value]
    lines.append(
        f"- Ambiguity score {score:.2f} (threshold {AMBIGUITY_SCORE_THRESHOLD:.2f})."
    )
    if ambiguous:
        lines.append("- Prompt remains underspecified; clarification required before drafting.")
    if is_code_related:
        for feature in code_features:
            lines.append(f"- Detected {feature}.")
    else:
        lines.append("- No explicit code indicators detected; treating as text/analysis request.")
    return NEWLINE.join(lines)


def _summary_md(*, ambiguous: bool, is_code_related: bool) -> str:
    if ambiguous:
        return f"{Heading.AMBIGUITY.value}{NEWLINE}{SHARINGAN_AMBIGUITY_SUFFIX}"
    classification = "Code-related task detected." if is_code_related else "Non-code request detected."
    return f"{Heading.CLASSIFICATION.value}{NEWLINE}{classification}"


def _next_action(*, ambiguous: bool, is_code_related: bool) -> str:
    if ambiguous:
        return NextAction.ASK_CLARIFICATIONS.value
    return (
        NextAction.FOLLOW_CODE_BRANCH.value
        if is_code_related
        else NextAction.FOLLOW_TEXT_BRANCH.value
    )


def _status_code(ambiguous: bool) -> StatusCode:
    return StatusCode.E_NEEDS_CLARIFICATION if ambiguous else StatusCode.OK_NO_CLARIFICATION_NEEDED


def _resolve_threshold(request: SharinganRequest) -> float:
    context = getattr(request, "context", None)
    settings = getattr(context, "settings", None) if context else None
    candidate = None
    if isinstance(settings, dict):
        candidate = settings.get("ambiguity_threshold")
    elif settings is not None:
        candidate = getattr(settings, "get", lambda *_: None)("ambiguity_threshold")
    if candidate is None:
        return AMBIGUITY_SCORE_THRESHOLD
    try:
        value = float(candidate)
    except (TypeError, ValueError):
        return AMBIGUITY_SCORE_THRESHOLD
    return max(0.0, min(1.0, value))


def _handle(request: SharinganRequest) -> EyeResponse:
    prompt = request.payload.prompt
    threshold = _resolve_threshold(request)
    score, ambiguous, x = _ambiguity_score(prompt, threshold)
    is_code_related, code_features = _detect_code_features(prompt)
    questions_md = _build_questions_md(x)
    reasoning_md = _build_reasoning_md(
        score=score,
        ambiguous=ambiguous,
        is_code_related=is_code_related,
        code_features=code_features,
    )
    data = {
        DataKey.SCORE.value: score,
        DataKey.AMBIGUOUS.value: ambiguous,
        DataKey.X.value: x,
        DataKey.IS_CODE_RELATED.value: is_code_related,
        DataKey.REASONING_MD.value: reasoning_md,
        DataKey.QUESTIONS_MD.value: questions_md,
        DataKey.POLICY_MD.value: SHARINGAN_POLICY_TEMPLATE,
    }
    response = build_response(
        tag=EyeTag.SHARINGAN,
        ok=not ambiguous,
        code=_status_code(ambiguous),
        md=_summary_md(ambiguous=ambiguous, is_code_related=is_code_related),
        data=data,
        next_action=_next_action(ambiguous=ambiguous, is_code_related=is_code_related),
    )
    return response


__all__ = ["clarify", "clarify_async"]
