import pytest

from third_eye.core import settings as core_settings


@pytest.mark.asyncio
async def test_effective_settings_merges_precedence(monkeypatch):
    async def fake_get_session_settings_async(session_id: str):
        return {
            "profile": "security",
            "overrides": {
                "ambiguity_threshold": 0.42,
                "require_rollback": False,
            },
        }

    async def fake_fetch_profile(name: str):
        return {
            "name": name,
            "data": {
                "ambiguity_threshold": 0.3,
                "require_rollback": True,
                "mangekyo": "strict",
            },
        }

    async def fake_upsert_profile_async(*, name: str, data: dict, actor: str | None = None):
        return {"name": name, "data": data}

    async def fake_fetch_provider_state():
        return {"mode": "api", "engine": {}}

    monkeypatch.setattr(core_settings.db, "get_session_settings_async", fake_get_session_settings_async)
    monkeypatch.setattr(core_settings.db, "fetch_profile_async", fake_fetch_profile)
    monkeypatch.setattr(core_settings.db, "upsert_profile_async", fake_upsert_profile_async)
    monkeypatch.setattr(core_settings.db, "fetch_provider_state_async", fake_fetch_provider_state)

    merged = await core_settings.effective_settings("sess-test")
    assert merged["ambiguity_threshold"] == 0.42  # override wins
    assert merged["require_rollback"] is False
    assert merged["mangekyo"] == "strict"  # from security profile


@pytest.mark.asyncio
async def test_build_session_settings_includes_provider(monkeypatch):
    async def fake_fetch_profile(name: str):
        return None  # use defaults

    async def fake_upsert_profile_async(*, name: str, data: dict, actor: str | None = None):
        return {"name": name, "data": data}

    async def fake_fetch_provider_state():
        return {"mode": "offline", "engine": {"endpoint": "http://localhost:8008"}}

    monkeypatch.setattr(core_settings.db, "fetch_profile_async", fake_fetch_profile)
    monkeypatch.setattr(core_settings.db, "upsert_profile_async", fake_upsert_profile_async)
    monkeypatch.setattr(core_settings.db, "fetch_provider_state_async", fake_fetch_provider_state)

    record = await core_settings.build_session_settings(profile="casual", overrides={"citation_cutoff": 0.65})
    assert record["profile"] == "casual"
    assert record["effective"]["citation_cutoff"] == 0.65
    assert record["provider"]["mode"] == "offline"
