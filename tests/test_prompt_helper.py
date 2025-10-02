from third_eye.eyes.helper import rewrite_prompt


def test_prompt_helper_emits_prompt(base_context):
    request = {
        "context": base_context,
        "payload": {
            "user_prompt": "Create onboarding checklist",
            "clarification_answers_md": "### Clarification Answers\n1. Audience: internal team",
        },
    }
    result = rewrite_prompt(request)
    assert result["code"] == "OK_PROMPT_READY"
    assert result["data"]["prompt_md"].startswith("### Optimized Prompt")
    assert "Send to Jōgan" in result["next"]
