from third_eye.eyes.mangekyo import review_docs, review_impl, review_scaffold, review_tests


def _base_context():
    return {
        "session_id": "sess-test",
        "user_id": "user-test",
        "lang": "en",
        "budget_tokens": 0,
    }


def test_review_scaffold_requires_reasoning():
    request = {
        "context": _base_context(),
        "payload": {
            "files": [
                {"path": "src/app.tsx", "intent": "modify", "reason": "Add icon button"}
            ]
        },
    }
    result = review_scaffold(request)
    assert result["code"] == "E_REASONING_MISSING"


def test_review_scaffold_detects_duplicates():
    request = {
        "context": _base_context(),
        "payload": {
            "files": [
                {"path": "src/app.tsx", "intent": "modify", "reason": "Add icon button"},
                {"path": "src/app.tsx", "intent": "modify", "reason": "Duplicate"},
            ]
        },
        "reasoning_md": "### Reasoning\nCovering changes",
    }
    result = review_scaffold(request)
    assert result["code"] == "E_SCAFFOLD_ISSUES"


def test_review_impl_success():
    request = {
        "context": _base_context(),
        "payload": {"diffs_md": "```diff\n+ console.log('ok')\n```"},
        "reasoning_md": "### Reasoning\nDiscuss implementation",
    }
    result = review_impl(request)
    assert result["code"] == "OK_IMPL_APPROVED"


def test_review_tests_requires_coverage():
    request = {
        "context": _base_context(),
        "payload": {
            "diffs_md": "```diff\n+ add tests\n```",
            "coverage_summary_md": "lines: 92%\nbranches: 85%",
        },
        "reasoning_md": "### Reasoning\nAdded regression tests",
    }
    result = review_tests(request)
    assert result["code"] == "OK_TESTS_APPROVED"


def test_review_docs_missing_reference():
    request = {
        "context": _base_context(),
        "payload": {"diffs_md": "```diff\n+ Add changelog entry\n```"},
        "reasoning_md": "### Reasoning\nDocumented feature",
    }
    result = review_docs(request)
    assert result["code"] == "E_DOCS_MISSING"
