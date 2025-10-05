from __future__ import annotations

import asyncio
import hashlib
import json
import time
import uuid
from typing import Any, Dict, List

from fastapi.testclient import TestClient
from fastapi import HTTPException

from third_eye.api.server import app
from third_eye.observability import record_budget_usage, record_request_metric, reset_metrics_counters
from third_eye.provider_metrics import reset as reset_provider_metrics
from third_eye.provider_metrics import record_latency
from third_eye.personas import PERSONAS
from third_eye.providers.groq import GroqProvider
from third_eye.constants import PersonaKey, ToolName

from .test_api import _HEADERS, _patch_server_dependencies


def _install_admin_stubs(monkeypatch):
    store: Dict[str, Dict[str, object]] = {}
    audit_log: List[Dict[str, object]] = []
    tenant_store: Dict[str, Dict[str, object]] = {
        "ops": {
            "id": "ops",
            "display_name": "Ops",
            "description": "Operations team",
            "metadata": {},
            "tags": [],
            "created_at": time.time(),
            "updated_at": time.time(),
            "archived_at": None,
        }
    }
    profile_store: Dict[str, Dict[str, object]] = {}
    provider_state: Dict[str, object] = {"mode": "api", "engine": {}}

    async def _create_api_key_async(**kwargs):
        key_id = kwargs["key_id"]
        ttl = kwargs.get("ttl_seconds")
        expires_at = time.time() + ttl if ttl else None
        tenant_id = kwargs.get("tenant")
        store[key_id] = {
            "id": key_id,
            "role": kwargs.get("role", "consumer"),
            "limits": kwargs.get("limits", {}),
            "tenant": tenant_id,
            "display_name": kwargs.get("display_name"),
            "created_at": time.time(),
            "expires_at": expires_at,
            "revoked_at": kwargs.get("revoked_at"),
            "last_used_at": None,
            "rotated_at": time.time(),
            "account_id": kwargs.get("account_id"),
        }
        if tenant_id and tenant_id not in tenant_store:
            tenant_store[tenant_id] = {
                "id": tenant_id,
                "display_name": tenant_id.title(),
                "description": None,
                "metadata": {},
                "tags": [],
                "created_at": time.time(),
                "updated_at": time.time(),
                "archived_at": None,
            }

    def _fetch_api_key_by_id(**kwargs):
        return store.get(kwargs["key_id"])

    async def _fetch_api_key_by_id_async(key_id: str):
        return store.get(key_id)

    def _list_api_keys(**kwargs):
        include_revoked = kwargs.get("include_revoked", False)
        entries = list(store.values())
        if not include_revoked:
            entries = [item for item in entries if item.get("revoked_at") is None]
        return entries

    async def _list_api_keys_async(**kwargs):
        return _list_api_keys(**kwargs)

    def _update_limits(**kwargs):
        record = store.get(kwargs["key_id"])
        if record:
            record["limits"] = kwargs.get("limits", record.get("limits", {}))
            record["expires_at"] = kwargs.get("expires_at")
            if "display_name" in kwargs:
                record["display_name"] = kwargs.get("display_name")

    def _revoke(**kwargs):
        record = store.get(kwargs["key_id"])
        if record:
            record["revoked_at"] = kwargs.get("revoked_at")

    def _restore(**kwargs):
        record = store.get(kwargs["key_id"])
        if record:
            record["revoked_at"] = None

    async def _record_audit(**kwargs):
        audit_log.append(kwargs)

    async def _list_audits_async(**kwargs):
        return [
            {
                "id": f"evt-{idx}",
                "actor": entry.get("actor"),
                "action": entry.get("action"),
                "target": entry.get("target"),
                "metadata": entry.get("metadata", {}),
                "ip": entry.get("ip"),
                "session_id": entry.get("session_id"),
                "tenant_id": entry.get("tenant_id"),
                "created_at": time.time(),
            }
            for idx, entry in enumerate(audit_log)
        ]

    monkeypatch.setattr("third_eye.api.admin.create_api_key_async", _create_api_key_async)
    monkeypatch.setattr("third_eye.api.admin.fetch_api_key_by_id_async", _fetch_api_key_by_id_async)
    monkeypatch.setattr("third_eye.api.admin.list_api_keys_async", _list_api_keys_async)
    async def _update_limits_async(**kwargs):
        _update_limits(**kwargs)

    monkeypatch.setattr("third_eye.api.admin.update_api_key_limits_async", _update_limits_async)
    async def _revoke_async(**kwargs):
        _revoke(**kwargs)

    async def _restore_async(**kwargs):
        _restore(**kwargs)

    monkeypatch.setattr("third_eye.api.admin.revoke_api_key_async", _revoke_async)
    monkeypatch.setattr("third_eye.api.admin.restore_api_key_async", _restore_async)
    monkeypatch.setattr("third_eye.api.admin.record_audit_event_async", _record_audit)
    monkeypatch.setattr("third_eye.api.admin.list_audit_events_async", _list_audits_async)
    monkeypatch.setattr("third_eye.api.admin.generate_api_key", lambda: "generated-secret")

    async def _list_known_tenants(limit: int = 200):
        tenants = sorted({record.get("tenant") for record in store.values() if record.get("tenant")})
        return tenants[:limit]

    monkeypatch.setattr("third_eye.api.admin.list_known_tenants_async", _list_known_tenants)

    async def _list_tenants_async(**kwargs):
        include_archived = kwargs.get("include_archived", False)
        search = kwargs.get("search")
        results = []
        for tenant_id, record in tenant_store.items():
            if not include_archived and record.get("archived_at"):
                continue
            if search and search.lower() not in tenant_id.lower() and search.lower() not in (record.get("display_name") or "").lower():
                continue
            active = sum(1 for item in store.values() if item.get("tenant") == tenant_id and item.get("revoked_at") is None)
            total = sum(1 for item in store.values() if item.get("tenant") == tenant_id)
            last_rotated = max(
                (item.get("rotated_at") for item in store.values() if item.get("tenant") == tenant_id),
                default=None,
            )
            last_used = max(
                (item.get("last_used_at") for item in store.values() if item.get("tenant") == tenant_id),
                default=None,
            )
            payload = dict(record)
            payload.update(
                {
                    "active_keys": active,
                    "total_keys": total,
                    "last_key_rotated_at": last_rotated,
                    "last_key_used_at": last_used,
                }
            )
            results.append(payload)
        if not results:
            tenants = sorted({item.get("tenant") for item in store.values() if item.get("tenant")})
            for tenant_id in tenants:
                results.append(
                    {
                        "id": tenant_id,
                        "display_name": tenant_id.title(),
                        "description": None,
                        "metadata": {},
                        "tags": [],
                        "created_at": time.time(),
                        "updated_at": time.time(),
                        "archived_at": None,
                        "active_keys": sum(
                            1
                            for item in store.values()
                            if item.get("tenant") == tenant_id and item.get("revoked_at") is None
                        ),
                        "total_keys": sum(
                            1 for item in store.values() if item.get("tenant") == tenant_id
                        ),
                        "last_key_rotated_at": None,
                        "last_key_used_at": None,
                    }
                )
        results.sort(key=lambda item: item.get("display_name", ""))
        return results

    async def _list_profiles_async():
        return [
            {"name": name, "data": data, "created_at": None, "updated_at": None}
            for name, data in profile_store.items()
        ]

    async def _upsert_profile_async(*, name: str, data: dict[str, Any], actor: str | None = None):
        profile_store[name] = data
        return {"name": name, "data": data}

    async def _fetch_provider_state_async():
        return dict(provider_state)

    async def _update_provider_state_async(*, mode: str, engine: dict[str, Any], actor: str | None = None):
        provider_state["mode"] = mode
        provider_state["engine"] = engine
        return dict(provider_state)

    async def _create_tenant(**kwargs):
        tenant_id = kwargs["tenant_id"]
        if tenant_id in tenant_store:
            raise ValueError("Tenant already exists")
        tenant_store[tenant_id] = {
            "id": tenant_id,
            "display_name": kwargs.get("display_name") or tenant_id.title(),
            "description": kwargs.get("description"),
            "metadata": kwargs.get("metadata") or {},
            "tags": kwargs.get("tags") or [],
            "created_at": time.time(),
            "updated_at": time.time(),
            "archived_at": None,
        }

    async def _update_tenant(**kwargs):
        tenant_id = kwargs["tenant_id"]
        record = tenant_store.get(tenant_id)
        if not record:
            raise ValueError("Tenant not found")
        if "display_name" in kwargs and kwargs["display_name"] is not None:
            record["display_name"] = kwargs["display_name"]
        if "description" in kwargs:
            record["description"] = kwargs["description"]
        if "metadata" in kwargs and kwargs["metadata"] is not None:
            record["metadata"] = kwargs["metadata"]
        if "tags" in kwargs and kwargs["tags"] is not None:
            record["tags"] = kwargs["tags"]
        record["updated_at"] = time.time()

    async def _fetch_tenant(**kwargs):
        tenant_id = kwargs.get("tenant_id")
        return tenant_store.get(tenant_id)

    async def _archive_tenant(**kwargs):
        tenant_id = kwargs.get("tenant_id")
        record = tenant_store.get(tenant_id)
        if not record:
            raise ValueError("Tenant not found")
        record["archived_at"] = time.time()
        record["updated_at"] = time.time()

    async def _restore_tenant(**kwargs):
        tenant_id = kwargs.get("tenant_id")
        record = tenant_store.get(tenant_id)
        if not record:
            raise ValueError("Tenant not found")
        record["archived_at"] = None
        record["updated_at"] = time.time()

    monkeypatch.setattr("third_eye.api.admin.list_tenants_async", _list_tenants_async)
    monkeypatch.setattr("third_eye.api.admin.list_profiles_async", _list_profiles_async)
    monkeypatch.setattr("third_eye.api.admin.upsert_profile_async", _upsert_profile_async)
    monkeypatch.setattr("third_eye.api.admin.fetch_provider_state_async", _fetch_provider_state_async)
    monkeypatch.setattr("third_eye.api.admin.update_provider_state_async", _update_provider_state_async)

    async def _tool_mapping_async(tool: str):
        return {
            "tool": tool,
            "primary_provider": "groq",
            "primary_model": "stub-model",
            "fallback_provider": None,
            "fallback_model": None,
            "updated_by": None,
            "updated_at": None,
        }

    async def _list_tool_mappings_async():
        return []

    monkeypatch.setattr("third_eye.api.admin.get_tool_model_mapping_async", _tool_mapping_async)
    monkeypatch.setattr("third_eye.api.admin.list_tool_model_mappings_async", _list_tool_mappings_async)
    monkeypatch.setattr("third_eye.api.admin.create_tenant_async", _create_tenant)
    monkeypatch.setattr("third_eye.api.admin.update_tenant_async", _update_tenant)
    monkeypatch.setattr("third_eye.api.admin.fetch_tenant_async", _fetch_tenant)
    monkeypatch.setattr("third_eye.api.admin.archive_tenant_async", _archive_tenant)
    monkeypatch.setattr("third_eye.api.admin.restore_tenant_async", _restore_tenant)

    return store, audit_log, tenant_store, profile_store, provider_state


