from third_eye.eyes.rinnegan import plan_requirements, plan_review


PLAN_MD = """### Plan
1. High-Level Overview
   - Build notification dropdown
2. File Impact Table
   | Path | Action | Reason |
   |---|---|---|
   | src/app.tsx | modify | Render bell icon |
3. Step-by-step Implementation Plan
   1. Add API hook
4. Error Handling & Edge Cases
   - Handle empty state
5. Test Strategy
   - Add unit tests
6. Rollback Plan
   - Toggle feature flag
7. Documentation Updates
   - Update README
"""


def test_plan_requirements_emits_schema(base_context):
    request = {"context": base_context, "payload": {}}
    result = plan_requirements(request)
    assert result["code"] == "OK_SCHEMA_EMITTED"
    assert "Plan Schema" in result["data"]["expected_schema_md"]


def test_plan_review_requires_reasoning(base_context):
    request = {
        "context": base_context,
        "payload": {"submitted_plan_md": PLAN_MD},
        # missing reasoning
    }
    result = plan_review(request)
    assert result["code"] == "E_REASONING_MISSING"


def test_plan_review_success(base_context):
    request = {
        "context": base_context,
        "payload": {"submitted_plan_md": PLAN_MD},
        "reasoning_md": "### Reasoning\nPlan covers all sections.",
    }
    result = plan_review(request)
    assert result["code"] == "OK_PLAN_APPROVED"
    assert result["data"]["approved"] is True
