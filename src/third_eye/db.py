"""SQLite persistence for Third Eye MCP."""
from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterable

from .config import CONFIG

_DB_PATH = Path(CONFIG.sqlite.path)
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_INIT_DONE = False


def _ensure_initialized() -> None:
    global _INIT_DONE
    if not _INIT_DONE:
        init_db()
        _INIT_DONE = True


@contextmanager
def conn():
    _ensure_initialized()
    database = sqlite3.connect(_DB_PATH)
    database.execute("PRAGMA journal_mode=WAL;")
    try:
        yield database
    finally:
        database.commit()
        database.close()


def init_db() -> None:
    database = sqlite3.connect(_DB_PATH)
    database.execute("PRAGMA journal_mode=WAL;")
    try:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                tool TEXT NOT NULL,
                topic TEXT,
                input_json TEXT NOT NULL,
                output_json TEXT NOT NULL,
                ts REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS vectors (
                id TEXT PRIMARY KEY,
                topic TEXT NOT NULL,
                vector BLOB NOT NULL,
                ts REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS claims (
                id TEXT PRIMARY KEY,
                claim TEXT NOT NULL,
                url TEXT NOT NULL,
                confidence REAL NOT NULL,
                ts REAL NOT NULL
            );
            """
        )
    finally:
        database.commit()
        database.close()


def record_run(*, run_id: str, tool: str, topic: str | None, input_payload: dict[str, Any], output_payload: dict[str, Any]) -> None:
    with conn() as database:
        database.execute(
            "INSERT OR REPLACE INTO runs (id, tool, topic, input_json, output_json, ts) VALUES (?, ?, ?, ?, ?, ?)",
            (
                run_id,
                tool,
                topic,
                json.dumps(input_payload, ensure_ascii=False),
                json.dumps(output_payload, ensure_ascii=False),
                time.time(),
            ),
        )


def store_vector(*, vector_id: str, topic: str, vector: Iterable[float]) -> None:
    with conn() as database:
        database.execute(
            "INSERT OR REPLACE INTO vectors (id, topic, vector, ts) VALUES (?, ?, ?, ?)",
            (
                vector_id,
                topic,
                json.dumps(list(vector)),
                time.time(),
            ),
        )


def store_claim(*, claim_id: str, claim: str, url: str, confidence: float) -> None:
    with conn() as database:
        database.execute(
            "INSERT OR REPLACE INTO claims (id, claim, url, confidence, ts) VALUES (?, ?, ?, ?, ?)",
            (
                claim_id,
                claim,
                url,
                confidence,
                time.time(),
            ),
        )


__all__ = ["init_db", "record_run", "store_vector", "store_claim"]

# Ensure tables exist for CLI/tests without FastAPI startup
_ensure_initialized()
