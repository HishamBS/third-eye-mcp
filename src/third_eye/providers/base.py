"""Base interfaces and registry for LLM providers."""
from __future__ import annotations

from typing import Protocol

from ..constants import PersonaKey, ToolName


class ProviderClient(Protocol):
    async def invoke(
        self,
        *,
        tool: ToolName,
        persona_key: PersonaKey,
        payload: dict,
        models: list[str] | None = None,
    ) -> dict:
        """Invoke the provider for the given tool/persona and return parsed JSON."""

    async def list_models(self) -> list[str]:
        """Return the list of available model identifiers."""


class ProviderRegistry:
    """Mutable registry storing available provider clients by name."""

    def __init__(self) -> None:
        self._providers: dict[str, ProviderClient] = {}
        self._default: str | None = None

    def set(self, provider: ProviderClient, *, name: str = "default", default: bool | None = None) -> None:
        key = name.lower()
        previous_default = self._default
        self._providers[key] = provider
        if default is True or self._default is None or key == "default":
            self._default = key
        if key == "default" and previous_default and previous_default != "default" and previous_default in self._providers:
            self._providers[previous_default] = provider
        if key == "default":
            self._providers["groq"] = provider
        elif default is False and self._default == key:
            self._default = None

    def get(self, name: str | None = None) -> ProviderClient:
        key = name.lower() if name else self._default
        if not key or key not in self._providers:
            raise RuntimeError("Provider not configured yet")
        return self._providers[key]

    def names(self) -> list[str]:
        return sorted(self._providers.keys())

    def has(self, name: str) -> bool:
        return name.lower() in self._providers

    def default_name(self) -> str | None:
        return self._default


REGISTRY = ProviderRegistry()


__all__ = ["ProviderClient", "ProviderRegistry", "REGISTRY"]
