"""Groq-backed provider implementation."""
from __future__ import annotations

import json
from typing import Any, Dict

from ..config import CONFIG
from ..constants import PersonaKey, ToolName
from ..groq_client import GroqClient, GROQ
from ..logging import get_logger, log_json
from ..personas import PERSONAS
from ..db import get_active_persona_prompt_async
from .base import ProviderClient

LOG = get_logger("provider-groq")


class GroqProvider(ProviderClient):
    def __init__(self, client: GroqClient | None = None) -> None:
        self._client = client or GROQ

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
        configured_models = models
        if not configured_models:
            model_mapping = CONFIG.groq.models.get(tool.value)
            configured_models = [model_mapping.primary]
            if model_mapping.fallback:
                configured_models.append(model_mapping.fallback)

        last_error: Exception | None = None
        for model_id in configured_models:
            for strict_mode in (False, True):
                system_prompt = system_prompt_text
                if strict_mode:
                    system_prompt = f"{system_prompt}{base_persona.strict_suffix}"
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ]
                try:
                    raw = await self._client.chat(model_id, messages, force_json=True)
                    result = json.loads(raw)
                    log_json(LOG, "[GROQ]", tool=tool.value, persona=persona_key.value, model=model_id, strict=strict_mode)
                    return result
                except Exception as exc:  # noqa: BLE001
                    last_error = exc
                    log_json(
                        LOG,
                        "[GROQ]",
                        tool=tool.value,
                        persona=persona_key.value,
                        model=model_id,
                        strict=strict_mode,
                        error=str(exc),
                    )
                    continue
        raise RuntimeError(f"Failed to obtain structured response from Groq: {last_error}")

    async def list_models(self) -> list[str]:
        return await self._client.list_models()


__all__ = ["GroqProvider"]
