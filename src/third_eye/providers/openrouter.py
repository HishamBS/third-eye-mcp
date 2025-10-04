"""OpenRouter-backed provider implementation."""
from __future__ import annotations

import json
import os
from typing import Any, Dict, Iterable

import httpx

from ..config import CONFIG
from ..constants import PersonaKey, ToolName
from ..logging import get_logger, log_json
from ..personas import PERSONAS
from ..db import get_active_persona_prompt_async
from .base import ProviderClient

LOG = get_logger("provider-openrouter")


class OpenRouterProvider(ProviderClient):
    _DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        referer: str | None = None,
        app_title: str | None = None,
    ) -> None:
        key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not key:
            raise RuntimeError("OPENROUTER_API_KEY is required to use the OpenRouter provider")

        self._base_url = base_url or os.getenv("OPENROUTER_BASE_URL", self._DEFAULT_BASE_URL)
        self._headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        referer = referer or os.getenv("OPENROUTER_REFERER")
        if referer:
            self._headers["HTTP-Referer"] = referer
        title = app_title or os.getenv("OPENROUTER_APP_TITLE")
        if title:
            self._headers["X-Title"] = title

    async def invoke(
        self,
        *,
        tool: ToolName,
        persona_key: PersonaKey,
        payload: Dict[str, Any],
        models: list[str] | None = None,
    ) -> Dict[str, Any]:
        base_persona = PERSONAS[persona_key.value]
        record = await get_active_persona_prompt_async(persona_key.value)
        system_prompt_text = record.get("content_md") if record else base_persona.system_prompt
        configured_models: Iterable[str]
        if models:
            configured_models = models
        else:
            model_mapping = CONFIG.groq.models.get(tool.value)
            configured_models = [model_mapping.primary]
            if model_mapping.fallback:
                configured_models = [model_mapping.primary, model_mapping.fallback]

        last_error: Exception | None = None
        async with httpx.AsyncClient(base_url=self._base_url, headers=self._headers, timeout=CONFIG.timeouts.default_seconds) as client:
            for model_id in configured_models:
                for strict_mode in (False, True):
                    system_prompt = system_prompt_text
                    if strict_mode:
                        system_prompt = f"{system_prompt}{base_persona.strict_suffix}"
                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                    ]
                    body = {
                        "model": model_id,
                        "messages": messages,
                        "response_format": {"type": "json_object"},
                    }
                    try:
                        response = await client.post("/chat/completions", json=body)
                        response.raise_for_status()
                        content = response.json()["choices"][0]["message"]["content"]
                        result = json.loads(content)
                        log_json(LOG, "[OPENROUTER]", tool=tool.value, persona=persona_key.value, model=model_id, strict=strict_mode)
                        return result
                    except Exception as exc:  # noqa: BLE001
                        last_error = exc
                        log_json(
                            LOG,
                            "[OPENROUTER]",
                            tool=tool.value,
                            persona=persona_key.value,
                            model=model_id,
                            strict=strict_mode,
                            error=str(exc),
                        )
                        continue

        raise RuntimeError(f"Failed to obtain structured response from OpenRouter: {last_error}")

    async def list_models(self) -> list[str]:
        async with httpx.AsyncClient(base_url=self._base_url, headers=self._headers, timeout=CONFIG.timeouts.default_seconds) as client:
            response = await client.get("/models")
            response.raise_for_status()
            payload = response.json()
            return [item["id"] for item in payload.get("data", []) if isinstance(item.get("id"), str)]


__all__ = ["OpenRouterProvider"]