def test_admin_create_list_and_revoke(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    store, audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)

    with TestClient(app) as client:
        response = client.post(
            "/admin/api-keys",
            json={"key_id": "service", "role": "operator", "tenant": "ops", "display_name": "Ops Service"},
            headers=_HEADERS,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["id"] == "service"
        assert body["secret"] == "generated-secret"
        assert store["service"]["role"] == "operator"
        assert store["service"]["display_name"] == "Ops Service"

        response = client.get("/admin/api-keys", headers=_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["id"] == "service"
        assert data["items"][0]["display_name"] == "Ops Service"

        response = client.post("/admin/api-keys/service/revoke", json={"reason": "test"}, headers=_HEADERS)
        assert response.status_code == 204
        assert store["service"]["revoked_at"] is not None

        response = client.post("/admin/api-keys/service/restore", headers=_HEADERS)
        assert response.status_code == 204
        assert store["service"]["revoked_at"] is None

    assert any(entry["action"] == "api_key.create" for entry in audit)


def test_admin_generates_key_id(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    store, _audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)
    monkeypatch.setattr("third_eye.api.admin.generate_key_id", lambda prefix="ak": f"{prefix}-demo")

    with TestClient(app) as client:
        response = client.post(
            "/admin/api-keys",
            json={"role": "operator", "tenant": "ops", "display_name": "Generated"},
            headers=_HEADERS,
        )
        assert response.status_code == 201
        body = response.json()
        assert body["id"] == "ak-demo"
        assert store["ak-demo"]["display_name"] == "Generated"


def test_admin_lifecycle_preserves_limits(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    store, _audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)

    complex_limits = {
        "rate": {"per_minute": 120, "burst": 200},
        "budget": {"max_per_request": 4000, "daily": 10000},
        "branches": ["code", "text"],
        "tools": ["sharingan/analyze"],
        "tenants": ["ops", "qa"],
        "max_budget_tokens": 8000,
    }

    with TestClient(app) as client:
        create = client.post(
            "/admin/api-keys",
            json={
                "role": "operator",
                "tenant": "ops",
                "display_name": "Ops Key",
                "limits": complex_limits,
            },
            headers=_HEADERS,
        )
        assert create.status_code == 201
        key_id = create.json()["id"]
        assert store[key_id]["limits"] == complex_limits

        rotate = client.post(f"/admin/api-keys/{key_id}/rotate", headers=_HEADERS)
        assert rotate.status_code == 200
        assert store[key_id]["limits"] == complex_limits
        assert store[key_id]["display_name"] == "Ops Key"

        listing = client.get("/admin/api-keys", headers=_HEADERS)
        assert listing.status_code == 200
        item = next(entry for entry in listing.json()["items"] if entry["id"] == key_id)
        assert item["limits"] == complex_limits
        assert isinstance(item["limits"], dict)

        revoke = client.post(f"/admin/api-keys/{key_id}/revoke", json={}, headers=_HEADERS)
        assert revoke.status_code == 204
        assert store[key_id]["revoked_at"] is not None

        restore = client.post(f"/admin/api-keys/{key_id}/restore", headers=_HEADERS)
        assert restore.status_code == 204
        assert store[key_id]["revoked_at"] is None


def test_admin_tenant_crud(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    _store, audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)

    with TestClient(app) as client:
        initial = client.get("/admin/tenants", headers=_HEADERS)
        assert initial.status_code == 200
        assert initial.json()["total"] >= 1

        create = client.post(
            "/admin/tenants",
            json={
                "id": "qa",
                "display_name": "QA",
                "description": "Quality assurance",
                "tags": ["primary", "critical"],
            },
            headers=_HEADERS,
        )
        assert create.status_code == 201
        assert tenant_store["qa"]["display_name"] == "QA"

        update = client.patch(
            "/admin/tenants/qa",
            json={"display_name": "QA Org", "tags": ["primary"]},
            headers=_HEADERS,
        )
        assert update.status_code == 200
        assert tenant_store["qa"]["display_name"] == "QA Org"
        assert tenant_store["qa"]["tags"] == ["primary"]

        archive = client.post("/admin/tenants/qa/archive", headers=_HEADERS)
        assert archive.status_code == 204
        assert tenant_store["qa"]["archived_at"] is not None

        restore = client.post("/admin/tenants/qa/restore", headers=_HEADERS)
        assert restore.status_code == 204
        assert tenant_store["qa"]["archived_at"] is None

    actions = {entry["action"] for entry in audit}
    for action in ("tenant.create", "tenant.update", "tenant.archive", "tenant.restore"):
        assert action in actions


def test_admin_update_and_metrics(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    store, _audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)
    store["svc"] = {
        "id": "svc",
        "role": "consumer",
        "limits": {"rate": {"per_minute": 5}},
        "tenant": "ops",
        "created_at": time.time(),
        "expires_at": None,
        "revoked_at": None,
        "last_used_at": None,
        "rotated_at": time.time(),
    }

    reset_provider_metrics()
    reset_metrics_counters()

    with TestClient(app) as client:
        response = client.patch(
            "/admin/api-keys/svc",
            json={"limits": {"rate": {"per_minute": 10}}},
            headers=_HEADERS,
        )
        assert response.status_code == 200
        assert store["svc"]["limits"]["rate"]["per_minute"] == 10

        response = client.get("/admin/api-keys", headers=_HEADERS)
        assert response.status_code == 200
        items = response.json()["items"]
        assert any(entry["id"] == "svc" and entry["limits"]["rate"]["per_minute"] == 10 for entry in items)

        record_request_metric(tool="admin.metrics", branch="tests", status=200, latency=0.05)
        record_latency(provider="groq", tool="sharingan/clarify", latency=0.12, success=True)
        record_budget_usage(key_id="svc", tokens=42)

        metrics = client.get("/admin/metrics/overview", headers=_HEADERS)
        assert metrics.status_code == 200
        overview = metrics.json()
        assert "requests" in overview
        assert "providers" in overview
        assert overview["prometheus"]["status"] in {"disabled", "degraded", "connected"}
        providers = overview["providers"]
        assert providers["total"] >= 1
        assert any(entry["provider"] == "groq" for entry in providers["byProvider"])
        budgets = overview["budgets"]
        assert any(entry["key_id"] == "svc" and entry["tokens"] >= 42 for entry in budgets["byKey"])


def test_metrics_reset_on_startup(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    _install_admin_stubs(monkeypatch)

    record_request_metric(tool="pre", branch="dev", status=200, latency=0.2)
    record_budget_usage(key_id="legacy", tokens=99)
    record_latency(provider="groq", tool="sharingan/clarify", latency=0.5, success=False)

    with TestClient(app) as client:
        metrics = client.get("/admin/metrics/overview", headers=_HEADERS)
        assert metrics.status_code == 200
        overview = metrics.json()

    assert overview["requests"]["total"] == 0
    assert overview["providers"]["total"] == 0
    assert overview["budgets"]["byKey"] == []
    assert overview["prometheus"]["status"] in {"disabled", "degraded"}
    assert overview["prometheus"]["mode"] in {"local", "fallback"}

    reset_metrics_counters()
    reset_provider_metrics()


def test_admin_audit_export(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    _store, audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)
    audit.append({"action": "api_key.create", "metadata": {}, "target": "demo", "actor": "admin-key"})

    with TestClient(app) as client:
        response = client.get("/admin/audit", headers=_HEADERS)
        assert response.status_code == 200
        payload = response.json()
    assert payload["count"] == 1
    assert payload["items"][0]["action"] == "api_key.create"


def test_admin_options_endpoint(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    store, _audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)
    store["svc"] = {
        "id": "svc",
        "role": "operator",
        "limits": {},
        "tenant": "ops",
        "created_at": time.time(),
        "expires_at": None,
        "revoked_at": None,
        "last_used_at": None,
        "rotated_at": time.time(),
    }

    with TestClient(app) as client:
        response = client.get("/admin/api-keys/options", headers=_HEADERS)
        assert response.status_code == 200
        payload = response.json()
        assert any(option["value"] == "ops" for option in payload["tenants"])
        assert any(option["value"] == "code" for option in payload["branches"])
        assert any(option["value"] == "overseer/navigator" for option in payload["tools"])


def test_persona_catalog_exposes_seed_prompts(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    _install_admin_stubs(monkeypatch)

    monkeypatch.setattr("third_eye.api.admin.get_active_persona_prompt", lambda persona: None)
    monkeypatch.setattr("third_eye.api.admin.list_persona_versions", lambda persona, limit=20: [])

    with TestClient(app) as client:
        response = client.get("/admin/personas", headers=_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    sharingan_entry = next(item for item in payload["items"] if item["persona"] == PersonaKey.SHARINGAN.value)
    assert sharingan_entry["active"]
    assert sharingan_entry["active"]["content_md"] == PERSONAS[PersonaKey.SHARINGAN.value].system_prompt
    assert any(version["active"] for version in sharingan_entry["versions"])


def test_persona_stage_publish_and_provider_fallback(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": "ops"}
    _patch_server_dependencies(monkeypatch, record)
    _install_admin_stubs(monkeypatch)

    persona_store: Dict[str, Dict[str, object]] = {}

    def _get_entry(persona: str) -> Dict[str, object]:
        return persona_store.setdefault(
            persona,
            {
                "records": [],
                "versions": [],
                "active": None,
            },
        )

    def _get_active(persona: str):
        return _get_entry(persona)["active"]

    def _list_versions(persona: str, limit: int = 20):
        return _get_entry(persona)["versions"][:limit]

    def _get_prompt_by_id(prompt_id: str):
        for entry in persona_store.values():
            for record in entry["records"]:
                if record["id"] == prompt_id:
                    return record
        return None

    def _stage_persona(
        *,
        persona: str,
        content_md: str,
        version: str | None,
        metadata,
        author: str | None,
        notes: str | None,
        rollback_of,
    ) -> str:
        entry = _get_entry(persona)
        prompt_id = uuid.uuid4().hex
        record_version = version or f"v-{len(entry['records']) + 1}"
        checksum = hashlib.sha256(content_md.encode("utf-8")).hexdigest()
        record = {
            "id": prompt_id,
            "persona": persona,
            "version": record_version,
            "content_md": content_md,
            "checksum": checksum,
            "metadata": metadata or {},
            "created_by": author,
            "notes": notes,
            "created_at": time.time(),
            "approved_at": None,
            "supersedes_id": None,
            "rollback_of": rollback_of,
        }
        entry["records"].append(record)
        version_entry = {
            "id": prompt_id,
            "version": record_version,
            "active": False,
            "staged": True,
            "created_at": record["created_at"],
            "approved_at": None,
        }
        entry["versions"].insert(0, version_entry)
        return prompt_id

    def _publish_persona(prompt_id: str, actor: str | None = None, notes: str | None = None) -> None:
        record = _get_prompt_by_id(prompt_id)
        if not record:
            raise ValueError("Prompt not found")
        entry = _get_entry(record["persona"])
        for version in entry["versions"]:
            if version["id"] == prompt_id:
                version["active"] = True
                version["staged"] = False
                version["approved_at"] = time.time()
            else:
                version["active"] = False
        record["approved_at"] = time.time()
        record["notes"] = notes
        entry["active"] = record

    monkeypatch.setattr("third_eye.api.admin.get_active_persona_prompt", lambda persona: _get_active(persona))
    monkeypatch.setattr("third_eye.api.admin.list_persona_versions", lambda persona, limit=20: _list_versions(persona, limit))
    monkeypatch.setattr("third_eye.api.admin.get_persona_prompt_by_id", lambda prompt_id: _get_prompt_by_id(prompt_id))
    monkeypatch.setattr("third_eye.api.admin.stage_persona_prompt", lambda **kwargs: _stage_persona(**kwargs))
    monkeypatch.setattr(
        "third_eye.api.admin.publish_persona_prompt",
        lambda **kwargs: _publish_persona(kwargs["prompt_id"], kwargs.get("actor"), kwargs.get("notes")),
    )

    async def _get_active_async(persona: str):
        return _get_active(persona)

    monkeypatch.setattr("third_eye.db.get_active_persona_prompt_async", _get_active_async)
    monkeypatch.setattr("third_eye.providers.groq.get_active_persona_prompt_async", _get_active_async)

    new_prompt = "You are SHARINGAN++ with extra safety rails"

    with TestClient(app) as client:
        stage_response = client.post(
            "/admin/personas/sharingan/stage",
            json={"content_md": new_prompt, "version": "ops-hotfix"},
            headers=_HEADERS,
        )
        assert stage_response.status_code == 200
        summary = stage_response.json()
        candidate = next(version for version in summary["versions"] if version["staged"])
        prompt_id = candidate["id"]

        publish_response = client.post(
            f"/admin/personas/sharingan/{prompt_id}/publish",
            json={"notes": "Promoted from ops"},
            headers=_HEADERS,
        )
        assert publish_response.status_code == 200
        promoted = publish_response.json()
        assert promoted["active"]["content_md"] == new_prompt

    active_record = _get_active(PersonaKey.SHARINGAN.value)
    assert active_record is not None
    assert active_record["content_md"] == new_prompt

    class DummyGroqClient:
        def __init__(self) -> None:
            self.calls: List[dict[str, object]] = []

        async def chat(self, model_id: str, messages: list[dict[str, object]], force_json: bool = True) -> str:
            self.calls.append({"model": model_id, "messages": messages})
            return "{\"tag\": \"ok\"}"

        async def list_models(self) -> list[str]:  # pragma: no cover - not exercised in test
            return ["mixtral"]

    client = DummyGroqClient()
    provider = GroqProvider(client=client)
    result = asyncio.run(
        provider.invoke(
            tool=ToolName.SHARINGAN_CLARIFY,
            persona_key=PersonaKey.SHARINGAN,
            payload={"sample": "payload"},
        )
    )
    assert result["tag"] == "ok"
    assert client.calls, "Groq client was not invoked"
    system_message = client.calls[0]["messages"][0]
    assert system_message["role"] == "system"
    assert system_message["content"] == new_prompt


def test_admin_key_accesses_sessions_and_pipeline(monkeypatch):
    admin_record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": None,
        "account_id": "admin-1",
    }

    _patch_server_dependencies(monkeypatch, admin_record)

    async def _list_sessions_async(limit: int = 20):
        return [{"id": "sess-1", "tenant": None}]

    monkeypatch.setattr("third_eye.api.server.list_recent_sessions_async", _list_sessions_async)
    monkeypatch.setattr("third_eye.api.server.get_recent_sessions", lambda limit=20: [{"id": "sess-1", "tenant": None}])

    async def _list_events_async(session_id: str, limit: int = 50):
        return []

    monkeypatch.setattr("third_eye.pipeline_bus.db.list_pipeline_events_async", _list_events_async)

    async def _audit_stub(**kwargs):
        return None

    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _audit_stub)
    monkeypatch.setattr("third_eye.db.record_audit_event_async", _audit_stub)

    with TestClient(app) as client:
        response = client.get("/sessions", headers=_HEADERS)
        assert response.status_code == 200
        payload = response.json()
        assert payload["items"]

        with client.websocket_connect(
            "/ws/pipeline/sess-1",
            headers=_HEADERS,
        ) as websocket:
            initial = websocket.receive_text()
            if initial != "pong":
                payload = json.loads(initial)
                assert payload["type"] == "settings_update"
            websocket.send_text("ping")
            assert websocket.receive_text() == "pong"

def test_admin_login_endpoint(monkeypatch):
    _patch_server_dependencies(monkeypatch)
    audit_calls: List[Dict[str, object]] = []

    account = {
        "id": "admin-1",
        "email": "admin@example.com",
        "display_name": "Ops",
        "require_password_reset": True,
        "created_at": 100.0,
        "updated_at": 100.0,
        "last_login_at": 101.0,
        "password_hash": "hashed",
    }

    async def _auth_stub(email, password):
        return account

    monkeypatch.setattr("third_eye.api.server.authenticate_admin_async", _auth_stub)
    async def _issue(admin_id):
        return "key-123", "secret-123"

    monkeypatch.setattr("third_eye.api.server.issue_admin_api_key_async", _issue)

    async def _audit_stub(**kwargs):
        audit_calls.append(kwargs)

    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _audit_stub)

    with TestClient(app) as client:
        response = client.post(
            "/admin/auth/login",
            json={"email": "admin@example.com", "password": "Password123!"},
        )
    assert response.status_code == 200, response.json()
    payload = response.json()
    assert payload["key_id"] == "key-123"
    assert payload["api_key"] == "secret-123"
    assert payload["force_password_reset"] is True
    assert payload["account"]["email"] == "admin@example.com"
    assert any(call["action"] == "admin.login" for call in audit_calls)


def test_admin_change_password_endpoint(monkeypatch):
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": "ops",
        "account_id": "admin-1",
    }
    _patch_server_dependencies(monkeypatch, record)
    admin_state = {
        "id": "admin-1",
        "email": "admin@example.com",
        "display_name": "Ops",
        "require_password_reset": True,
        "created_at": 100.0,
        "updated_at": 100.0,
        "last_login_at": 101.0,
        "password_hash": "hashed",
    }
    audit_calls: List[Dict[str, object]] = []

    async def _fetch_admin(_: str):
        return admin_state

    monkeypatch.setattr("third_eye.api.server.get_admin_account_async", _fetch_admin)
    monkeypatch.setattr("third_eye.api.server.verify_password", lambda pwd, hashed: pwd == "old-pass")

    def _change_password(account_id: str, new_password: str):
        admin_state["require_password_reset"] = False
        admin_state["updated_at"] = time.time()
        admin_state["last_login_at"] = admin_state["updated_at"]
        return "key-456", "secret-456"

    async def _change_password_async(admin_id: str, new_password: str):
        return _change_password(admin_id, new_password)

    monkeypatch.setattr("third_eye.api.server.change_admin_password_async", _change_password_async)

    async def _audit_stub(**kwargs):
        audit_calls.append(kwargs)

    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _audit_stub)

    with TestClient(app) as client:
        response = client.post(
            "/admin/auth/change-password",
            json={"old_password": "old-pass", "new_password": "NewPassword123!"},
            headers=_HEADERS,
        )
    assert response.status_code == 200
    payload = response.json()
    assert payload["api_key"] == "secret-456"
    assert payload["force_password_reset"] is False
    assert payload["account"]["email"] == "admin@example.com"
    assert any(call["action"] == "admin.password.change" for call in audit_calls)


def test_admin_update_account_endpoint(monkeypatch):
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": "ops",
        "account_id": "admin-1",
    }
    _patch_server_dependencies(monkeypatch, record)
    admin_state = {
        "id": "admin-1",
        "email": "admin@example.com",
        "display_name": "Ops",
        "require_password_reset": False,
        "created_at": 100.0,
        "updated_at": 100.0,
        "last_login_at": 101.0,
        "password_hash": "hashed",
    }
    audit_calls: List[Dict[str, object]] = []

    async def _fetch_admin(_: str):
        return admin_state

    monkeypatch.setattr("third_eye.api.server.get_admin_account_async", _fetch_admin)

    async def _update_account_async(
        admin_id: str,
        *,
        email: str | None = None,
        display_name: str | None = None,
    ) -> None:
        if email:
            admin_state["email"] = email
        if display_name:
            admin_state["display_name"] = display_name
        admin_state["updated_at"] = time.time()

    monkeypatch.setattr("third_eye.api.server.update_admin_account_async", _update_account_async)

    async def _audit_stub(**kwargs):
        audit_calls.append(kwargs)

    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _audit_stub)

    with TestClient(app) as client:
        response = client.patch(
            "/admin/account",
            json={"display_name": "New Name"},
            headers=_HEADERS,
        )
    assert response.status_code == 200
    body = response.json()
    assert body["display_name"] == "New Name"
    assert any(call["action"] == "admin.profile.update" for call in audit_calls)


