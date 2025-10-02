from third_eye.eyes.byakugan import consistency_check
from third_eye.eyes.tenseigan import validate_claims


def test_tenseigan_requires_citations(base_context):
    request = {
        "context": base_context,
        "payload": {
            "draft_md": "### Draft\n- Market grew 25% YoY"
        },
        "reasoning_md": "### Reasoning\nCollected analyst reports.",
    }
    result = validate_claims(request)
    assert result["code"] == "E_CITATIONS_MISSING"


def test_tenseigan_validates_claims(base_context):
    draft = """### Draft
- Market grew 25% YoY

### Citations
| Claim | Source | Confidence |
|---|---|---|
| Market grew 25% YoY | https://example.com/report | 0.9 |
"""
    request = {
        "context": base_context,
        "payload": {"draft_md": draft},
        "reasoning_md": "### Reasoning\nVerified investor relations report.",
    }
    result = validate_claims(request)
    assert result["code"] == "OK_TEXT_VALIDATED"


def test_byakugan_detects_contradiction(base_context):
    request = {
        "context": base_context,
        "payload": {
            "topic": "market",
            "draft_md": "Market showed no change this year, but revenue increased 20%.",
        },
        "reasoning_md": "### Reasoning\nCompared with last quarter report.",
    }
    result = consistency_check(request)
    assert result["code"] == "E_CONTRADICTION_DETECTED"
