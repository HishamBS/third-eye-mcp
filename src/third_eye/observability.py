"""Metrics helpers for Prometheus integration."""
from __future__ import annotations

from typing import Any, Dict, List

from prometheus_client import Counter, Histogram

REQUEST_COUNTER = Counter(
    "third_eye_requests_total",
    "Total API requests processed",
    labelnames=("tool", "branch", "status"),
)
REQUEST_LATENCY = Histogram(
    "third_eye_request_latency_seconds",
    "Request latency in seconds",
    labelnames=("tool", "branch"),
)
BUDGET_COUNTER = Counter(
    "third_eye_budget_tokens_total",
    "Total budget tokens consumed per API key",
    labelnames=("key_id",),
)


def record_request_metric(*, tool: str, branch: str, status: int, latency: float) -> None:
    """Record a single request metric datapoint."""

    safe_tool = tool or "unknown"
    safe_branch = branch or "shared"
    REQUEST_COUNTER.labels(tool=safe_tool, branch=safe_branch, status=str(status)).inc()
    REQUEST_LATENCY.labels(tool=safe_tool, branch=safe_branch).observe(max(latency, 0.0))


def record_budget_usage(*, key_id: str, tokens: int) -> None:
    """Track token usage for budget monitoring."""

    if tokens <= 0:
        return
    BUDGET_COUNTER.labels(key_id=key_id or "unknown").inc(tokens)


def snapshot_request_totals() -> Dict[str, Any]:
    """Expose totals grouped by tool/status for admin dashboards."""

    collections = REQUEST_COUNTER.collect()
    if not collections:
        return {"total": 0, "by_tool": []}

    by_tool: List[Dict[str, Any]] = []
    total = 0
    for sample in collections[0].samples:
        labels = sample.labels
        tool = labels.get("tool", "unknown")
        status = labels.get("status", "")
        branch = labels.get("branch", "shared")
        count = int(sample.value)
        if count <= 0:
            continue
        total += count
        by_tool.append(
            {
                "tool": tool,
                "status": status,
                "count": count,
                "branch": branch,
            }
        )

    by_tool.sort(key=lambda entry: entry["count"], reverse=True)
    return {"total": total, "by_tool": by_tool}


__all__ = [
    "record_request_metric",
    "record_budget_usage",
    "snapshot_request_totals",
    "REQUEST_COUNTER",
    "REQUEST_LATENCY",
    "BUDGET_COUNTER",
    "reset_metrics_counters",
]


def reset_metrics_counters() -> None:
    """Clear in-process counters so fallback metrics start at zero."""

    REQUEST_COUNTER._metrics.clear()  # type: ignore[attr-defined]
    REQUEST_LATENCY._metrics.clear()  # type: ignore[attr-defined]
    BUDGET_COUNTER._metrics.clear()  # type: ignore[attr-defined]
