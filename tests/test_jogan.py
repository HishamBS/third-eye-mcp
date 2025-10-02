from third_eye.eyes.jogan import confirm_intent


def test_jogan_requires_sections(base_context):
    request = {
        "context": base_context,
        "payload": {
            "refined_prompt_md": "ROLE: Analyst",  # missing sections
            "estimated_tokens": 50,
        },
    }
    result = confirm_intent(request)
    assert result["code"] == "E_INTENT_UNCONFIRMED"
    assert "re-run" in result["next"].lower()


def test_jogan_confirms_valid_prompt(base_context):
    prompt = """### Optimized Prompt
ROLE: Analyst
TASK: Summarize quarterly performance
CONTEXT:
- Audience: executives
REQUIREMENTS:
- Cite sources
OUTPUT:
- 300-word summary
"""
    request = {
        "context": base_context,
        "payload": {
            "refined_prompt_md": prompt,
            "estimated_tokens": 1000,
        },
    }
    result = confirm_intent(request)
    assert result["code"] == "OK_INTENT_CONFIRMED"
    assert result["data"]["intent_confirmed"] is True
