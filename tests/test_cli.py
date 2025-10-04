import json
import time

import pytest
from typer.testing import CliRunner

from third_eye import db
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


def _reset_keys() -> None:
    if db._USE_POSTGRES:
        pytest.skip("CLI key lifecycle tests use SQLite fallback")
    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute("DELETE FROM api_keys")


def test_cli_api_key_lifecycle(tmp_path):
    _reset_keys()
    runner = CliRunner()

    # Create key
    result = runner.invoke(app, [
        "keys",
        "create",
        "cli-key",
        "--role",
        "operator",
        "--tenant",
        "cli",
        "--ttl-seconds",
        "120",
        "--limits-json",
        json.dumps({"rate": 2}),
    ])
    assert result.exit_code == 0
    created = json.loads(result.stdout)
    secret1 = created["secret"]

    info = runner.invoke(app, ["keys", "info", "cli-key"])
    assert info.exit_code == 0
    record = json.loads(info.stdout)
    assert record["role"] == "operator"
    assert record["limits"]["rate"] == 2

    # Rotate key
    rotate = runner.invoke(app, ["keys", "rotate", "cli-key"])
    assert rotate.exit_code == 0
    secret2 = json.loads(rotate.stdout)["secret"]
    assert secret1 != secret2

    # Ensure old secret rejected
    lookup_old = runner.invoke(app, ["keys", "info", "cli-key", "--secret", secret1])
    assert lookup_old.exit_code != 0

    # Revoke key
    revoke = runner.invoke(app, ["keys", "revoke", "cli-key"])
    assert revoke.exit_code == 0
    revoked = json.loads(revoke.stdout)
    assert revoked["revoked"] is True

    info_after = runner.invoke(app, ["keys", "info", "cli-key"])
    assert info_after.exit_code == 0
    final_record = json.loads(info_after.stdout)
    assert final_record["revoked_at"] is not None


def test_cli_docs_commands():
    if db._USE_POSTGRES:
        pytest.skip("Document CLI tests rely on SQLite test fixture")

    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute(
            "DELETE FROM docs"
        )
        database.execute(
            """
            INSERT INTO docs (id, session_id, bucket, path, bytes, tags, retained_until, last_accessed_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "doc-1",
                "sess-a",
                "tmp",
                "tmp/doc-1.md",
                128,
                json.dumps(["markdown"]),
                None,
                time.time(),
                time.time() - 10,
            ),
        )

    runner = CliRunner()

    listing = runner.invoke(app, ["docs", "ls"])
    assert listing.exit_code == 0
    payload = json.loads(listing.stdout)
    assert payload["count"] == 1
    assert payload["items"][0]["id"] == "doc-1"

    promote = runner.invoke(app, ["docs", "promote", "doc-1", "--hours", "48"])
    assert promote.exit_code == 0
    promoted = json.loads(promote.stdout)
    assert promoted["bucket"] == "retained"

    purge = runner.invoke(app, ["docs", "purge", "sess-a"])
    assert purge.exit_code == 0
    removed = json.loads(purge.stdout)
    assert removed["removed"] >= 0

    gc_result = runner.invoke(app, ["gc", "--dry-run"])
    assert gc_result.exit_code == 0
    gc_payload = json.loads(gc_result.stdout)
    assert "marked" in gc_payload or "removed" in gc_payload
