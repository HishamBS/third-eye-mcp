"""Structured logging helpers."""
from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from typing import Any

from .config import CONFIG

_LOGGER_CONFIGURED = False


def _configure_root_logger() -> None:
    global _LOGGER_CONFIGURED
    if _LOGGER_CONFIGURED:
        return
    level_name = CONFIG.logging.level.upper()
    level = getattr(logging, level_name, logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    if CONFIG.logging.json:
        handler.setFormatter(logging.Formatter("%(message)s"))
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s"))
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)
    _LOGGER_CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    _configure_root_logger()
    return logging.getLogger(name)


def _default_extra(tag: str, tool: str | None) -> dict[str, Any]:
    return {
        "tag": tag,
        "tool": tool,
        "run_id": str(uuid.uuid4()),
        "ts": time.time(),
    }


def log_json(logger: logging.Logger, tag: str, *, tool: str | None = None, **payload: Any) -> None:
    base = _default_extra(tag, tool)
    base.update(payload)
    if CONFIG.logging.json:
        logger.info(json.dumps(base, ensure_ascii=False))
    else:  # pragma: no cover - exercised when JSON logging disabled
        message = " ".join(f"{k}={v}" for k, v in base.items())
        logger.info(message)


def log_decision(
    *,
    tag: str,
    code: str,
    session_id: str,
    duration_ms: int,
    input_tokens: int = 0,
    output_tokens: int = 0,
    replay_id: str | None = None,
    logger: logging.Logger | None = None,
) -> None:
    """Emit standardized decision logs for Eyes."""

    payload: dict[str, Any] = {
        "tag": tag,
        "code": code,
        "session_id": session_id,
        "duration_ms": duration_ms,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
    }
    if replay_id:
        payload["replay_id"] = replay_id
    logger = logger or get_logger("decisions")
    if CONFIG.logging.json:
        logger.info(json.dumps(payload, ensure_ascii=False))
    else:  # pragma: no cover - exercised when JSON logging disabled
        message = " ".join(f"{k}={v}" for k, v in payload.items())
        logger.info(message)


__all__ = ["get_logger", "log_json", "log_decision"]
