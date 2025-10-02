from third_eye.eyes.mangekyo import review_docs, review_impl, review_scaffold, review_tests
from third_eye.eyes.rinnegan import final_approval
from third_eye.eyes.tenseigan import validate_claims
from third_eye.eyes.byakugan import consistency_check


def test_code_pipeline_enforces_sequence(base_context):
    context = base_context

    # Scaffold approval
    scaffold_fail = review_scaffold(
        {
            "context": context,
            "payload": {
                "files": [{"path": "src/app.tsx", "intent": "modify", "reason": "Short"}],
            },
            "reasoning_md": " ",
        }
    )
    assert scaffold_fail["code"] == "E_REASONING_MISSING"

    scaffold_ok = review_scaffold(
        {
            "context": context,
            "payload": {
                "files": [
                    {"path": "src/app.tsx", "intent": "modify", "reason": "Add bell icon for alerts"},
                ],
            },
            "reasoning_md": "### Reasoning\nCovers UI entry point.",
        }
    )
    assert scaffold_ok["code"] == "OK_SCAFFOLD_APPROVED"

    impl_ok = review_impl(
        {
            "context": context,
            "payload": {"diffs_md": "```diff\n+ const bell = true\n```"},
            "reasoning_md": "### Reasoning\nAdded new component.",
        }
    )
    assert impl_ok["code"] == "OK_IMPL_APPROVED"

    tests_ok = review_tests(
        {
            "context": context,
            "payload": {
                "diffs_md": "```diff\n+ add tests\n```",
                "coverage_summary_md": "lines: 92%\nbranches: 80%",
            },
            "reasoning_md": "### Reasoning\nCoverage protects regression.",
        }
    )
    assert tests_ok["code"] == "OK_TESTS_APPROVED"

    docs_fail = review_docs(
        {
            "context": context,
            "payload": {"diffs_md": "```diff\n+ Add helper notes\n```"},
            "reasoning_md": "### Reasoning\nDocumented feature.",
        }
    )
    assert docs_fail["code"] == "E_DOCS_MISSING"

    docs_ok = review_docs(
        {
            "context": context,
            "payload": {"diffs_md": "```diff\n+ Update README with notification section\n```"},
            "reasoning_md": "### Reasoning\nDocumented README updates.",
        }
    )
    assert docs_ok["code"] == "OK_DOCS_APPROVED"

    final_blocked = final_approval(
        {
            "context": context,
            "payload": {
                "plan_approved": True,
                "scaffold_approved": True,
                "impl_approved": True,
                "tests_approved": True,
                "docs_approved": False,
                "text_validated": True,
                "consistent": True,
            },
        }
    )
    assert final_blocked["code"] == "E_PHASES_INCOMPLETE"


def test_text_pipeline_requires_citations_and_consistency(base_context):
    context = base_context

    draft = """### Draft
- Revenue grew 15%.
"""
    citations_missing = validate_claims(
        {
            "context": context,
            "payload": {"draft_md": draft},
            "reasoning_md": "### Reasoning\nReviewed quarterly report.",
        }
    )
    assert citations_missing["code"] == "E_CITATIONS_MISSING"

    draft_with_citations = """### Draft
- Revenue grew 15%.

### Citations
| Claim | Source | Confidence |
|---|---|---|
| Revenue grew 15%. | https://example.com/report | 0.9 |
"""
    validated = validate_claims(
        {
            "context": context,
            "payload": {"draft_md": draft_with_citations},
            "reasoning_md": "### Reasoning\nReviewed quarterly report.",
        }
    )
    assert validated["code"] == "OK_TEXT_VALIDATED"

    inconsistent = consistency_check(
        {
            "context": context,
            "payload": {
                "topic": "revenue",
                "draft_md": "Revenue grew 15% and there were no TODO items left.",
            },
            "reasoning_md": "### Reasoning\nCompared with archived report.",
        }
    )
    assert inconsistent["code"] == "E_CONTRADICTION_DETECTED"

    consistent = consistency_check(
        {
            "context": context,
            "payload": {
                "topic": "revenue",
                "draft_md": "Revenue grew 15% with solid customer retention.",
            },
            "reasoning_md": "### Reasoning\nCompared with archived report.",
        }
    )
    assert consistent["code"] == "OK_CONSISTENT"

    final_ready = final_approval(
        {
            "context": context,
            "payload": {
                "plan_approved": True,
                "scaffold_approved": True,
                "impl_approved": True,
                "tests_approved": True,
                "docs_approved": True,
                "text_validated": True,
                "consistent": True,
            },
        }
    )
    assert final_ready["code"] == "OK_ALL_APPROVED"
