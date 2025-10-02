"""LLM invocation utilities for Eyes."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

import threading

from ..config import CONFIG
from ..constants import PersonaKey, ToolName
from ..groq_client import GROQ
from ..logging import get_logger, log_json
from ..personas import PERSONAS

LOG = get_logger("llm")


async def _invoke_async(tool: ToolName, persona_key: PersonaKey, payload: Dict[str, Any]) -> Dict[str, Any]:
    persona = PERSONAS[persona_key.value]
    model_mapping = CONFIG.groq.models.get(tool.value)
    models = [model_mapping.primary]
    if model_mapping.fallback:
        models.append(model_mapping.fallback)

    last_error: Exception | None = None
    for model_id in models:
        for strict_mode in (False, True):
            system_prompt = persona.system_prompt
            if strict_mode:
                system_prompt = f"{system_prompt}{persona.strict_suffix}"
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ]
            try:
                raw = await GROQ.chat(model_id, messages, force_json=True)
                result = json.loads(raw)
                log_json(LOG, "[LLM]", tool=tool.value, persona=persona_key.value, model=model_id, strict=strict_mode)
                return result
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                log_json(
                    LOG,
                    "[LLM]",
                    tool=tool.value,
                    persona=persona_key.value,
                    model=model_id,
                    strict=strict_mode,
                    error=str(exc),
                )
                continue
    raise RuntimeError(f"Failed to obtain structured response from Groq: {last_error}")


def invoke_llm(tool: ToolName, persona_key: PersonaKey, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Synchronously invoke a persona-backed Groq model and return parsed JSON."""

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_invoke_async(tool, persona_key, payload))
    else:  # pragma: no cover - exercised when called inside async context
        result: Dict[str, Any] = {}
        error: Dict[str, Exception] = {}

        def _runner() -> None:
            try:
                result["value"] = asyncio.run(_invoke_async(tool, persona_key, payload))
            except Exception as exc:  # noqa: BLE001
                error["exc"] = exc

        thread = threading.Thread(target=_runner, daemon=True)
        thread.start()
        thread.join()
        if error:
            raise error["exc"]
        return result["value"]


__all__ = ["invoke_llm"]
