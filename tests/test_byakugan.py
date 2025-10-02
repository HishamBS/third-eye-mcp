from third_eye.eyes.byakugan import consistency_check


def test_byakugan_requires_reasoning(base_context):
    request = {
        "context": base_context,
        "payload": {"topic": "ml", "draft_md": "Model accuracy improved."},
    }
    result = consistency_check(request)
    assert result["code"] == "E_REASONING_MISSING"


def test_byakugan_passes_clean_draft(base_context):
    request = {
        "context": base_context,
        "payload": {"topic": "ml", "draft_md": "Accuracy improved by 5%."},
        "reasoning_md": "### Reasoning\nCompared with baseline report.",
    }
    result = consistency_check(request)
    assert result["code"] in {"OK_CONSISTENT", "E_CONTRADICTION_DETECTED"}
