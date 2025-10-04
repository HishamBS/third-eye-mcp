import json

import pytest

from third_eye import auth, db


def _reset_tables() -> None:
    if db._USE_POSTGRES:
        pytest.skip("config persistence tests run against SQLite fallback")
    with db.conn() as database:  # type: ignore[attr-defined]
        for table in (
            "persona_prompts",
            "provider_configs",
            "feature_flags",
            "config_change_log",
            "api_keys",
            "environment_settings",
        ):
            database.execute(f"DELETE FROM {table}")
        defaults_cfg, guardrails_cfg = db._environment_defaults_from_config()  # type: ignore[attr-defined]
        database.execute(
            """
            INSERT OR REPLACE INTO environment_settings (id, defaults_json, guardrails_json, updated_at, updated_by)
            VALUES (1, ?, ?, strftime('%s','now'), 'bootstrap')
            """,
            (
                json.dumps(defaults_cfg, ensure_ascii=False),
                json.dumps(guardrails_cfg, ensure_ascii=False),
            ),
        )


def test_persona_prompt_stage_and_publish():
    _reset_tables()

    prompt_id = db.stage_persona_prompt(
        persona="sharingan",
        content_md="### Persona\nPrompt body",
        version="1.0.0",
        metadata={"source": "unit-test"},
        author="tester",
    )

    versions = db.list_persona_versions("sharingan")
    assert len(versions) == 1
    assert versions[0]["staged"] is True
    assert db.get_active_persona_prompt("sharingan") is None

    db.publish_persona_prompt(prompt_id=prompt_id, actor="tester")

    active = db.get_active_persona_prompt("sharingan")
    assert active is not None
    assert active["persona"] == "sharingan"
    assert active["metadata"]["source"] == "unit-test"
    assert active["supersedes_id"] is None

    changes = db.list_config_changes("persona_prompt", limit=5)
    assert len(changes) == 2  # stage + publish
    assert {entry["action"] for entry in changes} == {"stage", "publish"}


def test_persona_prompt_supersedes_tracking():
    _reset_tables()

    first = db.stage_persona_prompt(persona="helper", content_md="v1")
    db.publish_persona_prompt(prompt_id=first)

    second = db.stage_persona_prompt(persona="helper", content_md="v2")
    db.publish_persona_prompt(prompt_id=second)

    active = db.get_active_persona_prompt("helper")
    assert active is not None and active["id"] == second
    assert active["supersedes_id"] == first


def test_provider_config_stage_and_publish():
    _reset_tables()

    config_id = db.stage_provider_config(
        provider="groq",
        config={
            "model": "meta-llama/llama-4",
            "auth": {"api_key": "super-secret"},
        },
        version="2024-09-01",
        author="ops",
    )
    db.publish_provider_config(config_id=config_id, actor="ops")

    active = db.get_active_provider_config("groq")
    assert active is not None
    assert active["config"]["auth"] == {"api_key": "***"}

    with_secrets = db.get_active_provider_config("groq", include_secrets=True)
    assert with_secrets is not None
    assert with_secrets["config"]["auth"]["api_key"] == "super-secret"
    assert with_secrets["secrets_checksum"] is not None

    with db.conn() as database:  # type: ignore[attr-defined]
        stored = database.execute(
            "SELECT secrets_ciphertext FROM provider_configs WHERE id = ?",
            (config_id,),
        ).fetchone()
    assert stored and stored[0] is not None

    changes = db.list_config_changes("provider_config", limit=5)
    assert len(changes) == 2
    assert any(entry["diff"].get("secrets_checksum") for entry in changes)


def test_feature_flag_stage_and_activate():
    _reset_tables()

    flag_id = db.stage_feature_flag(
        flag_key="rate_limits",
        environment="prod",
        enabled=True,
        description="Global rate limiting",
        metadata={"rps": 5},
        author="sre",
    )

    db.activate_feature_flag(flag_id=flag_id, actor="sre")

    flag = db.get_feature_flag("rate_limits", "prod")
    assert flag is not None
    assert flag["active"] is True
    assert flag["enabled"] is True
    assert flag["metadata"]["rps"] == 5

    changes = db.list_config_changes("feature_flag", limit=5)
    assert len(changes) == 2


def test_api_key_rotation_metadata():
    _reset_tables()

    key_id = "key-1"
    first_secret = "initial-secret"
    auth.create_api_key(key_id=key_id, raw_secret=first_secret)

    record = db.fetch_api_key(hashed_secret=auth.hash_api_key(first_secret))
    assert record is not None
    assert record["rotated_at"] is not None

    new_secret = "rotated-secret"
    auth.create_api_key(key_id=key_id, raw_secret=new_secret)

    rotated = db.fetch_api_key(hashed_secret=auth.hash_api_key(new_secret))
    assert rotated is not None
    assert rotated["rotated_at"] >= record["rotated_at"]
    assert db.fetch_api_key(hashed_secret=auth.hash_api_key(first_secret)) is None
