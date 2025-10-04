from typing import Any, Dict, List

from fastapi import HTTPException
from fastapi.testclient import TestClient

from third_eye.api.server import app
from third_eye.constants import StatusCode


async def _noop_async(*args, **kwargs):
    return None


async def _always_true(*args, **kwargs):
    return True


def _patch_server_dependencies(monkeypatch, record: Dict[str, object] | None = None) -> None:
    monkeypatch.setattr("third_eye.api.server.ensure_models_available", _noop_async)
    monkeypatch.setattr("third_eye.api.server.init_db", _noop_async)
    monkeypatch.setattr("third_eye.api.server.shutdown_groq_client", _noop_async)
    monkeypatch.setattr("third_eye.api.server.shutdown_db", _noop_async)
    monkeypatch.setattr("third_eye.api.server.close_redis", _noop_async)
    monkeypatch.setattr("third_eye.api.server.check_db_health", _always_true)
    monkeypatch.setattr("third_eye.api.server.redis_health_check", _always_true)
    monkeypatch.setattr("third_eye.api.server.ensure_bootstrap_admin_async", _noop_async)
    monkeypatch.setattr("third_eye.db._USE_POSTGRES", False)

    policy_record = record or {
        "id": "test",
        "role": "tester",
        "limits": {},
        "tenant": "cli",
        "account_id": None,
    }

    def _validate(key):
        if key is None:
            raise HTTPException(status_code=401, detail="Missing API key")
        if key == "test-key":
            return policy_record
        raise HTTPException(status_code=403, detail="Invalid API key")

    async def _validate_async(key):
        return _validate(key)

    monkeypatch.setattr("third_eye.auth.validate_api_key", _validate)
    monkeypatch.setattr("third_eye.auth.validate_api_key_async", _validate_async)
    monkeypatch.setattr("third_eye.api.server.validate_api_key_async", _validate_async)

    async def _settings_stub(session_id: str):
        return {
            "ambiguity_threshold": 0.35,
            "citation_cutoff": 0.8,
            "consistency_tolerance": 0.85,
            "require_rollback": True,
            "mangekyo": "normal",
        }

    async def _snapshot_stub(session_id: str):
        return {
            "profile": "enterprise",
            "overrides": {},
            "effective": await _settings_stub(session_id),
            "provider": {"mode": "api", "engine": {}},
            "pipeline": {"next_tools": []},
        }

    async def _emit_settings_stub(session_id: str, settings: Dict[str, Any]):
        return None

    monkeypatch.setattr("third_eye.api.server.resolve_effective_settings", _settings_stub)
    monkeypatch.setattr("third_eye.api.server.snapshot_for_session", _snapshot_stub)
    monkeypatch.setattr("third_eye.api.server.emit_settings_event", _emit_settings_stub)
    async def _pipeline_enforce_stub(session_id, tool):
        return None

    async def _pipeline_reset_stub(session_id):
        return None

    async def _pipeline_advance_stub(session_id, tool):
        return None

    async def _get_session_settings_async(session_id: str):
        return {"pipeline": {"next_tools": []}}

    def _get_session_settings(session_id: str):
        return {"pipeline": {"next_tools": []}}

    async def _upsert_session_settings_async(*, session_id: str, data: Dict[str, Any]):
        return None

    monkeypatch.setattr("third_eye.api.server.get_session_settings_async", _get_session_settings_async)
    monkeypatch.setattr("third_eye.api.server.get_session_settings", _get_session_settings)
    monkeypatch.setattr("third_eye.api.server.upsert_session_settings_async", _upsert_session_settings_async)
    monkeypatch.setattr("third_eye.api.server._pipeline_enforce", _pipeline_enforce_stub)
    monkeypatch.setattr("third_eye.api.server._pipeline_reset", _pipeline_reset_stub)
    monkeypatch.setattr("third_eye.api.server._pipeline_advance", _pipeline_advance_stub)
    monkeypatch.setattr("third_eye.api.server._serialize_timestamp", lambda ts: ts)


    def _stub_response(tag: str, code: str) -> Dict[str, object]:
        return {
            "tag": tag,
            "ok": True,
            "code": code,
            "md": "Stub response",
            "data": {},
            "next": "noop",
        }

    async def _rewrite_stub(payload):
        return _stub_response("[EYE/PROMPT_HELPER]", "OK_PROMPT_REWRITTEN")

    async def _intent_stub(payload):
        return _stub_response("[EYE/JOGAN]", "OK_INTENT_CONFIRMED")

    async def _impl_stub(payload):
        return _stub_response("[EYE/MANGEKYO_REVIEW_IMPL]", "OK_IMPL_REVIEWED")

    async def _scaffold_stub(payload):
        return _stub_response("[EYE/MANGEKYO_REVIEW_SCAFFOLD]", "OK_SCAFFOLD_REVIEWED")

    async def _tests_stub(payload):
        return _stub_response("[EYE/MANGEKYO_REVIEW_TESTS]", "OK_TESTS_REVIEWED")

    async def _docs_stub(payload):
        return _stub_response("[EYE/MANGEKYO_REVIEW_DOCS]", "OK_DOCS_REVIEWED")

    async def _tenseigan_stub(payload):
        return _stub_response("[EYE/TENSEIGAN]", StatusCode.OK_TEXT_VALIDATED.value)

    async def _byakugan_stub(payload):
        return _stub_response("[EYE/BYAKUGAN]", StatusCode.OK_CONSISTENT.value)

    monkeypatch.setattr("third_eye.api.server.rewrite_prompt_async", _rewrite_stub)
    monkeypatch.setattr("third_eye.api.server.confirm_intent_async", _intent_stub)
    monkeypatch.setattr("third_eye.api.server.review_impl_async", _impl_stub)
    monkeypatch.setattr("third_eye.api.server.review_scaffold_async", _scaffold_stub)
    monkeypatch.setattr("third_eye.api.server.review_tests_async", _tests_stub)
    monkeypatch.setattr("third_eye.api.server.review_docs_async", _docs_stub)
    monkeypatch.setattr("third_eye.api.server.validate_claims_async", _tenseigan_stub)
    monkeypatch.setattr("third_eye.api.server.consistency_check_async", _byakugan_stub)


