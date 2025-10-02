from third_eye.eyes.tenseigan import validate_claims


def test_tenseigan_reasoning_required(base_context):
    request = {
        "context": base_context,
        "payload": {
            "draft_md": "### Draft\n- Factual statement.\n\n### Citations\n| Claim | Source | Confidence |\n|---|---|---|\n| Factual statement. | https://example.com | 0.9 |",
        },
    }
    result = validate_claims(request)
    assert result["code"] == "E_REASONING_MISSING"
