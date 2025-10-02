import json

from typer.testing import CliRunner

from third_eye.cli import app


def test_cli_sharingan_roundtrip(base_context):
    runner = CliRunner()
    request = {
        "context": base_context,
        "payload": {"prompt": "Write something", "lang": "en"},
    }
    result = runner.invoke(app, ["sharingan", "--request", json.dumps(request)])
    assert result.exit_code == 0
    response = json.loads(result.stdout)
    assert response["tag"] == "[EYE/SHARINGAN]"


def test_cli_plan_review_requires_reasoning(base_context):
    runner = CliRunner()
    request = {
        "context": base_context,
        "payload": {"submitted_plan_md": "### Plan"},
    }
    result = runner.invoke(app, ["plan-review", "--request", json.dumps(request)])
    assert result.exit_code == 0
    response = json.loads(result.stdout)
    assert response["code"] == "E_REASONING_MISSING"
