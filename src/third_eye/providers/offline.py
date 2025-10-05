"""Offline provider implementation for local inference engines."""
from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Dict, List

import httpx

from ..constants import PersonaKey, ToolName
from ..personas import PERSONAS
from ..logging import get_logger
from .base import ProviderClient

LOG = get_logger("provider-offline")


class OfflineProvider(ProviderClient):
    """Interact with a locally hosted OpenAI-compatible endpoint."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        resolved_url = base_url or os.getenv("OFFLINE_PROVIDER_BASE_URL", "http://localhost:8008")
        if not resolved_url:
            raise RuntimeError("OFFLINE_PROVIDER_BASE_URL must be configured for offline provider")
        self._base_url = resolved_url.rstrip("/")
        self._client = httpx.AsyncClient(base_url=self._base_url, timeout=timeout)

    async def invoke(
        self,
        *,
        tool: ToolName,
        persona_key: PersonaKey,
        payload: Dict[str, Any],
        models: List[str] | None = None,
    ) -> Dict[str, Any]:
        message_payload = {
            "model": models[0] if models else os.getenv("OFFLINE_PROVIDER_MODEL", "qwen3-7b-instruct"),
            "messages": [
                {
                    "role": "system",
                    "content": PERSONAS[persona_key.value].system_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(payload, ensure_ascii=False),
                },
            ],
            "stream": False,
        }
        try:
            response = await self._client.post("/v1/chat/completions", json=message_payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:  # pragma: no cover - network errors handled upstream
            raise RuntimeError(f"Offline provider request failed: {exc}") from exc

        data = response.json()
        try:
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except (KeyError, IndexError, json.JSONDecodeError) as exc:  # pragma: no cover - defensive fallback
            LOG.warning("Offline provider returned non-JSON content: %s", exc)
            return data

    async def list_models(self) -> List[str]:
        try:
            response = await self._client.get("/v1/models")
            response.raise_for_status()
        except httpx.HTTPError as exc:  # pragma: no cover - network errors handled upstream
            raise RuntimeError(f"Offline provider list models failed: {exc}") from exc
        payload = response.json()
        if isinstance(payload, dict) and isinstance(payload.get("data"), list):
            return [item.get("id") for item in payload["data"] if isinstance(item, dict) and item.get("id")]
        return []

    async def close(self) -> None:
        await self._client.aclose()


__all__ = ["OfflineProvider"]
