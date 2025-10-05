from __future__ import annotations

import pytest

from third_eye.constants import SCHEMA_ERROR_NEXT_ACTION
from third_eye.eyes import (
    clarify,
    rewrite_prompt,
    confirm_intent,
    plan_requirements,
    plan_review,
    review_scaffold,
    review_impl,
    review_tests,
    review_docs,
    validate_claims,
    consistency_check,
)


@pytest.mark.parametrize(
    "handler, invalid_request",
    [
        (clarify, {"context": {}, "payload": {}}),
        (rewrite_prompt, {"context": {}, "payload": {}}),
        (confirm_intent, {"context": {}, "payload": {}}),
        (plan_requirements, {"context": {}}),
        (plan_review, {"context": {}, "payload": {}}),
        (review_scaffold, {"context": {}, "payload": {}}),
        (review_impl, {"context": {}, "payload": {}}),
        (review_tests, {"context": {}, "payload": {}}),
        (review_docs, {"context": {}, "payload": {}}),
        (validate_claims, {"context": {}, "payload": {}}),
        (consistency_check, {"context": {}, "payload": {}}),
    ],
)
def test_invalid_payloads_return_schema_example(handler, invalid_request):
    result = handler(invalid_request)
    assert result["code"] == "E_BAD_PAYLOAD_SCHEMA"
    assert "```json" in result["md"]
    assert result["next"] == SCHEMA_ERROR_NEXT_ACTION
