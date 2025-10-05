"""LLM invocation utilities for Eyes."""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

import threading

from ..config import CONFIG
from ..constants import PersonaKey, ToolName
from ..cost_meter import record_cost
from ..provider_metrics import record_latency
from ..logging import get_logger, log_json
from ..providers import REGISTRY
from ..db import get_tool_model_mapping_async


LOG = get_logger("llm")


def _estimate_tokens(data: Any) -> int:
    try:
        serialized = json.dumps(data, ensure_ascii=False)
    except Exception:
        serialized = str(data)
    return max(len(serialized) // 4, 0)


async def _resolve_model_routes(tool: ToolName) -> list[tuple[str, list[str]]]:
    mapping = await get_tool_model_mapping_async(tool.value)
    routes: dict[str, list[str]] = {}

    def append_route(provider: str | None, model_id: str | None) -> None:
        if not provider or not model_id:
            return
        key = provider.lower()
        bucket = routes.setdefault(key, [])
        if model_id not in bucket:
            bucket.append(model_id)

    if mapping:
        append_route(mapping.get("primary_provider"), mapping.get("primary_model"))
        append_route(mapping.get("fallback_provider"), mapping.get("fallback_model"))
    else:
        config_mapping = CONFIG.groq.models.get(tool.value)
        append_route("groq", config_mapping.primary)
        if config_mapping.fallback:
            append_route("groq", config_mapping.fallback)

    # Preserve insertion order for deterministic retries
    return [(provider, models) for provider, models in routes.items()]


async def _invoke_async(tool: ToolName, persona_key: PersonaKey, payload: Dict[str, Any]) -> Dict[str, Any]:
    attempts = CONFIG.retries.max_attempts
    timeout = CONFIG.timeouts.default_seconds
    backoff = CONFIG.timeouts.retry_backoff_seconds
    last_error: Exception | None = None

    routes = await _resolve_model_routes(tool)

    for attempt in range(1, attempts + 1):
        for provider_name, model_ids in routes:
            resolved_provider_name = provider_name
            try:
                provider = REGISTRY.get(provider_name)
            except RuntimeError:
                default_name = REGISTRY.default_name()
                if not default_name:
                    last_error = RuntimeError("Provider registry has no defaults")
                    log_json(
                        LOG,
                        "[LLM]",
                        tool=tool.value,
                        persona=persona_key.value,
                        attempt=attempt,
                        provider=provider_name,
                        error="Provider missing",
                    )
                    continue
                try:
                    provider = REGISTRY.get(default_name)
                    resolved_provider_name = default_name
                except RuntimeError as exc:  # pragma: no cover
                    last_error = exc
                    log_json(
                        LOG,
                        "[LLM]",
                        tool=tool.value,
                        persona=persona_key.value,
                        attempt=attempt,
                        provider=provider_name,
                        error="Provider missing",
                    )
                    continue

            try:
                loop = asyncio.get_event_loop()
                invoke_start = loop.time()
                try:
                    result = await asyncio.wait_for(
                        provider.invoke(tool=tool, persona_key=persona_key, payload=payload, models=model_ids),
                        timeout=timeout,
                    )
                except TypeError as exc:
                    if "models" in str(exc):
                        result = await asyncio.wait_for(
                            provider.invoke(tool=tool, persona_key=persona_key, payload=payload),
                            timeout=timeout,
                        )
                    else:
                        raise
                duration = loop.time() - invoke_start
                log_json(
                    LOG,
                    "[LLM]",
                    tool=tool.value,
                    persona=persona_key.value,
                    attempt=attempt,
                    provider=resolved_provider_name,
                    latency_ms=int(duration * 1000),
                )
                record_latency(provider=resolved_provider_name, tool=tool.value, latency=duration, success=True)
                session_id = payload.get("context", {}).get("session_id") if isinstance(payload, dict) else None
                if session_id:
                    input_tokens = result.get("input_tokens") or _estimate_tokens(payload)
                    output_tokens = result.get("output_tokens") or _estimate_tokens(result)
                    record_cost(
                        session_id=session_id,
                        provider=provider_name,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                    )
                return result
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                log_json(
                    LOG,
                    "[LLM]",
                    tool=tool.value,
                    persona=persona_key.value,
                    attempt=attempt,
                    provider=resolved_provider_name,
                    error=str(exc),
                )
                record_latency(provider=resolved_provider_name, tool=tool.value, latency=0.0, success=False)
                continue
        if attempt < attempts and backoff:
            await asyncio.sleep(backoff)
    raise RuntimeError("LLM invocation failed after retries") from last_error


async def invoke_llm_async(
    tool: ToolName,
    persona_key: PersonaKey,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    return await _invoke_async(tool, persona_key, payload)


def invoke_llm(tool: ToolName, persona_key: PersonaKey, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Synchronously invoke the configured provider and return parsed JSON."""

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(invoke_llm_async(tool, persona_key, payload))
    else:  # pragma: no cover - exercised when called inside async context
        result: Dict[str, Any] = {}
        error: Dict[str, Exception] = {}

        def _runner() -> None:
            try:
                result["value"] = asyncio.run(invoke_llm_async(tool, persona_key, payload))
            except Exception as exc:  # noqa: BLE001
                error["exc"] = exc

        thread = threading.Thread(target=_runner, daemon=True)
        thread.start()
        thread.join()
        if error:
            raise error["exc"]
        return result["value"]


__all__ = ["invoke_llm", "invoke_llm_async"]
