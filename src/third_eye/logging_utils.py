"""Logging helpers for consistent JSON-formatted output."""
from __future__ import annotations

import json
import logging
import os
import socket
import time
from typing import Any, Dict

_HOSTNAME = socket.gethostname()
_CONFIGURED = False


class JsonFormatter(logging.Formatter):
    """Simple JSON log formatter compatible with structured logging sinks."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: Dict[str, Any] = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "filename": record.filename,
            "line": record.lineno,
            "function": record.funcName,
            "process": record.process,
            "thread": record.thread,
            "hostname": _HOSTNAME,
        }
        if hasattr(record, "request_id") and record.request_id:
            payload["request_id"] = record.request_id
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        if record.stack_info:
            payload["stack_info"] = record.stack_info
        return json.dumps(payload, ensure_ascii=False)


def setup_logging(level: str = "INFO", *, json_output: bool = True) -> None:
    """Configure root logger exactly once with JSON output by default."""

    global _CONFIGURED
    root = logging.getLogger()
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    if _CONFIGURED:
        root.setLevel(numeric_level)
        return
    for handler in list(root.handlers):
        root.removeHandler(handler)
    handler = logging.StreamHandler()
    if json_output:
        handler.setFormatter(JsonFormatter())
    else:
        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)s %(name)s [%(process)d] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S",
        )
        handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(numeric_level)
    os.environ.setdefault("LOG_LEVEL", level.upper())
    _CONFIGURED = True


__all__ = ["setup_logging"]
