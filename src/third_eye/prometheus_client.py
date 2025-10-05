"""Lightweight async Prometheus querying helpers."""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from .config import CONFIG

_LOGGER = logging.getLogger(__name__)

PROMETHEUS_TIMEOUT_SECONDS = 5.0


async def query_prometheus(query: str, *, base_url: str | None = None) -> Optional[Dict[str, Any]]:
    """Run an instant query against Prometheus.

    Returns the ``data`` field of the response (or ``None`` if unavailable).
    """

    base_url = base_url or CONFIG.observability.prometheus_base_url
    if not base_url:
        return None

    url = base_url.rstrip('/') + '/api/v1/query'
    params = {"query": query}
    try:
        async with httpx.AsyncClient(timeout=PROMETHEUS_TIMEOUT_SECONDS) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
    except Exception as exc:  # pragma: no cover - surfaced through logs
        _LOGGER.warning("Prometheus query failed", exc_info=exc)
        return None

    try:
        payload = response.json()
    except ValueError as exc:  # pragma: no cover - unexpected payload
        _LOGGER.warning("Failed to decode Prometheus response", exc_info=exc)
        return None

    if payload.get("status") != "success":
        _LOGGER.warning("Prometheus returned error status", extra={"payload": payload})
        return None

    data = payload.get("data")
    if not isinstance(data, dict):
        return None
    return data
