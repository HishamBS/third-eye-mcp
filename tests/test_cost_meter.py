from third_eye.cost_meter import record_cost, get_costs, reset_costs


def test_record_cost_accumulates():
    reset_costs()
    record_cost(session_id="s1", provider="GroqProvider", input_tokens=100, output_tokens=50)
    record_cost(session_id="s1", provider="GroqProvider", input_tokens=0, output_tokens=25)
    costs = get_costs("s1")
    assert "GroqProvider" in costs
    assert costs["GroqProvider"] > 0


def test_record_cost_ignores_zero_tokens():
    reset_costs()
    record_cost(session_id="s2", provider="GroqProvider", input_tokens=0, output_tokens=0)
    assert get_costs("s2") == {}
