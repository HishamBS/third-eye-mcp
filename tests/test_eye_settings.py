import asyncio

import pytest

from third_eye.eyes.sharingan import clarify
from third_eye.eyes.tenseigan import validate_claims_async
from third_eye.eyes.rinnegan.plan_review import plan_review
from third_eye.eyes.byakugan import consistency_check
from third_eye.eyes.mangekyo.review_tests import review_tests
from third_eye.constants import StatusCode


def _context(settings):
    return {
        "session_id": "sess-test",
        "user_id": "user",
        "tenant": "cli",
        "lang": "en",
        "budget_tokens": 0,
        "request_id": None,
        "settings": settings,
    }


def test_sharingan_respects_threshold():
    prompt = "Improve the dashboard"  # ambiguous prompt
    context = _context({"ambiguity_threshold": 0.95})
    response = clarify({"context": context, "payload": {"prompt": prompt, "lang": "en"}})
    assert response["code"] == StatusCode.OK_NO_CLARIFICATION_NEEDED.value


def test_plan_review_optional_rollback():
    plan_md = """
    ## High-Level Overview
    Done
    ## File Impact Table
    | Path | Action | Reason |
    |---|---|---|
    | app.py | modify | update |
    ## Step-by-step Implementation Plan
    Steps
    ## Error Handling & Edge Cases
    Cases
    ## Test Strategy
    Tests
    ## Documentation Updates
    Docs
    """
    context_required = _context({"require_rollback": True})
    reject = plan_review(
        {
            "context": context_required,
            "payload": {"submitted_plan_md": plan_md},
            "reasoning_md": "Validated",
        }
    )
    assert reject["code"] == StatusCode.E_PLAN_INCOMPLETE.value

    context_optional = _context({"require_rollback": False})
    approve = plan_review(
        {
            "context": context_optional,
            "payload": {"submitted_plan_md": plan_md},
            "reasoning_md": "Validated",
        }
    )
    assert approve["code"] == StatusCode.OK_PLAN_APPROVED.value


@pytest.mark.asyncio
async def test_tenseigan_citation_cutoff():
    draft_md = """
    ### Claims
    - Statement

    ### Citations
    | Claim | Source | Confidence |
    |---|---|---|
    | Statement | https://example.com | 0.60 |
    """
    context_strict = _context({"citation_cutoff": 0.8})
    payload = {
        "context": context_strict,
        "payload": {
            "draft_md": draft_md,
            "citations": [
                {"statement": "Statement", "citation": "https://example.com", "confidence": 0.60}
            ],
        },
        "reasoning_md": "Verified",
    }
    result = await validate_claims_async(payload)
    assert result["code"] == StatusCode.E_CITATIONS_MISSING.value

    context_relaxed = _context({"citation_cutoff": 0.5})
    payload["context"] = context_relaxed
    result_ok = await validate_claims_async(payload)
    assert result_ok["code"] == StatusCode.OK_TEXT_VALIDATED.value


def test_byakugan_tolerance():
    draft_md = "There is no change expected. TODO: confirm stats."
    context_strict = _context({"consistency_tolerance": 0.9})
    response = consistency_check({"context": context_strict, "payload": {"draft_md": draft_md, "topic": "metrics"}, "reasoning_md": "Reviewed"})
    assert response["code"] == StatusCode.E_CONTRADICTION_DETECTED.value

    context_lenient = _context({"consistency_tolerance": 0.4})
    response_lenient = consistency_check({"context": context_lenient, "payload": {"draft_md": draft_md, "topic": "metrics"}, "reasoning_md": "Reviewed"})
    assert response_lenient["code"] == StatusCode.OK_CONSISTENT.value


def test_mangekyo_tests_strictness():
    coverage_summary = "Lines: 78%\nBranches: 68%"
    base_payload = {
        "context": _context({"mangekyo": "normal"}),
        "payload": {
            "diffs_md": "```diff\n+ add test\n- remove none\n```",
            "coverage_summary_md": coverage_summary,
        },
        "reasoning_md": "Tests cover major flows",
    }
    normal = review_tests(base_payload)
    assert normal["code"] == StatusCode.OK_TESTS_APPROVED.value
    assert normal["data"].get("mangekyo_strictness") == "normal"

    strict_payload = dict(base_payload)
    strict_payload["context"] = _context({"mangekyo": "strict"})
    strict = review_tests(strict_payload)
    assert strict["code"] == StatusCode.E_TESTS_INSUFFICIENT.value