def test_admin_bootstrap_status(monkeypatch):
    _patch_server_dependencies(monkeypatch)
    async def _count_zero():
        return 0

    monkeypatch.setattr(
        "third_eye.api.server.admin_account_count_async",
        lambda: _count_zero(),
    )
    monkeypatch.setattr("third_eye.api.server.CONFIG.admin.email", "admin@example.com", raising=False)

    with TestClient(app) as client:
        response = client.get("/admin/bootstrap/status")

    assert response.status_code == 200
    body = response.json()
    assert body == {
        "bootstrapped": False,
        "admin_count": 0,
        "bootstrap_email": "admin@example.com",
    }

    async def _count_two():
        return 2

    monkeypatch.setattr(
        "third_eye.api.server.admin_account_count_async",
        lambda: _count_two(),
    )

    with TestClient(app) as client:
        response = client.get("/admin/bootstrap/status")

    assert response.status_code == 200
    body = response.json()
    assert body["bootstrapped"] is True
    assert body["admin_count"] == 2


def test_admin_get_account(monkeypatch):
    record = {
        "id": "admin-key",
        "role": "admin",
        "limits": {},
        "tenant": "ops",
        "account_id": "admin-99",
    }
    _patch_server_dependencies(monkeypatch, record)
    account = {
        "id": "admin-99",
        "email": "ops@example.com",
        "display_name": "Ops",
        "require_password_reset": False,
        "created_at": 123.0,
        "updated_at": 456.0,
        "last_login_at": 789.0,
        "password_hash": "hashed",
    }
    audit_calls: List[Dict[str, object]] = []

    async def _fetch_admin(_: str):
        return account

    monkeypatch.setattr("third_eye.api.server.get_admin_account_async", _fetch_admin)

    async def _audit_stub(**kwargs):
        audit_calls.append(kwargs)

    monkeypatch.setattr("third_eye.api.server.record_audit_event_async", _audit_stub)

    with TestClient(app) as client:
        response = client.get("/admin/account", headers=_HEADERS)

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "admin-99"
    assert payload["email"] == "ops@example.com"
    assert payload["display_name"] == "Ops"
    assert any(entry["action"] == "admin.profile.view" for entry in audit_calls)

