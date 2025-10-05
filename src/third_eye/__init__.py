"""Third Eye MCP package."""

from __future__ import annotations

import os
from pathlib import Path


def _load_env_file() -> None:
    """Load a local .env file into the environment if present.

    This keeps CLI usage in sync with the API/containers by ensuring
    settings like `DATABASE_URL`, `GROQ_API_KEY`, or admin bootstrap
    secrets are available even when commands run outside docker.
    Existing environment variables always win.
    """

    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        os.environ[key] = value.strip().strip('"').strip("'")


_load_env_file()


__all__ = ["config", "logging"]
