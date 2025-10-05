"""Cost metering helpers for LLM usage."""
from __future__ import annotations

import threading
from typing import Dict

_COST_DATA: Dict[str, Dict[str, float]] = {}
_LOCK = threading.Lock()

_COST_PER_1K_TOKENS = {
    "GroqProvider": 0.002,
    "OpenRouterProvider": 0.003,
}


def _cost_per_token(provider: str) -> float:
    return _COST_PER_1K_TOKENS.get(provider, 0.0) / 1000


def record_cost(*, session_id: str, provider: str, input_tokens: int, output_tokens: int) -> None:
    tokens = max(input_tokens, 0) + max(output_tokens, 0)
    if tokens <= 0:
        return
    estimated_cost = tokens * _cost_per_token(provider)
    with _LOCK:
        session = _COST_DATA.setdefault(session_id, {})
        session[provider] = session.get(provider, 0.0) + estimated_cost


def get_costs(session_id: str) -> Dict[str, float]:
    with _LOCK:
        return dict(_COST_DATA.get(session_id, {}))


def reset_costs() -> None:
    with _LOCK:
        _COST_DATA.clear()


__all__ = ["record_cost", "get_costs", "reset_costs"]
