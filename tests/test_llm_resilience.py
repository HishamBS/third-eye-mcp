from third_eye.constants import PersonaKey, ToolName
from third_eye.eyes._llm import invoke_llm
from third_eye.providers import REGISTRY


class FlakyProvider:
    def __init__(self):
        self.calls = 0

    async def invoke(self, *, tool, persona_key, payload):
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("transient failure")
        return {"ok": True, "tool": tool, "persona": persona_key, "payload": payload}

    async def list_models(self):
        return ["flaky"]


def test_retry_backoff(monkeypatch, base_context):
    flaky = FlakyProvider()
    previous = REGISTRY.get()
    REGISTRY.set(flaky)
    monkeypatch.setattr("third_eye.config.CONFIG.retries.max_attempts", 2, raising=False)
    monkeypatch.setattr("third_eye.config.CONFIG.timeouts.retry_backoff_seconds", 0, raising=False)
    async def _mapping_stub(tool: str):
        return {
            "primary_provider": "flaky",
            "primary_model": "flaky",
            "fallback_provider": None,
            "fallback_model": None,
        }

    monkeypatch.setattr(
        "third_eye.eyes._llm.get_tool_model_mapping_async",
        _mapping_stub,
        raising=False,
    )

    payload = {"context": base_context, "payload": {"prompt": "ping"}}
    try:
        result = invoke_llm(ToolName.SHARINGAN_CLARIFY, PersonaKey.SHARINGAN, payload)
        assert result["ok"] is True
        assert flaky.calls == 2
    finally:
        REGISTRY.set(previous)


class FailingProvider:
    async def invoke(self, *, tool, persona_key, payload, models=None):
        raise RuntimeError("primary failed")

    async def list_models(self):
        return ["primary"]


class SucceedingProvider:
    async def invoke(self, *, tool, persona_key, payload, models=None):
        return {"ok": True, "provider": "fallback"}

    async def list_models(self):
        return ["fallback"]


def test_provider_failover(monkeypatch, base_context):
    primary = FailingProvider()
    fallback = SucceedingProvider()
    previous = REGISTRY.get()
    REGISTRY.set(primary, name="offline", default=False)
    REGISTRY.set(fallback, name="groq", default=True)

    async def _mapping_stub(tool: str):
        return {
            "primary_provider": "offline",
            "primary_model": "primary",
            "fallback_provider": "groq",
            "fallback_model": "fallback",
        }

    monkeypatch.setattr(
        "third_eye.eyes._llm.get_tool_model_mapping_async",
        _mapping_stub,
        raising=False,
    )
    monkeypatch.setattr("third_eye.config.CONFIG.retries.max_attempts", 1, raising=False)

    payload = {"context": base_context, "payload": {"prompt": "ping"}}
    try:
        result = invoke_llm(ToolName.SHARINGAN_CLARIFY, PersonaKey.SHARINGAN, payload)
        assert result["ok"] is True
        assert result["provider"] == "fallback"
    finally:
        REGISTRY.set(previous)