def test_admin_profiles_endpoint(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": None}
    _patch_server_dependencies(monkeypatch, record)
    store, audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)

    with TestClient(app) as client:
        listing = client.get("/admin/profiles", headers=_HEADERS)
        assert listing.status_code == 200
        data = listing.json()
        assert data["total"] >= 3
        names = {item["name"] for item in data["items"]}
        assert "enterprise" in names

        update = client.put(
            "/admin/profiles",
            json={"profiles": {"security": {"ambiguity_threshold": 0.2}}},
            headers=_HEADERS,
        )
        assert update.status_code == 200
        assert profile_store["security"]["ambiguity_threshold"] == 0.2

    assert any(entry["action"] == "profile.upsert" for entry in audit)


def test_admin_provider_endpoint(monkeypatch):
    record = {"id": "admin-key", "role": "admin", "limits": {}, "tenant": None}
    _patch_server_dependencies(monkeypatch, record)
    store, audit, tenant_store, profile_store, provider_state = _install_admin_stubs(monkeypatch)
    monkeypatch.setattr("third_eye.api.admin.configure_provider", lambda: None)

    with TestClient(app) as client:
        state = client.get("/admin/provider", headers=_HEADERS)
        assert state.status_code == 200
        assert state.json()["mode"] == "api"

        update = client.put(
            "/admin/provider",
            json={"mode": "offline", "engine": {"endpoint": "http://localhost:8008"}},
            headers=_HEADERS,
        )
        assert update.status_code == 200
        assert provider_state["mode"] == "offline"

    assert any(entry["action"] == "provider.update" for entry in audit)
