import pytest

from third_eye.providers import REGISTRY, ProviderClient, configure_provider
from third_eye.providers.groq import GroqProvider


class DummyProvider:
    async def invoke(self, *, tool, persona_key, payload):
        return {"tool": tool, "persona": persona_key, "payload": payload}

    async def list_models(self):
        return ["dummy"]


def test_registry_set_get():
    provider: ProviderClient = DummyProvider()
    REGISTRY.set(provider)
    assert REGISTRY.get() is provider


def test_configure_provider_default(monkeypatch):
    monkeypatch.delenv("THIRD_EYE_PROVIDER", raising=False)
    configure_provider()
    assert isinstance(REGISTRY.get(), GroqProvider)


def test_configure_provider_unknown(monkeypatch):
    monkeypatch.setenv("THIRD_EYE_PROVIDER", "unknown")
    with pytest.raises(ValueError):
        configure_provider()


def test_configure_provider_openrouter_requires_key(monkeypatch):
    monkeypatch.setenv("THIRD_EYE_PROVIDER", "openrouter")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    with pytest.raises(RuntimeError):
        configure_provider()


def test_configure_provider_openrouter(monkeypatch):
    monkeypatch.setenv("THIRD_EYE_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test")
    class DummyOpenRouter:
        async def invoke(self, *, tool, persona_key, payload):
            return {"ok": True}

        async def list_models(self):
            return ["dummy"]

    monkeypatch.setattr("third_eye.providers.factory.OpenRouterProvider", DummyOpenRouter)
    configure_provider()
    assert isinstance(REGISTRY.get(), DummyOpenRouter)

def test_configure_provider_offline(monkeypatch):
    monkeypatch.setenv("THIRD_EYE_PROVIDER", "offline")
    monkeypatch.setenv("OFFLINE_PROVIDER_BASE_URL", "http://localhost:8008")

    class DummyOffline:
        async def invoke(self, *, tool, persona_key, payload, models=None):
            return {"ok": True}

        async def list_models(self):
            return ["dummy"]

    monkeypatch.setattr("third_eye.providers.factory.OfflineProvider", DummyOffline)
    configure_provider()
    assert isinstance(REGISTRY.get(), DummyOffline)
