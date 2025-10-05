"""Provider benchmarking utilities with Prometheus integration."""
from __future__ import annotations

import threading
from typing import Dict

from prometheus_client import Counter, Histogram

_METRICS: Dict[str, Dict[str, float]] = {}
_LOCK = threading.Lock()

_PROVIDER_LATENCY = Histogram(
    "third_eye_provider_latency_seconds",
    "Latency per provider/tool combination",
    labelnames=("provider", "tool"),
)
_PROVIDER_FAILURES = Counter(
    "third_eye_provider_failures_total",
    "Total provider call failures",
    labelnames=("provider", "tool"),
)


def record_latency(*, provider: str, tool: str, latency: float, success: bool) -> None:
    key = f"{provider}:{tool}"
    safe_latency = max(latency, 0.0)
    with _LOCK:
        bucket = _METRICS.setdefault(key, {"count": 0.0, "sum": 0.0, "failures": 0.0})
        bucket["count"] += 1
        bucket["sum"] += safe_latency
        if not success:
            bucket["failures"] += 1
    _PROVIDER_LATENCY.labels(provider=provider, tool=tool).observe(safe_latency)
    if not success:
        _PROVIDER_FAILURES.labels(provider=provider, tool=tool).inc()


def snapshot() -> Dict[str, Dict[str, float]]:
    with _LOCK:
        data = {key: value.copy() for key, value in _METRICS.items()}
    return data


def reset() -> None:
    with _LOCK:
        _METRICS.clear()


__all__ = [
    "record_latency",
    "snapshot",
    "reset",
]
