import asyncio

import pytest
from fastapi.testclient import TestClient

from third_eye.api.server import app
from tests.test_api import _patch_server_dependencies, _HEADERS


@pytest.mark.asyncio
async def test_build_session_merge(monkeypatch):
    async def fake_get_session_settings_async(session_id):
        return {
            "profile": "enterprise",
            "overrides": {"citation_cutoff": 0.82},
            "pipeline": {"next_tools": []},
        }

    async def fake_snapshot(session_id):
        return {
            "profile": "enterprise",
            "overrides": {"citation_cutoff": 0.82},
            "pipeline": {"next_tools": []},
            "effective": {"citation_cutoff": 0.82},
            "provider": {"mode": "api", "engine": {}},
        }

    async def fake_build(profile: str | None = None, overrides: dict | None = None):
        return {
            "profile": profile or "enterprise",
            "overrides": overrides or {},
            "effective": {"citation_cutoff": overrides.get("citation_cutoff", 0.85) if overrides else 0.85},
            "provider": {"mode": "api", "engine": {}},
        }

    async def fake_emit(session_id: str, settings: dict[str, object]):
        fake_emit.called = settings

    fake_emit.called = None

    record = {"id": "admin", "role": "admin", "limits": {}, "tenant": None}
    _patch_server_dependencies(monkeypatch, record)
    monkeypatch.setattr("third_eye.api.server.get_session_settings_async", fake_get_session_settings_async)
    async def _noop_pipeline(session_id: str):
        return None

    monkeypatch.setattr("third_eye.api.server.build_session_settings", fake_build)
    monkeypatch.setattr("third_eye.api.server.snapshot_for_session", fake_snapshot)
    monkeypatch.setattr("third_eye.api.server.emit_settings_event", fake_emit)
    monkeypatch.setattr("third_eye.api.server._pipeline_reset", _noop_pipeline)

    with TestClient(app) as client:
        response = client.put(
            "/session/sess-test/settings",
            headers=_HEADERS,
            json={"profile": "security", "citation_cutoff": 0.9},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["profile"] == "security"
    assert body["settings"]["citation_cutoff"] == 0.9
    assert fake_emit.called is not None
    assert fake_emit.called["profile"] == "security"
    assert fake_emit.called["provider"]["mode"] == "api"


def test_create_session_endpoint(monkeypatch):
    async def fake_build(profile: str | None = None, overrides: dict | None = None):
        return {
            "profile": profile or "enterprise",
            "overrides": overrides or {},
            "effective": {"ambiguity_threshold": overrides.get("ambiguity_threshold", 0.35) if overrides else 0.35},
            "provider": {"mode": "api", "engine": {}},
        }

    async def fake_emit(session_id: str, settings: dict[str, object]):
        fake_emit.calls.append((session_id, settings))

    fake_emit.calls = []

    async def fake_pipeline_reset(session_id):
        fake_pipeline_reset.called = session_id

    fake_pipeline_reset.called = None

    record = {"id": "admin", "role": "admin", "limits": {}, "tenant": None}
    _patch_server_dependencies(monkeypatch, record)
    async def _noop_audit(**kwargs):
        return None

    monkeypatch.setattr("third_eye.api.server.build_session_settings", fake_build)
    monkeypatch.setattr("third_eye.api.server.emit_settings_event", fake_emit)
    monkeypatch.setattr("third_eye.api.server._pipeline_reset", fake_pipeline_reset)
    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _noop_audit)

    monkeypatch.setenv("PORTAL_BASE_URL", "http://localhost:3000")

    with TestClient(app) as client:
        response = client.post(
            "/session",
            headers=_HEADERS,
            json={"profile": "casual", "settings": {"ambiguity_threshold": 0.4}},
        )

    assert response.status_code == 201
    body = response.json()
    assert body["profile"] == "casual"
    assert body["settings"]["ambiguity_threshold"] == 0.4
    assert body["portal_url"].startswith("http://localhost:3000/session/")
    assert fake_emit.calls
    session_id, settings = fake_emit.calls[0]
    assert settings["profile"] == "casual"
    assert fake_pipeline_reset.called == session_id
