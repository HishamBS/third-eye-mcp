from third_eye.eyes.overseer import navigate


def test_overseer_navigator(base_context):
    request = {
        "context": base_context,
        "payload": {"goal": "Draft quarterly report"},
    }
    response = navigate(request)
    assert response["tag"] == "[EYE/OVERSEER]"
    assert response["code"] == "OK_OVERSEER_GUIDE"
    assert "Overseer Navigator" in response["md"]
    assert response["next"] == "Start with sharingan/clarify to evaluate ambiguity."
    data = response["data"]
    assert "sharingan/clarify" in data["instructions_md"]
    assert "Request Envelope" in data["schema_md"]
    assert "prompt" in data["example_md"]
    assert isinstance(data["contract_json"], dict)