_HEADERS = {"X-API-Key": "test-key"}


def test_api_sharingan(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    calls: List[Dict[str, object]] = []

    async def _record_audit(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr("third_eye.db.record_audit_event_async", _record_audit)
    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _record_audit)
    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["tag"] == "[EYE/SHARINGAN]"
    assert calls
    metadata = calls[-1]["metadata"]
    assert metadata["status"] == 200
    assert metadata["tool"] == "sharingan/clarify"
    assert metadata["tenant"] == "cli"
    assert metadata["session_id"] == base_context["session_id"]
    assert metadata["role"] == "tester"


def test_api_overseer(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    with TestClient(app) as client:
        response = client.post(
            "/eyes/overseer/navigator",
            json={"context": base_context, "payload": {"goal": "Ship release"}},
            headers=_HEADERS,
        )
        assert response.status_code == 200
        body = response.json()
        assert body["tag"] == "[EYE/OVERSEER]"
        assert body["code"] == "OK_OVERSEER_GUIDE"
        assert "Overseer Navigator" in body["md"]
        assert body["next"] == "Start with sharingan/clarify to evaluate ambiguity."
        assert "schema_md" in body["data"]


def test_api_requires_key(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Missing API key"


def test_api_audit_failure(monkeypatch, base_context):
    calls: List[Dict[str, object]] = []

    async def _record_audit(**kwargs):
        calls.append(kwargs)

    monkeypatch.setattr("third_eye.db.record_audit_event_async", _record_audit)
    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _record_audit)
    _patch_server_dependencies(monkeypatch)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
        )
        assert response.status_code == 401
    assert calls
    metadata = calls[-1]["metadata"]
    assert metadata["status"] == 401
    assert metadata.get("hashed_key") is None
    assert metadata.get("session_id") is None
    assert metadata.get("role") is None


def test_api_branch_policy(monkeypatch, base_context):
    record = {
        "id": "test",
        "role": "tester",
        "limits": {"branches": ["text"]},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/mangekyo/review_impl",
            json={
                "context": base_context,
                "payload": {"diffs_md": "```diff\n+code\n```"},
                "reasoning_md": "### Reasoning\ntext",
            },
            headers=_HEADERS,
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Branch not permitted"


def test_api_rate_limit(monkeypatch, base_context):
    from third_eye.api import server as api_server

    api_server._RATE_MEMORY.clear()
    record = {
        "id": "rate-key",
        "role": "tester",
        "limits": {"rate": {"per_minute": 1}},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)

    with TestClient(app) as client:
        first = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
        assert first.status_code == 200
        second = client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need more help", "lang": "en"}},
            headers=_HEADERS,
        )
        assert second.status_code == 429
        assert second.json()["detail"] == "Rate limit exceeded"


def test_api_budget_policy(monkeypatch, base_context):
    from third_eye.api import server as api_server

    api_server._BUDGET_MEMORY.clear()
    custom_context = dict(base_context)
    custom_context["budget_tokens"] = 10
    record = {
        "id": "budget-key",
        "role": "tester",
        "limits": {"budget": {"max_per_request": 5}},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": custom_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Request exceeds per-request token budget"


def test_api_tenant_enforced(monkeypatch, base_context):
    wrong_context = dict(base_context)
    wrong_context["tenant"] = "other"
    record = {
        "id": "tenant-key",
        "role": "tester",
        "limits": {},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)

    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": wrong_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
    assert response.status_code == 403
    assert response.json()["detail"] == "Tenant mismatch"


def test_api_admin_cross_tenant(monkeypatch, base_context):
    wrong_context = dict(base_context)
    wrong_context["tenant"] = "other"
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": None,
    }
    _patch_server_dependencies(monkeypatch, record)
    with TestClient(app) as client:
        response = client.post(
            "/eyes/sharingan/clarify",
            json={"context": wrong_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
    assert response.status_code == 200


def test_pipeline_events_flow(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    from decimal import Decimal
    with TestClient(app) as client:
        client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
        async def _fake_events(session_id, limit=200, from_ts=None, to_ts=None):
            return [
                {
                    "event_type": "eye_update",
                    "session_id": base_context["session_id"],
                    "eye": "SHARINGAN",
                    "ok": True,
                    "code": "OK_TEST",
                    "tool_version": "1.0",
                    "md": "ok",
                    "data": {},
                    "created_at": Decimal("1738620384.123"),
                }
            ]

        monkeypatch.setattr("third_eye.api.server.list_pipeline_events_async", _fake_events)
        resp = client.get(
            f"/session/{base_context['session_id']}/events",
            headers=_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["count"] >= 1
        assert any(item["eye"] == "SHARINGAN" for item in body["items"])


def test_sessions_list_filters_by_tenant(monkeypatch):
    record = {
        "id": "tenant-key",
        "role": "tester",
        "limits": {},
        "tenant": "ops",
    }
    _patch_server_dependencies(monkeypatch, record)

    sessions = [
        {
            "session_id": "sess-ops",
            "title": "Ops Session",
            "status": "approved",
            "created_at": "2025-10-03T17:00:00+00:00",
            "last_event_at": "2025-10-03T17:05:00+00:00",
            "tenant": "ops",
            "eye_counts": {"approvals": 3, "rejections": 0},
        },
        {
            "session_id": "sess-other",
            "title": "Other Session",
            "status": "blocked",
            "created_at": "2025-10-02T08:00:00+00:00",
            "last_event_at": "2025-10-02T09:00:00+00:00",
            "tenant": "other",
            "eye_counts": {"approvals": 1, "rejections": 2},
        },
    ]
    async def _list_sessions_async(limit=20):
        return sessions

    monkeypatch.setattr("third_eye.db.get_recent_sessions", lambda limit=20: sessions)
    monkeypatch.setattr("third_eye.api.server.get_recent_sessions", lambda limit=20: sessions)
    monkeypatch.setattr("third_eye.api.server.list_recent_sessions_async", _list_sessions_async)

    with TestClient(app) as client:
        response = client.get("/sessions", headers=_HEADERS)

    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 1
    assert items[0]["session_id"] == "sess-ops"


def test_sessions_list_admin(monkeypatch):
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": None,
    }
    _patch_server_dependencies(monkeypatch, record)
    sessions = [
        {
            "session_id": "sess-one",
            "title": "One",
            "status": "in_progress",
            "created_at": "2025-10-01T10:00:00+00:00",
            "last_event_at": "2025-10-01T11:00:00+00:00",
            "tenant": "ops",
            "eye_counts": {"approvals": 1, "rejections": 0},
        },
        {
            "session_id": "sess-two",
            "title": "Two",
            "status": "blocked",
            "created_at": "2025-10-02T10:00:00+00:00",
            "last_event_at": "2025-10-02T11:00:00+00:00",
            "tenant": "sales",
            "eye_counts": {"approvals": 0, "rejections": 1},
        },
    ]
    async def _list_sessions_async(limit=20):
        return sessions

    monkeypatch.setattr("third_eye.db.get_recent_sessions", lambda limit=20: sessions)
    monkeypatch.setattr("third_eye.api.server.get_recent_sessions", lambda limit=20: sessions)
    monkeypatch.setattr("third_eye.api.server.list_recent_sessions_async", _list_sessions_async)

    with TestClient(app) as client:
        response = client.get("/sessions", headers=_HEADERS)

    assert response.status_code == 200
    assert len(response.json()["items"]) == 2


def test_session_detail_success(monkeypatch):
    record = {
        "id": "tenant-key",
        "role": "tester",
        "limits": {},
        "tenant": "ops",
    }
    _patch_server_dependencies(monkeypatch, record)
    detail = {
        "session_id": "sess-ops",
        "title": "Ops Session",
        "status": "in_progress",
        "created_at": "2025-10-03T17:00:00+00:00",
        "last_event_at": "2025-10-03T17:05:00+00:00",
        "tenant": "ops",
        "eye_counts": {"approvals": 1, "rejections": 0},
        "eyes": [],
        "events": [],
        "settings": {},
    }
    async def _detail_async(session_id: str):
        return detail if session_id == "sess-ops" else None

    monkeypatch.setattr("third_eye.db.get_session_detail", lambda session_id: detail if session_id == "sess-ops" else None)
    monkeypatch.setattr("third_eye.api.server.get_session_detail", lambda session_id: detail if session_id == "sess-ops" else None)
    monkeypatch.setattr("third_eye.api.server.get_session_detail_async", _detail_async)

    with TestClient(app) as client:
        response = client.get("/sessions/sess-ops", headers=_HEADERS)

    assert response.status_code == 200
    assert response.json()["session_id"] == "sess-ops"


def test_session_detail_forbidden(monkeypatch):
    record = {
        "id": "tenant-key",
        "role": "tester",
        "limits": {},
        "tenant": "ops",
    }
    _patch_server_dependencies(monkeypatch, record)
    def _detail(session_id: str):
        return {
            "session_id": session_id,
            "title": "Other Session",
            "status": "in_progress",
            "created_at": None,
            "last_event_at": None,
            "tenant": "sales",
            "eye_counts": {"approvals": 0, "rejections": 0},
            "eyes": [],
            "events": [],
            "settings": {},
        }

    async def _detail_async_forbidden(session_id: str):
        return _detail(session_id)

    monkeypatch.setattr("third_eye.db.get_session_detail", _detail)
    monkeypatch.setattr("third_eye.api.server.get_session_detail", _detail)
    monkeypatch.setattr("third_eye.api.server.get_session_detail_async", _detail_async_forbidden)

    with TestClient(app) as client:
        response = client.get("/sessions/foreign", headers=_HEADERS)

    assert response.status_code == 404


def test_session_detail_not_found(monkeypatch):
    _patch_server_dependencies(monkeypatch)
    async def _detail_async_none(session_id: str):
        return None

    monkeypatch.setattr("third_eye.db.get_session_detail", lambda session_id: None)
    monkeypatch.setattr("third_eye.api.server.get_session_detail", lambda session_id: None)
    monkeypatch.setattr("third_eye.api.server.get_session_detail_async", _detail_async_none)
    with TestClient(app) as client:
        response = client.get("/sessions/unknown", headers=_HEADERS)
    assert response.status_code == 404


def test_clarifications_endpoint(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/clarifications",
            json={"answers_md": "### Answer\n- done", "context": base_context},
            headers=_HEADERS,
        )
        assert resp.status_code == 202
        events = client.get(
            f"/session/{base_context['session_id']}/events?limit=5",
            headers=_HEADERS,
        ).json()["items"]
        assert any(item["type"] == "user_input" for item in events)


def test_resubmit_endpoint(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/resubmit",
            json={"eye": "MANGEKYO_IMPL", "context": base_context, "notes": "ready"},
            headers=_HEADERS,
        )
        assert resp.status_code == 202
        items = client.get(
            f"/session/{base_context['session_id']}/events",
            headers=_HEADERS,
        ).json()["items"]
    assert any(item["type"] == "resubmit_requested" for item in items)


def test_leaderboard_endpoint(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    with TestClient(app) as client:
        # trigger a successful event (ok=True)
        client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )

        # simulate a failure event via custom emission (resubmit)
        client.post(
            f"/session/{base_context['session_id']}/resubmit",
            json={"eye": "SHARINGAN", "context": base_context},
            headers=_HEADERS,
        )

        leaderboard = client.get(
            f"/session/{base_context['session_id']}/leaderboard",
            headers=_HEADERS,
        )
        assert leaderboard.status_code == 200
        data = leaderboard.json()
        assert data["agents"]
        assert data["eyes"]
        agent_entry = next(item for item in data["agents"] if item["agent"])
        assert agent_entry["total"] >= 1


def test_duel_requires_operator(monkeypatch, base_context):
    record = {
        "id": "consumer-key",
        "role": "consumer",
        "limits": {},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/duel",
            json={"agents": ["claude-3", "gpt-4"], "context": base_context},
            headers=_HEADERS,
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Duel mode restricted to operators"


def test_duel_operator_success(monkeypatch, base_context):
    record = {
        "id": "operator-key",
        "role": "operator",
        "limits": {},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/duel",
            json={"agents": ["claude-3", "gpt-4"], "context": base_context, "topic": "release"},
            headers=_HEADERS,
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "scheduled"
        assert len(body["runs"]) == 2
        run_ids = {item["agent"]: item["run_id"] for item in body["runs"]}
        assert set(run_ids) == {"claude-3", "gpt-4"}

        events = client.get(
            f"/session/{base_context['session_id']}/events?limit=5",
            headers=_HEADERS,
        ).json()["items"]
        assert any(evt["type"] == "duel_requested" for evt in events)


def test_revalidate_triggers(monkeypatch, base_context):
    _patch_server_dependencies(monkeypatch)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/revalidate",
            json={
                "context": base_context,
                "draft_md": "### Draft\n- Fact",
                "topic": "general",
            },
            headers=_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "tenseigan" in data and "byakugan" in data


def test_health_endpoints(monkeypatch):
    _patch_server_dependencies(monkeypatch)

    with TestClient(app) as client:
        live = client.get("/health/live")
        assert live.status_code == 200
        assert live.json() == {"status": "alive"}

        ready = client.get("/health/ready")
        assert ready.status_code == 200
        assert ready.json()["status"] == "ready"

    async def _always_false(*args, **kwargs):
        return False

    monkeypatch.setattr("third_eye.api.server.check_db_health", _always_false)
    monkeypatch.setattr("third_eye.api.server.redis_health_check", _always_false)

    with TestClient(app) as client:
        degraded = client.get("/health/ready")
        assert degraded.status_code == 503
        payload = degraded.json()
        assert payload["status"] == "degraded"
        assert payload["database"] is False
        assert payload["redis"] is False


def test_export_requires_admin(monkeypatch, base_context):
    record = {
        "id": "op-key",
        "role": "operator",
        "limits": {},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)
    with TestClient(app) as client:
        resp = client.post(
            f"/session/{base_context['session_id']}/export",
            headers=_HEADERS,
        )
        assert resp.status_code == 403
        assert resp.json()["detail"] == "Exports restricted to admins"


def test_export_html_and_pdf(monkeypatch, base_context):
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": "cli",
    }
    _patch_server_dependencies(monkeypatch, record)
    with TestClient(app) as client:
        client.post(
            "/eyes/sharingan/clarify",
            json={"context": base_context, "payload": {"prompt": "Need help", "lang": "en"}},
            headers=_HEADERS,
        )
        html_resp = client.post(
            f"/session/{base_context['session_id']}/export",
            params={"fmt": "html"},
            headers=_HEADERS,
        )
        assert html_resp.status_code == 200
        assert html_resp.headers["content-type"].startswith("text/html")
        assert html_resp.headers["content-disposition"].endswith(".html")
        assert "<html" in html_resp.text.lower()

        pdf_resp = client.post(
            f"/session/{base_context['session_id']}/export",
            params={"fmt": "pdf"},
            headers=_HEADERS,
        )
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"].startswith("application/pdf")
        assert pdf_resp.headers["content-disposition"].endswith(".pdf")
        assert len(pdf_resp.content) > 200
