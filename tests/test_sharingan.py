from third_eye.constants import NextAction
from third_eye.eyes.sharingan import clarify


def test_sharingan_requires_clarification_for_vague_prompt(base_context):
    request = {
        "context": base_context,
        "payload": {"prompt": "Do something cool", "lang": "en"},
    }
    result = clarify(request)

    assert result["tag"] == "[EYE/SHARINGAN]"
    assert result["code"] == "E_NEEDS_CLARIFICATION"
    assert result["next"] == NextAction.ASK_CLARIFICATIONS.value

    data = result["data"]
    assert data["ambiguous"] is True
    assert data["is_code_related"] is False
    assert data["x"] >= 2
    assert data["reasoning_md"].startswith("### Reasoning")
    assert data["questions_md"].startswith("### Clarifying Questions")


def test_sharingan_routes_code_branch(base_context):
    prompt = "Fix the header padding on mobile in Next.js components. Include CSS diff and tests."
    request = {
        "context": base_context,
        "payload": {"prompt": prompt, "lang": "en"},
    }
    result = clarify(request)

    assert result["code"] == "OK_NO_CLARIFICATION_NEEDED"
    assert result["next"] == NextAction.FOLLOW_CODE_BRANCH.value

    data = result["data"]
    assert data["ambiguous"] is False
    assert data["is_code_related"] is True
    assert data["reasoning_md"].startswith("### Reasoning")
    assert "Code" in result["md"]


def test_sharingan_routes_text_branch(base_context):
    prompt = "Write a market analysis on e-bikes with sources."
    request = {
        "context": base_context,
        "payload": {"prompt": prompt, "lang": "en"},
    }
    result = clarify(request)

    assert result["code"] == "OK_NO_CLARIFICATION_NEEDED"
    assert result["next"] == NextAction.FOLLOW_TEXT_BRANCH.value

    data = result["data"]
    assert data["ambiguous"] is False
    assert data["is_code_related"] is False


def test_sharingan_ambiguous_but_code_lean(base_context):
    prompt = "Improve performance for the dashboard."
    request = {
        "context": base_context,
        "payload": {"prompt": prompt, "lang": "en"},
    }
    result = clarify(request)

    assert result["code"] == "E_NEEDS_CLARIFICATION"
    assert result["next"] == NextAction.ASK_CLARIFICATIONS.value

    data = result["data"]
    assert data["ambiguous"] is True
    assert data["is_code_related"] is True
    assert "improve" in data["reasoning_md"].lower()


def test_sharingan_invalid_payload(base_context):
    request = {"context": base_context, "payload": {}}
    result = clarify(request)
    assert result["code"] == "E_BAD_PAYLOAD_SCHEMA"
    assert "Re-send the request" in result["next"]
