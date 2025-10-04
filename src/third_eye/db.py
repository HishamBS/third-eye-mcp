"""Persistence layer with SQLite fallback and PostgreSQL support."""
from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Iterable, Sequence

import asyncio
import os

from .config import CONFIG
from .crypto import SecretKeyMissing, decrypt_text, encrypt_text
from .constants import DataKey, EyeTag
from .personas import PERSONAS

LOGGER = logging.getLogger(__name__)

_DB_PATH = Path(CONFIG.sqlite.path)
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)

_INIT_DONE = False
_POSTGRES_ENV = CONFIG.postgres.dsn_env
_DATABASE_URL = os.getenv(_POSTGRES_ENV)
_USE_POSTGRES = bool(_DATABASE_URL)

_UNSET = object()

if _USE_POSTGRES:
    from .db_postgres import ensure_schema as pg_ensure_schema
    from .db_postgres import record_run as pg_record_run
    from .db_postgres import store_claim as pg_store_claim
    from .db_postgres import store_vector as pg_store_vector
    from .db_postgres import fetch_api_key as pg_fetch_api_key
    from .db_postgres import fetch_api_key_by_id as pg_fetch_api_key_by_id
    from .db_postgres import list_api_keys as pg_list_api_keys
    from .db_postgres import list_known_tenants as pg_list_known_tenants
    from .db_postgres import insert_pipeline_event as pg_insert_pipeline_event
    from .db_postgres import list_pipeline_events as pg_list_pipeline_events
    from .db_postgres import upsert_session_settings as pg_upsert_session_settings
    from .db_postgres import fetch_session_settings as pg_fetch_session_settings
    from .db_postgres import store_embedding as pg_store_embedding
    from .db_postgres import search_embeddings as pg_search_embeddings
    from .db_postgres import update_api_key_limits as pg_update_api_key_limits
    from .db_postgres import revoke_api_key as pg_revoke_api_key
    from .db_postgres import restore_api_key as pg_restore_api_key
    from .db_postgres import touch_api_key as pg_touch_api_key
    from .db_postgres import revoke_api_keys_for_account as pg_revoke_api_keys_for_account
    from .db_postgres import upsert_api_key as pg_upsert_api_key
    from .db_postgres import close_pool as pg_close_pool
    from .db_postgres import health_check as pg_health_check
    from .db_postgres import activate_feature_flag as pg_activate_feature_flag
    from .db_postgres import fetch_active_persona_prompt as pg_fetch_active_persona_prompt
    from .db_postgres import fetch_active_provider_config as pg_fetch_active_provider_config
    from .db_postgres import fetch_feature_flag as pg_fetch_feature_flag
    from .db_postgres import fetch_persona_versions as pg_fetch_persona_versions
    from .db_postgres import fetch_persona_prompt_by_id as pg_fetch_persona_prompt_by_id
    from .db_postgres import list_config_changes as pg_list_config_changes
    from .db_postgres import publish_persona_prompt as pg_publish_persona_prompt
    from .db_postgres import publish_provider_config as pg_publish_provider_config
    from .db_postgres import stage_feature_flag as pg_stage_feature_flag
    from .db_postgres import stage_persona_prompt as pg_stage_persona_prompt
    from .db_postgres import stage_provider_config as pg_stage_provider_config
    from .db_postgres import record_audit_event as pg_record_audit_event
    from .db_postgres import purge_runs as pg_purge_runs
    from .db_postgres import purge_audit as pg_purge_audit
    from .db_postgres import fetch_expired_documents as pg_fetch_expired_documents
    from .db_postgres import delete_documents as pg_delete_documents
    from .db_postgres import list_audit_events as pg_list_audit_events
    from .db_postgres import list_documents as pg_list_documents
    from .db_postgres import update_document_bucket as pg_update_document_bucket
    from .db_postgres import purge_documents_for_session as pg_purge_documents_for_session
    from .db_postgres import create_admin_account as pg_create_admin_account
    from .db_postgres import fetch_admin_by_email as pg_fetch_admin_by_email
    from .db_postgres import fetch_admin_by_id as pg_fetch_admin_by_id
    from .db_postgres import update_admin_password as pg_update_admin_password
    from .db_postgres import update_admin_profile as pg_update_admin_profile
    from .db_postgres import touch_admin_login as pg_touch_admin_login
    from .db_postgres import admin_count as pg_admin_count
    from .db_postgres import list_recent_sessions as pg_list_recent_sessions
    from .db_postgres import fetch_session_tenant as pg_fetch_session_tenant
    from .db_postgres import (
        list_tool_model_mappings_async as pg_list_tool_model_mappings_async,
        get_tool_model_mapping_async as pg_get_tool_model_mapping_async,
        upsert_tool_model_mapping_async as pg_upsert_tool_model_mapping_async,
    )
    from .db_postgres import fetch_environment_settings as pg_fetch_environment_settings
    from .db_postgres import update_environment_settings as pg_update_environment_settings
    from .db_postgres import create_tenant as pg_create_tenant
    from .db_postgres import update_tenant as pg_update_tenant
    from .db_postgres import archive_tenant as pg_archive_tenant
    from .db_postgres import restore_tenant as pg_restore_tenant
    from .db_postgres import fetch_tenant as pg_fetch_tenant
    from .db_postgres import list_tenants as pg_list_tenants
    from .db_postgres import list_profiles as pg_list_profiles
    from .db_postgres import fetch_profile as pg_fetch_profile
    from .db_postgres import upsert_profile as pg_upsert_profile
    from .db_postgres import fetch_provider_state as pg_fetch_provider_state
    from .db_postgres import update_provider_state as pg_update_provider_state


def _run_async(coro: asyncio.coroutines.Coroutine[Any, Any, Any]) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        asyncio.run(coro)
    else:
        raise RuntimeError(
            "Synchronous helper invoked from an active event loop; call the async counterpart instead."
        )


def _ensure_initialized() -> None:
    global _INIT_DONE
    if not _INIT_DONE:
        _init_sqlite()
        _INIT_DONE = True


def _now_ts() -> float:
    return time.time()


def _new_id() -> str:
    return str(uuid.uuid4())


def _checksum_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _checksum_json(value: Any) -> str:
    payload = json.dumps(value, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _environment_defaults_from_config() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    defaults: list[dict[str, Any]] = []
    for tool, mapping in CONFIG.groq.models.tools.items():
        defaults.append(
            {
                "tool": tool,
                "default_provider": "groq",
                "default_model": mapping.primary,
                "fallback_provider": "groq" if mapping.fallback else None,
                "fallback_model": mapping.fallback,
            }
        )
    guardrails = {
        "requests_per_minute": getattr(CONFIG.rate_limits, "per_minute", None),
        "max_tokens_per_request": getattr(CONFIG.budgets, "max_per_request", None),
    }
    return defaults, guardrails


def _observability_defaults_from_config() -> dict[str, Any]:
    return {
        "prometheus_base_url": getattr(getattr(CONFIG, "observability", None), "prometheus_base_url", None)
    }


_SECRET_EXACT = {
    "api_key",
    "apikey",
    "client_secret",
    "secret",
    "access_token",
    "refresh_token",
    "bearer_token",
    "password",
}
_SECRET_SUFFIXES = ("_secret", "_token", "_password", "_api_key")


def _is_secret_key(key: str) -> bool:
    lowered = key.lower()
    if lowered in _SECRET_EXACT:
        return True
    return any(lowered.endswith(suffix) for suffix in _SECRET_SUFFIXES)


def _is_empty_secret(value: Any) -> bool:
    return value in (None, {}, [], ())


def _split_sensitive(value: Any) -> tuple[Any, Any | None]:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        secrets: dict[str, Any] = {}
        for key, item in value.items():
            if _is_secret_key(key):
                secrets[key] = item
                sanitized[key] = "***"
            else:
                san_child, sec_child = _split_sensitive(item)
                sanitized[key] = san_child
                if sec_child is not None and not _is_empty_secret(sec_child):
                    secrets[key] = sec_child
        return sanitized, secrets if secrets else None
    if isinstance(value, list):
        sanitized_list: list[Any] = []
        secrets_list: list[Any | None] = []
        has_secret = False
        for item in value:
            san_child, sec_child = _split_sensitive(item)
            sanitized_list.append(san_child)
            if sec_child is not None and not _is_empty_secret(sec_child):
                secrets_list.append(sec_child)
                has_secret = True
            else:
                secrets_list.append(None)
        return sanitized_list, secrets_list if has_secret else None
    return value, None


def _merge_sensitive(sanitized: Any, secrets: Any | None) -> Any:
    if secrets is None:
        return sanitized
    if isinstance(sanitized, dict):
        result: dict[str, Any] = {}
        for key, value in sanitized.items():
            secret_value = None
            if isinstance(secrets, dict):
                secret_value = secrets.get(key)
            if _is_secret_key(key) and secret_value is not None:
                result[key] = secret_value
            else:
                result[key] = _merge_sensitive(value, secret_value)
        return result
    if isinstance(sanitized, list) and isinstance(secrets, list):
        merged: list[Any] = []
        for idx, item in enumerate(sanitized):
            secret_value = secrets[idx] if idx < len(secrets) else None
            merged.append(_merge_sensitive(item, secret_value))
        return merged
    return secrets if sanitized == "***" else sanitized


def _loads_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        LOGGER.debug("Failed to decode JSON payload; returning default", exc_info=True)
        return default


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


def _init_sqlite() -> None:
    database = sqlite3.connect(_DB_PATH)
    database.execute("PRAGMA journal_mode=WAL;")
    try:
        database.executescript(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id TEXT PRIMARY KEY,
                session_id TEXT,
                tool TEXT NOT NULL,
                eye TEXT,
                code TEXT,
                ok INTEGER,
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
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                hashed_secret TEXT NOT NULL,
                role TEXT NOT NULL,
                limits_json TEXT NOT NULL,
                tenant TEXT,
                display_name TEXT,
                created_at REAL NOT NULL,
                expires_at REAL,
                revoked_at REAL,
                last_used_at REAL,
                rotated_at REAL,
                account_id TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant);
            CREATE TABLE IF NOT EXISTS tenants (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                description TEXT,
                metadata_json TEXT,
                tags_json TEXT,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                archived_at REAL
            );
            CREATE INDEX IF NOT EXISTS idx_tenants_active
                ON tenants(display_name)
                WHERE archived_at IS NULL;
            CREATE TABLE IF NOT EXISTS admin_accounts (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL UNIQUE,
                display_name TEXT,
                password_hash TEXT NOT NULL,
                require_password_reset INTEGER NOT NULL DEFAULT 1,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                last_login_at REAL
            );
            CREATE TABLE IF NOT EXISTS persona_prompts (
                id TEXT PRIMARY KEY,
                persona TEXT NOT NULL,
                version TEXT NOT NULL,
                content_md TEXT NOT NULL,
                checksum TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                staged INTEGER NOT NULL,
                active INTEGER NOT NULL,
                created_by TEXT,
                notes TEXT,
                created_at REAL NOT NULL,
                approved_at REAL,
                supersedes_id TEXT,
                rollback_of TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_persona_prompts_active
                ON persona_prompts(persona)
                WHERE active = 1;
            CREATE INDEX IF NOT EXISTS idx_persona_prompts_staged
                ON persona_prompts(persona)
                WHERE staged = 1;
            CREATE TABLE IF NOT EXISTS provider_configs (
                id TEXT PRIMARY KEY,
                provider TEXT NOT NULL,
                version TEXT NOT NULL,
                config_json TEXT NOT NULL,
                checksum TEXT NOT NULL,
                metadata_json TEXT NOT NULL,
                staged INTEGER NOT NULL,
                active INTEGER NOT NULL,
                created_by TEXT,
                notes TEXT,
                created_at REAL NOT NULL,
                approved_at REAL,
                supersedes_id TEXT,
                rollback_of TEXT,
                secrets_ciphertext TEXT,
                secrets_checksum TEXT,
                rotated_at REAL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_configs_active
                ON provider_configs(provider)
                WHERE active = 1;
            CREATE TABLE IF NOT EXISTS tool_model_mappings (
                tool TEXT PRIMARY KEY,
                primary_provider TEXT NOT NULL,
                primary_model TEXT NOT NULL,
                fallback_provider TEXT,
                fallback_model TEXT,
                updated_by TEXT,
                updated_at REAL NOT NULL DEFAULT (strftime('%s','now'))
            );
            CREATE TABLE IF NOT EXISTS audit (
                id TEXT PRIMARY KEY,
                actor TEXT NOT NULL,
                action TEXT NOT NULL,
                target TEXT,
                metadata TEXT,
                ip TEXT,
                session_id TEXT,
                tenant_id TEXT,
                created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS pipeline_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                eye TEXT NOT NULL,
                event_type TEXT NOT NULL,
                ok INTEGER,
                code TEXT,
                tool_version TEXT,
                md TEXT,
                data TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_pipeline_events_session
                ON pipeline_events(session_id, created_at DESC);
            CREATE TABLE IF NOT EXISTS session_settings (
                session_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS profiles (
                name TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS provider_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                mode TEXT NOT NULL,
                engine TEXT NOT NULL,
                updated_at REAL NOT NULL,
                updated_by TEXT
            );
            CREATE TABLE IF NOT EXISTS environment_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                defaults_json TEXT NOT NULL,
                guardrails_json TEXT NOT NULL,
                observability_json TEXT,
                updated_at REAL,
                updated_by TEXT
            );
            CREATE TABLE IF NOT EXISTS embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                topic TEXT,
                chunk_md TEXT NOT NULL,
                embedding TEXT NOT NULL,
                created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_embeddings_session
                ON embeddings(session_id, created_at DESC);

            CREATE TABLE IF NOT EXISTS docs (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                bucket TEXT NOT NULL,
                path TEXT NOT NULL,
                bytes INTEGER NOT NULL,
                tags TEXT,
                retained_until REAL,
                last_accessed_at REAL,
                created_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_docs_session ON docs(session_id);
            CREATE TABLE IF NOT EXISTS feature_flags (
                id TEXT PRIMARY KEY,
                flag_key TEXT NOT NULL,
                environment TEXT NOT NULL,
                version TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                description TEXT,
                metadata_json TEXT NOT NULL,
                staged INTEGER NOT NULL,
                active INTEGER NOT NULL,
                created_by TEXT,
                notes TEXT,
                created_at REAL NOT NULL,
                activated_at REAL,
                archived_at REAL,
                supersedes_id TEXT,
                rollback_of TEXT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_active
                ON feature_flags(flag_key, environment)
                WHERE active = 1;
            CREATE TABLE IF NOT EXISTS config_change_log (
                id TEXT PRIMARY KEY,
                scope TEXT NOT NULL,
                record_id TEXT NOT NULL,
                action TEXT NOT NULL,
                diff_json TEXT,
                actor TEXT,
                notes TEXT,
                created_at REAL NOT NULL,
                rollback_of TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_config_change_log_record
                ON config_change_log(record_id);
            CREATE INDEX IF NOT EXISTS idx_config_change_log_scope
                ON config_change_log(scope, created_at);
            """
        )
        try:
            database.execute("ALTER TABLE api_keys ADD COLUMN display_name TEXT")
        except sqlite3.OperationalError:
            pass
        # Lightweight migrations for new columns introduced after initial schema creation
        for table, column, ddl in (
            ("feature_flags", "supersedes_id", "supersedes_id TEXT"),
            ("provider_configs", "secrets_ciphertext", "secrets_ciphertext TEXT"),
            ("provider_configs", "secrets_checksum", "secrets_checksum TEXT"),
            ("provider_configs", "rotated_at", "rotated_at REAL"),
            ("api_keys", "rotated_at", "rotated_at REAL"),
            ("api_keys", "account_id", "account_id TEXT"),
            ("audit", "session_id", "session_id TEXT"),
            ("audit", "tenant_id", "tenant_id TEXT"),
            ("runs", "eye", "eye TEXT"),
            ("runs", "code", "code TEXT"),
            ("runs", "ok", "ok INTEGER"),
            ("runs", "session_id", "session_id TEXT"),
            ("environment_settings", "observability_json", "observability_json TEXT"),
        ):
            existing = {row[1] for row in database.execute(f"PRAGMA table_info({table})").fetchall()}
            if column not in existing:
                database.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")

        defaults_cfg, guardrails_cfg = _environment_defaults_from_config()
        observability_cfg = _observability_defaults_from_config()
        database.execute(
            """
            INSERT OR IGNORE INTO environment_settings (id, defaults_json, guardrails_json, observability_json, updated_at, updated_by)
            VALUES (1, ?, ?, ?, strftime('%s','now'), 'bootstrap')
            """,
            (
                json.dumps(defaults_cfg, ensure_ascii=False),
                json.dumps(guardrails_cfg, ensure_ascii=False),
                json.dumps(observability_cfg, ensure_ascii=False),
            ),
        )
    finally:
        database.commit()
        database.close()


async def init_db() -> None:
    if _USE_POSTGRES:
        await pg_ensure_schema()
    else:
        _init_sqlite()

    try:
        await _bootstrap_personas_async()
    except Exception as exc:  # pragma: no cover - bootstrap best effort
        LOGGER.warning("Failed to bootstrap default personas", exc_info=exc)


def record_run(
    *,
    run_id: str,
    tool: str,
    topic: str | None,
    input_payload: dict[str, Any],
    output_payload: dict[str, Any],
    session_id: str | None = None,
    eye: str | None = None,
    code: str | None = None,
    ok: bool | None = None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                record_run_async(
                    run_id=run_id,
                    tool=tool,
                    topic=topic,
                    input_payload=input_payload,
                    output_payload=output_payload,
                    session_id=session_id,
                    eye=eye,
                    code=code,
                    ok=ok,
                )
            )
            return
        raise RuntimeError(
            "record_run() cannot be called from an active event loop; use "
            "await record_run_async() instead."
        )
    _record_run_sqlite(
        run_id=run_id,
        tool=tool,
        topic=topic,
        input_payload=input_payload,
        output_payload=output_payload,
        session_id=session_id,
        eye=eye,
        code=code,
        ok=ok,
    )


def _record_run_sqlite(
    *,
    run_id: str,
    tool: str,
    topic: str | None,
    input_payload: dict[str, Any],
    output_payload: dict[str, Any],
    session_id: str | None,
    eye: str | None,
    code: str | None,
    ok: bool | None,
) -> None:
    with conn() as database:
        database.execute(
            "INSERT OR REPLACE INTO runs (id, tool, topic, input_json, output_json, eye, code, ok, session_id, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                run_id,
                tool,
                topic,
                json.dumps(input_payload, ensure_ascii=False),
                json.dumps(output_payload, ensure_ascii=False),
                eye,
                code,
                int(ok) if ok is not None else None,
                session_id,
                time.time(),
            ),
        )


async def record_run_async(
    *,
    run_id: str,
    tool: str,
    topic: str | None,
    input_payload: dict[str, Any],
    output_payload: dict[str, Any],
    session_id: str | None = None,
    eye: str | None = None,
    code: str | None = None,
    ok: bool | None = None,
) -> None:
    if _USE_POSTGRES:
        await pg_record_run(
            run_id=run_id,
            tool=tool,
            topic=topic,
            input_payload=input_payload,
            output_payload=output_payload,
            session_id=session_id,
            eye=eye,
            code=code,
            ok=ok,
        )
        return
    await asyncio.to_thread(
        _record_run_sqlite,
        run_id=run_id,
        tool=tool,
        topic=topic,
        input_payload=input_payload,
        output_payload=output_payload,
        session_id=session_id,
        eye=eye,
        code=code,
        ok=ok,
    )


def store_vector(*, vector_id: str, topic: str, vector: Iterable[float]) -> None:
    if _USE_POSTGRES:
        _run_async(pg_store_vector(vector_id=vector_id, topic=topic, vector=vector))
    else:
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
    if _USE_POSTGRES:
        _run_async(pg_store_claim(claim_id=claim_id, claim=claim, url=url, confidence=confidence))
    else:
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


def upsert_api_key(
    *,
    key_id: str,
    hashed_secret: str,
    role: str,
    limits_json: dict[str, Any],
    tenant: str | None = None,
    expires_at: float | None = None,
    revoked_at: float | None = None,
    rotated_at: float | None = None,
    account_id: str | None = None,
    display_name: str | None = None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                upsert_api_key_async(
                    key_id=key_id,
                    hashed_secret=hashed_secret,
                    role=role,
                    limits_json=limits_json,
                    tenant=tenant,
                    expires_at=expires_at,
                    revoked_at=revoked_at,
                    rotated_at=rotated_at,
                    account_id=account_id,
                    display_name=display_name,
                )
            )
            return
        raise RuntimeError(
            "upsert_api_key() cannot be called from an active event loop; use "
            "await upsert_api_key_async() instead."
        )
    _upsert_api_key_sqlite(
        key_id=key_id,
        hashed_secret=hashed_secret,
        role=role,
        limits_json=limits_json,
        tenant=tenant,
        expires_at=expires_at,
        revoked_at=revoked_at,
        rotated_at=rotated_at,
        account_id=account_id,
        display_name=display_name,
    )


def _upsert_api_key_sqlite(
    *,
    key_id: str,
    hashed_secret: str,
    role: str,
    limits_json: dict[str, Any],
    tenant: str | None,
    expires_at: float | None,
    revoked_at: float | None,
    rotated_at: float | None,
    account_id: str | None,
    display_name: str | None,
) -> None:
    with conn() as database:
        rotated_at_value = rotated_at
        if rotated_at_value is None:
            existing = database.execute(
                "SELECT hashed_secret, rotated_at FROM api_keys WHERE id = ?",
                (key_id,),
            ).fetchone()
            if existing and existing[0] == hashed_secret:
                rotated_at_value = existing[1]
            else:
                rotated_at_value = _now_ts()
        database.execute(
            """
            INSERT OR REPLACE INTO api_keys (
                id, hashed_secret, role, limits_json, tenant, display_name, created_at,
                expires_at, revoked_at, rotated_at, account_id
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                key_id,
                hashed_secret,
                role,
                json.dumps(limits_json),
                tenant,
                display_name,
                _now_ts(),
                expires_at,
                revoked_at,
                rotated_at_value,
                account_id,
            ),
        )


async def upsert_api_key_async(
    *,
    key_id: str,
    hashed_secret: str,
    role: str,
    limits_json: dict[str, Any],
    tenant: str | None = None,
    expires_at: float | None = None,
    revoked_at: float | None = None,
    rotated_at: float | None = None,
    account_id: str | None = None,
    display_name: str | None = None,
) -> None:
    if _USE_POSTGRES:
        await pg_upsert_api_key(
            key_id=key_id,
            hashed_secret=hashed_secret,
            role=role,
            limits_json=limits_json,
            tenant=tenant,
            expires_at=expires_at,
            revoked_at=revoked_at,
            rotated_at=rotated_at or _now_ts(),
            account_id=account_id,
            display_name=display_name,
        )
        return
    await asyncio.to_thread(
        _upsert_api_key_sqlite,
        key_id=key_id,
        hashed_secret=hashed_secret,
        role=role,
        limits_json=limits_json,
        tenant=tenant,
        expires_at=expires_at,
        revoked_at=revoked_at,
        rotated_at=rotated_at,
        account_id=account_id,
        display_name=display_name,
    )


def fetch_api_key(*, hashed_secret: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_api_key(hashed_secret=hashed_secret))
        raise RuntimeError(
            "fetch_api_key() cannot be called from an active event loop; use "
            "await fetch_api_key_async() instead."
        )
    return _fetch_api_key_sqlite(hashed_secret=hashed_secret)


def _fetch_api_key_sqlite(*, hashed_secret: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            "SELECT id, role, limits_json, tenant, display_name, expires_at, revoked_at, rotated_at, account_id FROM api_keys WHERE hashed_secret = ?",
            (hashed_secret,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "role": row[1],
        "limits": json.loads(row[2] or "{}"),
        "tenant": row[3],
        "display_name": row[4],
        "expires_at": row[5],
        "revoked_at": row[6],
        "rotated_at": row[7],
        "account_id": row[8],
    }


async def fetch_api_key_async(*, hashed_secret: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_api_key(hashed_secret=hashed_secret)
    return await asyncio.to_thread(_fetch_api_key_sqlite, hashed_secret=hashed_secret)


def fetch_api_key_by_id(*, key_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_api_key_by_id(key_id))
        raise RuntimeError(
            "fetch_api_key_by_id() cannot be called from an active event loop; use "
            "await fetch_api_key_by_id_async() instead."
        )
    return _fetch_api_key_by_id_sqlite(key_id=key_id)


def _fetch_api_key_by_id_sqlite(*, key_id: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            """
            SELECT id, role, limits_json, tenant, display_name, created_at, expires_at, revoked_at, last_used_at, rotated_at, account_id
            FROM api_keys
            WHERE id = ?
            """,
            (key_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "role": row[1],
        "limits": json.loads(row[2] or "{}"),
        "tenant": row[3],
        "display_name": row[4],
        "created_at": row[5],
        "expires_at": row[6],
        "revoked_at": row[7],
        "last_used_at": row[8],
        "rotated_at": row[9],
        "account_id": row[10],
    }


async def fetch_api_key_by_id_async(*, key_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_api_key_by_id(key_id)
    return await asyncio.to_thread(_fetch_api_key_by_id_sqlite, key_id=key_id)


def log_pipeline_event(
    *,
    session_id: str,
    eye: str,
    event_type: str = "eye_update",
    ok: bool | None,
    code: str | None,
    tool_version: str | None,
    md: str | None,
    data: dict[str, Any] | None,
) -> None:
    if not session_id:
        return
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            _run_async(
                pg_insert_pipeline_event(
                    session_id=session_id,
                    eye=eye,
                    event_type=event_type,
                    ok=ok,
                    code=code,
                    tool_version=tool_version,
                    md=md,
                    data=data or {},
                )
            )
            return
        raise RuntimeError(
            "log_pipeline_event() cannot be called from an active event loop; use "
            "await log_pipeline_event_async() instead."
        )
    _log_pipeline_event_sqlite(
        session_id=session_id,
        eye=eye,
        event_type=event_type,
        ok=ok,
        code=code,
        tool_version=tool_version,
        md=md,
        data=data or {},
    )


def _log_pipeline_event_sqlite(
    *,
    session_id: str,
    eye: str,
    event_type: str,
    ok: bool | None,
    code: str | None,
    tool_version: str | None,
    md: str | None,
    data: dict[str, Any],
) -> None:
    now = time.time()
    with conn() as database:
        database.execute(
            """
            INSERT INTO pipeline_events (session_id, eye, event_type, ok, code, tool_version, md, data, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                eye,
                event_type,
                int(ok) if ok is not None else None,
                code,
                tool_version,
                md,
                json.dumps(data, ensure_ascii=False),
                now,
            ),
        )


async def log_pipeline_event_async(
    *,
    session_id: str,
    eye: str,
    event_type: str = "eye_update",
    ok: bool | None,
    code: str | None,
    tool_version: str | None,
    md: str | None,
    data: dict[str, Any] | None,
) -> None:
    if not session_id:
        return
    if _USE_POSTGRES:
        await pg_insert_pipeline_event(
            session_id=session_id,
            eye=eye,
            event_type=event_type,
            ok=ok,
            code=code,
            tool_version=tool_version,
            md=md,
            data=data or {},
        )
    else:
        await asyncio.to_thread(
            _log_pipeline_event_sqlite,
            session_id=session_id,
            eye=eye,
            event_type=event_type,
            ok=ok,
            code=code,
            tool_version=tool_version,
            md=md,
            data=data or {},
        )


def list_pipeline_events(
    *,
    session_id: str,
    from_ts: float | None = None,
    to_ts: float | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                pg_list_pipeline_events(
                    session_id=session_id,
                    from_ts=from_ts,
                    to_ts=to_ts,
                    limit=limit,
                )
            )
        raise RuntimeError(
            "list_pipeline_events() cannot be called from an active event loop; use "
            "await list_pipeline_events_async() instead."
        )
    return _list_pipeline_events_sqlite(
        session_id=session_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
    )


def _list_pipeline_events_sqlite(
    *,
    session_id: str,
    from_ts: float | None,
    to_ts: float | None,
    limit: int,
) -> list[dict[str, Any]]:
    clauses = ["session_id = ?"]
    params: list[Any] = [session_id]
    if from_ts is not None:
        clauses.append("created_at >= ?")
        params.append(from_ts)
    if to_ts is not None:
        clauses.append("created_at <= ?")
        params.append(to_ts)
    where_clause = " WHERE " + " AND ".join(clauses)
    query = (
        "SELECT id, eye, event_type, ok, code, tool_version, md, data, created_at "
        "FROM pipeline_events"
        f"{where_clause} ORDER BY created_at DESC LIMIT ?"
    )
    params.append(limit)
    with conn() as database:
        rows = database.execute(query, tuple(params)).fetchall()
        if not rows:
            fallback_clauses = ["tenant IS NOT NULL", "tenant != ''"]
            fallback_params: list[Any] = []
            if search:
                like = f"%{search.lower()}%"
                fallback_clauses.append("LOWER(tenant) LIKE ?")
                fallback_params.append(like)
            fallback_where = " WHERE " + " AND ".join(fallback_clauses) if fallback_clauses else ""
            fallback_query = (
                """
                SELECT tenant AS id,
                       tenant AS display_name,
                       NULL AS description,
                       NULL AS metadata_json,
                       NULL AS tags_json,
                       MIN(created_at) AS created_at,
                       MAX(created_at) AS updated_at,
                       NULL AS archived_at,
                       SUM(CASE WHEN revoked_at IS NULL THEN 1 ELSE 0 END) AS active_keys,
                       COUNT(id) AS total_keys,
                       MAX(rotated_at) AS last_key_rotated_at,
                       MAX(last_used_at) AS last_key_used_at
                FROM api_keys
                %s
                GROUP BY tenant
                ORDER BY tenant ASC
                LIMIT ? OFFSET ?
                """
                % fallback_where
            )
            fallback_params.extend([limit, offset])
            rows = database.execute(fallback_query, tuple(fallback_params)).fetchall()
    events: list[dict[str, Any]] = []
    for row in rows:
        events.append(
            {
                "id": row[0],
                "eye": row[1],
                "event_type": row[2],
                "ok": bool(row[3]) if row[3] is not None else None,
                "code": row[4],
                "tool_version": row[5],
                "md": row[6],
                "data": json.loads(row[7] or "{}"),
                "created_at": row[8],
            }
        )
    return events


def _list_recent_sessions(limit: int) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_list_recent_sessions(limit))
        raise RuntimeError(
            "_list_recent_sessions() cannot be called from an active event loop; use "
            "await list_recent_sessions_async() instead."
        )
    return _list_recent_sessions_sqlite(limit)


def _list_recent_sessions_sqlite(limit: int) -> list[dict[str, Any]]:
    with conn() as database:
        rows = database.execute(
            """
            SELECT session_id,
                   MIN(created_at) AS created_at,
                   MAX(created_at) AS last_event_at
            FROM pipeline_events
            GROUP BY session_id
            ORDER BY last_event_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "session_id": row[0],
            "created_at": row[1],
            "last_event_at": row[2],
        }
        for row in rows
    ]


def fetch_session_tenant(session_id: str) -> str | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_session_tenant(session_id))
        raise RuntimeError(
            "fetch_session_tenant() cannot be called from an active event loop; use "
            "await fetch_session_tenant_async() instead."
        )
    with conn() as database:
        row = database.execute(
            """
            SELECT tenant_id
            FROM audit
            WHERE session_id = ? AND tenant_id IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (session_id,),
        ).fetchone()
    if not row:
        return None
    tenant = row[0]
    return tenant if tenant else None


def _isoformat(ts: float | None) -> str | None:
    if ts is None:
        return None
    try:
        numeric = float(ts)
    except (TypeError, ValueError):
        return None
    return datetime.fromtimestamp(numeric, tz=timezone.utc).isoformat()


def _extract_summary_text(md: str | None, data: dict[str, Any] | None) -> str | None:
    if md and isinstance(md, str) and md.strip():
        for line in md.splitlines():
            stripped = line.strip().lstrip('#').strip()
            if stripped:
                return stripped
    payload = data or {}
    summary = payload.get(DataKey.SUMMARY_MD.value)
    if isinstance(summary, str) and summary.strip():
        for line in summary.splitlines():
            stripped = line.strip().lstrip('#').strip()
            if stripped:
                return stripped
    return None


def _determine_status(events: list[dict[str, Any]]) -> str:
    for event in events:
        eye = event.get("eye") or ""
        ok = event.get("ok")
        if eye == EyeTag.RINNEGAN_FINAL.name and ok is True:
            return "approved"
        if ok is False:
            return "blocked"
    return "in_progress"


def _build_session_overview(
    *,
    session_id: str,
    events: list[dict[str, Any]],
    created_at: float | None = None,
    last_event_at: float | None = None,
) -> dict[str, Any]:
    if not events:
        return {
            "session_id": session_id,
            "title": f"Session {session_id}",
            "status": "in_progress",
            "created_at": None,
            "last_event_at": None,
            "eye_counts": {"approvals": 0, "rejections": 0},
        }
    approvals = sum(1 for event in events if event.get("ok") is True)
    rejections = sum(1 for event in events if event.get("ok") is False)
    title = None
    for event in events:
        if event.get("eye") == EyeTag.SHARINGAN.name:
            title = _extract_summary_text(event.get("md"), event.get("data"))
            if title:
                break
    if not title:
        for event in events:
            title = _extract_summary_text(event.get("md"), event.get("data"))
            if title:
                break
    if not title:
        title = f"Session {session_id[:8]}" if session_id else "Session"
    created_ts = created_at if created_at is not None else events[-1].get("created_at")
    last_ts = last_event_at if last_event_at is not None else events[0].get("created_at")
    return {
        "session_id": session_id,
        "title": title,
        "status": _determine_status(events),
        "created_at": _isoformat(created_ts),
        "last_event_at": _isoformat(last_ts),
        "eye_counts": {
            "approvals": approvals,
            "rejections": rejections,
        },
    }


def get_recent_sessions(limit: int = 20) -> list[dict[str, Any]]:
    sessions: list[dict[str, Any]] = []
    for row in _list_recent_sessions(limit):
        session_id = row["session_id"]
        events = list_pipeline_events(session_id=session_id, limit=200)
        if not events:
            continue
        overview = _build_session_overview(
            session_id=session_id,
            events=events,
            created_at=row.get("created_at"),
            last_event_at=row.get("last_event_at"),
        )
        overview["tenant"] = fetch_session_tenant(session_id)
        sessions.append(overview)
    return sessions


def get_session_detail(session_id: str) -> dict[str, Any] | None:
    events = list_pipeline_events(session_id=session_id, limit=500)
    if not events:
        return None
    detail = _build_session_overview(session_id=session_id, events=events)
    detail["tenant"] = fetch_session_tenant(session_id)

    latest_by_eye: dict[str, dict[str, Any]] = {}
    for event in events:
        eye = event.get("eye") or "UNKNOWN"
        if eye not in latest_by_eye:
            latest_by_eye[eye] = event

    eyes: list[dict[str, Any]] = []
    for item in sorted(latest_by_eye.values(), key=lambda entry: entry.get("created_at") or 0, reverse=True):
        eyes.append(
            {
                "eye": item.get("eye"),
                "ok": item.get("ok"),
                "code": item.get("code"),
                "tool_version": item.get("tool_version"),
                "md": item.get("md"),
                "data": item.get("data") or {},
                "ts": _isoformat(item.get("created_at")),
            }
        )
    detail["eyes"] = eyes

    timeline = [
        {
            "eye": event.get("eye"),
            "event_type": event.get("event_type"),
            "ok": event.get("ok"),
            "code": event.get("code"),
            "tool_version": event.get("tool_version"),
            "md": event.get("md"),
            "data": event.get("data") or {},
            "ts": _isoformat(event.get("created_at")),
        }
        for event in reversed(events)
    ]
    detail["events"] = timeline
    detail["settings"] = fetch_session_settings(session_id) or {}
    return detail


async def get_session_detail_async(session_id: str) -> dict[str, Any] | None:
    events = await list_pipeline_events_async(session_id=session_id, limit=500)
    if not events:
        return None
    detail = _build_session_overview(session_id=session_id, events=events)
    detail["tenant"] = await fetch_session_tenant_async(session_id)

    latest_by_eye: dict[str, dict[str, Any]] = {}
    for event in events:
        eye = event.get("eye") or "UNKNOWN"
        if eye not in latest_by_eye:
            latest_by_eye[eye] = event

    eyes: list[dict[str, Any]] = []
    for item in sorted(latest_by_eye.values(), key=lambda entry: entry.get("created_at") or 0, reverse=True):
        eyes.append(
            {
                "eye": item.get("eye"),
                "ok": item.get("ok"),
                "code": item.get("code"),
                "tool_version": item.get("tool_version"),
                "md": item.get("md"),
                "data": item.get("data") or {},
                "ts": _isoformat(item.get("created_at")),
            }
        )
    detail["eyes"] = eyes

    timeline = [
        {
            "eye": event.get("eye"),
            "event_type": event.get("event_type"),
            "ok": event.get("ok"),
            "code": event.get("code"),
            "tool_version": event.get("tool_version"),
            "md": event.get("md"),
            "data": event.get("data") or {},
            "ts": _isoformat(event.get("created_at")),
        }
        for event in reversed(events)
    ]
    detail["events"] = timeline
    detail["settings"] = await get_session_settings_async(session_id)
    return detail


async def list_pipeline_events_async(
    *,
    session_id: str,
    from_ts: float | None = None,
    to_ts: float | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_list_pipeline_events(
            session_id=session_id,
            from_ts=from_ts,
            to_ts=to_ts,
            limit=limit,
        )
    return await asyncio.to_thread(
        _list_pipeline_events_sqlite,
        session_id=session_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
    )


async def list_recent_sessions_async(limit: int = 20) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        rows = await pg_list_recent_sessions(limit)
    else:
        rows = await asyncio.to_thread(_list_recent_sessions_sqlite, limit)
    sessions: list[dict[str, Any]] = []
    for row in rows:
        session_id = row["session_id"]
        events = await list_pipeline_events_async(session_id=session_id, limit=200)
        if not events:
            continue
        overview = _build_session_overview(
            session_id=session_id,
            events=events,
            created_at=row.get("created_at"),
            last_event_at=row.get("last_event_at"),
        )
        overview["tenant"] = await fetch_session_tenant_async(session_id)
        sessions.append(overview)
    return sessions


async def fetch_session_tenant_async(session_id: str) -> str | None:
    if _USE_POSTGRES:
        return await pg_fetch_session_tenant(session_id)
    return await asyncio.to_thread(fetch_session_tenant, session_id)
def upsert_session_settings(*, session_id: str, data: dict[str, Any]) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            _run_async(pg_upsert_session_settings(session_id=session_id, data=data))
            return
        raise RuntimeError(
            "upsert_session_settings() cannot be called from an active event loop; use "
            "await upsert_session_settings_async() instead."
        )
    _upsert_session_settings_sqlite(session_id=session_id, data=data)


def _upsert_session_settings_sqlite(*, session_id: str, data: dict[str, Any]) -> None:
    now = time.time()
    payload = json.dumps(data or {}, ensure_ascii=False)
    with conn() as database:
        database.execute(
            """
            INSERT INTO session_settings (session_id, data, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            """,
            (session_id, payload, now, now),
        )


async def upsert_session_settings_async(*, session_id: str, data: dict[str, Any]) -> None:
    if _USE_POSTGRES:
        await pg_upsert_session_settings(session_id=session_id, data=data)
    else:
        await asyncio.to_thread(_upsert_session_settings_sqlite, session_id=session_id, data=data)


def get_session_settings(session_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_session_settings(session_id))
        raise RuntimeError(
            "get_session_settings() cannot be called from an active event loop; use "
            "await get_session_settings_async() instead."
        )
    with conn() as database:
        row = database.execute(
            "SELECT data FROM session_settings WHERE session_id = ?",
            (session_id,),
        ).fetchone()
    if not row:
        return None
    return json.loads(row[0] or "{}")


async def get_session_settings_async(session_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_session_settings(session_id)
    return await asyncio.to_thread(get_session_settings, session_id)


def list_profiles() -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_list_profiles())
        raise RuntimeError(
            "list_profiles() cannot be called from an active event loop; use await list_profiles_async() instead."
        )
    _ensure_initialized()
    return _list_profiles_sqlite()


def _list_profiles_sqlite() -> list[dict[str, Any]]:
    with conn() as database:
        rows = database.execute(
            "SELECT name, data, created_at, updated_at FROM profiles ORDER BY name"
        ).fetchall()
    profiles: list[dict[str, Any]] = []
    for name, data_text, created_at, updated_at in rows:
        payload = json.loads(data_text or "{}")
        profiles.append(
            {
                "name": name,
                "data": payload,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
    return profiles


def _fetch_profile_sqlite(name: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            "SELECT data, created_at, updated_at FROM profiles WHERE name = ?",
            (name,),
        ).fetchone()
    if not row:
        return None
    data_text, created_at, updated_at = row
    return {
        "name": name,
        "data": json.loads(data_text or "{}"),
        "created_at": created_at,
        "updated_at": updated_at,
    }


def _upsert_profile_sqlite(*, name: str, data: dict[str, Any]) -> dict[str, Any]:
    now = _now_ts()
    payload = json.dumps(data or {}, ensure_ascii=False)
    with conn() as database:
        database.execute(
            """
            INSERT INTO profiles (name, data, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
            """,
            (name, payload, now, now),
        )
    return _fetch_profile_sqlite(name)


async def list_profiles_async() -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_list_profiles()
    return await asyncio.to_thread(_list_profiles_sqlite)


def fetch_profile(name: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_profile(name))
        raise RuntimeError(
            "fetch_profile() cannot be called from an active event loop; use await fetch_profile_async() instead."
        )
    _ensure_initialized()
    return _fetch_profile_sqlite(name)


async def fetch_profile_async(name: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_profile(name)
    return await asyncio.to_thread(_fetch_profile_sqlite, name)


def upsert_profile(*, name: str, data: dict[str, Any], actor: str | None = None) -> dict[str, Any]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_upsert_profile(name=name, data=data, actor=actor))
        raise RuntimeError(
            "upsert_profile() cannot be called from an active event loop; use await upsert_profile_async() instead."
        )
    _ensure_initialized()
    record = _upsert_profile_sqlite(name=name, data=data)
    _record_change_sqlite(
        scope="profile",
        record_id=name,
        action="upsert",
        diff=data,
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return record


async def upsert_profile_async(*, name: str, data: dict[str, Any], actor: str | None = None) -> dict[str, Any]:
    if _USE_POSTGRES:
        return await pg_upsert_profile(name=name, data=data, actor=actor)
    record = await asyncio.to_thread(_upsert_profile_sqlite, name=name, data=data)
    _record_change_sqlite(
        scope="profile",
        record_id=name,
        action="upsert",
        diff=data,
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return record


def _get_provider_state_sqlite() -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            "SELECT mode, engine, updated_at, updated_by FROM provider_state WHERE id = 1"
        ).fetchone()
    if not row:
        return None
    mode, engine_text, updated_at, updated_by = row
    engine = json.loads(engine_text or "{}")
    return {
        "mode": mode,
        "engine": engine,
        "updated_at": updated_at,
        "updated_by": updated_by,
    }


def _update_provider_state_sqlite(
    *,
    mode: str,
    engine: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    now = _now_ts()
    payload = json.dumps(engine or {}, ensure_ascii=False)
    with conn() as database:
        database.execute(
            """
            INSERT INTO provider_state (id, mode, engine, updated_at, updated_by)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                mode = excluded.mode,
                engine = excluded.engine,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
            """,
            (mode, payload, now, actor),
        )
    _record_change_sqlite(
        scope="provider_state",
        record_id="global",
        action="update",
        diff={"mode": mode, "engine": engine},
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return _get_provider_state_sqlite()


async def fetch_provider_state_async() -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_provider_state()
    return await asyncio.to_thread(_get_provider_state_sqlite)


def fetch_provider_state() -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_provider_state())
        raise RuntimeError(
            "fetch_provider_state() cannot be called from an active event loop; use await fetch_provider_state_async() instead."
        )
    _ensure_initialized()
    return _get_provider_state_sqlite()


async def update_provider_state_async(
    *,
    mode: str,
    engine: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    if _USE_POSTGRES:
        return await pg_update_provider_state(mode=mode, engine=engine, actor=actor)
    return await asyncio.to_thread(
        _update_provider_state_sqlite,
        mode=mode,
        engine=engine,
        actor=actor,
    )


def update_provider_state(
    *,
    mode: str,
    engine: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_update_provider_state(mode=mode, engine=engine, actor=actor))
        raise RuntimeError(
            "update_provider_state() cannot be called from an active event loop; use await update_provider_state_async() instead."
        )
    _ensure_initialized()
    return _update_provider_state_sqlite(mode=mode, engine=engine, actor=actor)


def _get_environment_settings_sqlite() -> dict[str, Any]:
    defaults_cfg, guardrails_cfg = _environment_defaults_from_config()
    observability_cfg = _observability_defaults_from_config()
    with conn() as database:
        row = database.execute(
            "SELECT defaults_json, guardrails_json, observability_json, updated_at, updated_by FROM environment_settings WHERE id = 1"
        ).fetchone()
    if not row:
        return {
            "defaults": defaults_cfg,
            "guardrails": guardrails_cfg,
            "observability": observability_cfg,
            "updated_at": None,
            "updated_by": None,
        }
    defaults = json.loads(row[0]) if row[0] else defaults_cfg
    guardrails = json.loads(row[1]) if row[1] else guardrails_cfg
    observability = json.loads(row[2]) if row[2] else observability_cfg
    return {
        "defaults": defaults,
        "guardrails": guardrails,
        "observability": observability,
        "updated_at": row[3],
        "updated_by": row[4],
    }


def _update_environment_settings_sqlite(
    *,
    defaults: list[dict[str, Any]],
    guardrails: dict[str, Any],
    observability: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    now = time.time()
    payload_defaults = json.dumps(defaults, ensure_ascii=False)
    payload_guardrails = json.dumps(guardrails, ensure_ascii=False)
    payload_observability = json.dumps(observability, ensure_ascii=False)
    with conn() as database:
        database.execute(
            """
            INSERT INTO environment_settings (id, defaults_json, guardrails_json, observability_json, updated_at, updated_by)
            VALUES (1, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE
            SET defaults_json = excluded.defaults_json,
                guardrails_json = excluded.guardrails_json,
                observability_json = excluded.observability_json,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by
            """,
            (payload_defaults, payload_guardrails, payload_observability, now, actor),
        )
    _record_change_sqlite(
        scope="environment_settings",
        record_id="global",
        action="update",
        diff={"defaults": defaults, "guardrails": guardrails, "observability": observability},
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return _get_environment_settings_sqlite()


def get_environment_settings() -> dict[str, Any]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_environment_settings())
        raise RuntimeError(
            "get_environment_settings() cannot be called from an active event loop; use "
            "await get_environment_settings_async() instead."
        )
    return _get_environment_settings_sqlite()


async def get_environment_settings_async() -> dict[str, Any]:
    if _USE_POSTGRES:
        return await pg_fetch_environment_settings()
    return await asyncio.to_thread(_get_environment_settings_sqlite)


def update_environment_settings(
    *,
    defaults: list[dict[str, Any]],
    guardrails: dict[str, Any],
    observability: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    if _USE_POSTGRES:
        return asyncio.run(
            pg_update_environment_settings(
                defaults=defaults,
                guardrails=guardrails,
                observability=observability,
                actor=actor,
            )
        )
    return _update_environment_settings_sqlite(
        defaults=defaults,
        guardrails=guardrails,
        observability=observability,
        actor=actor,
    )


async def update_environment_settings_async(
    *,
    defaults: list[dict[str, Any]],
    guardrails: dict[str, Any],
    observability: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    if _USE_POSTGRES:
        return await pg_update_environment_settings(
            defaults=defaults,
            guardrails=guardrails,
            observability=observability,
            actor=actor,
        )
    return await asyncio.to_thread(
        _update_environment_settings_sqlite,
        defaults=defaults,
        guardrails=guardrails,
        observability=observability,
        actor=actor,
    )


async def _bootstrap_personas_async() -> None:
    for key, persona in PERSONAS.items():
        try:
            existing = await get_active_persona_prompt_async(key)
        except Exception as exc:
            LOGGER.warning("Failed checking persona '%s'", key, exc_info=exc)
            continue
        if existing:
            continue
        try:
            metadata = {"seed": "default"}
            version = time.strftime("seed-%Y%m%d")
            if _USE_POSTGRES:
                prompt_id = str(uuid.uuid4())
                await pg_stage_persona_prompt(
                    prompt_id=prompt_id,
                    persona=key,
                    version=version,
                    content_md=persona.system_prompt,
                    checksum=_checksum_text(persona.system_prompt),
                    metadata=metadata,
                    created_by="bootstrap",
                    notes="Imported from personas.py",
                    rollback_of=None,
                )
                await pg_publish_persona_prompt(prompt_id=prompt_id, actor="bootstrap", notes="Initial seed")
            else:
                prompt_id = stage_persona_prompt(
                    persona=key,
                    content_md=persona.system_prompt,
                    version=version,
                    metadata=metadata,
                    author="bootstrap",
                    notes="Imported from personas.py",
                    rollback_of=None,
                    prompt_id=str(uuid.uuid4()),
                )
                publish_persona_prompt(prompt_id=prompt_id, actor="bootstrap", notes="Initial seed")
        except Exception as exc:  # pragma: no cover - surface via logs, continue
            LOGGER.warning("Failed seeding persona '%s'", key, exc_info=exc)



def store_embedding(
    *,
    session_id: str,
    topic: str | None,
    chunk_md: str,
    embedding: list[float],
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            _run_async(
                pg_store_embedding(
                    session_id=session_id,
                    topic=topic,
                    chunk_md=chunk_md,
                    embedding=embedding,
                )
            )
            return
        raise RuntimeError(
            "store_embedding() cannot be called from an active event loop; use "
            "await store_embedding_async() instead."
        )
    _store_embedding_sqlite(
        session_id=session_id,
        topic=topic,
        chunk_md=chunk_md,
        embedding=embedding,
    )


def _store_embedding_sqlite(
    *, session_id: str, topic: str | None, chunk_md: str, embedding: list[float]
) -> None:
    now = time.time()
    with conn() as database:
        database.execute(
            """
            INSERT INTO embeddings (session_id, topic, chunk_md, embedding, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                session_id,
                topic,
                chunk_md,
                json.dumps(embedding, ensure_ascii=False),
                now,
            ),
        )


async def store_embedding_async(
    *,
    session_id: str,
    topic: str | None,
    chunk_md: str,
    embedding: list[float],
) -> None:
    if _USE_POSTGRES:
        await pg_store_embedding(
            session_id=session_id,
            topic=topic,
            chunk_md=chunk_md,
            embedding=embedding,
        )
    else:
        await asyncio.to_thread(
            _store_embedding_sqlite,
            session_id=session_id,
            topic=topic,
            chunk_md=chunk_md,
            embedding=embedding,
        )


def search_embeddings(
    *,
    session_id: str,
    query_vector: list[float],
    limit: int = 5,
    topic: str | None = None,
    exclude_session_id: str | None = None,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                search_embeddings_async(
                    session_id=session_id,
                    query_vector=query_vector,
                    limit=limit,
                    topic=topic,
                    exclude_session_id=exclude_session_id,
                )
            )
        raise RuntimeError(
            "search_embeddings() cannot be called from an active event loop; use "
            "await search_embeddings_async() instead."
        )
    return _search_embeddings_sqlite(
        session_id=session_id,
        query_vector=query_vector,
        limit=limit,
        topic=topic,
        exclude_session_id=exclude_session_id,
    )


def _search_embeddings_sqlite(
    *,
    session_id: str,
    query_vector: list[float],
    limit: int,
    topic: str | None,
    exclude_session_id: str | None,
) -> list[dict[str, Any]]:
    with conn() as database:
        clauses = []
        params: list[Any] = []
        if topic:
            clauses.append("topic = ?")
            params.append(topic)
        if exclude_session_id:
            clauses.append("session_id <> ?")
            params.append(exclude_session_id)
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        rows = database.execute(
            f"SELECT id, session_id, topic, chunk_md, embedding, created_at FROM embeddings{where} ORDER BY created_at DESC",
            tuple(params),
        ).fetchall()
    if not rows:
        return []

    def _cosine(a: list[float], b: list[float]) -> float:
        if not a or not b or len(a) != len(b):
            return 1.0
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 1.0
        return 1 - dot / (norm_a * norm_b)

    payload: list[dict[str, Any]] = []
    for row in rows:
        stored = json.loads(row[4] or "[]")
        distance = _cosine(query_vector, stored)
        payload.append(
            {
                "id": row[0],
                "session_id": row[1],
                "topic": row[2],
                "chunk_md": row[3],
                "created_at": row[5],
                "distance": distance,
            }
        )
    payload.sort(key=lambda item: item["distance"])
    return payload[:limit]


async def search_embeddings_async(
    *,
    session_id: str,
    query_vector: list[float],
    limit: int = 5,
    topic: str | None = None,
    exclude_session_id: str | None = None,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_search_embeddings(
            session_id=session_id,
            query_vector=query_vector,
            limit=limit,
            topic=topic,
            exclude_session_id=exclude_session_id,
        )
    return await asyncio.to_thread(
        _search_embeddings_sqlite,
        session_id=session_id,
        query_vector=query_vector,
        limit=limit,
        topic=topic,
        exclude_session_id=exclude_session_id,
    )


def list_api_keys(*, include_revoked: bool = False, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                pg_list_api_keys(include_revoked=include_revoked, limit=limit, offset=offset)
            )
        raise RuntimeError(
            "list_api_keys() cannot be called from an active event loop; use "
            "await list_api_keys_async() instead."
        )
    return _list_api_keys_sqlite(include_revoked=include_revoked, limit=limit, offset=offset)


def _list_api_keys_sqlite(
    *, include_revoked: bool, limit: int, offset: int
) -> list[dict[str, Any]]:
    query = (
        "SELECT id, role, limits_json, tenant, display_name, created_at, expires_at, revoked_at, last_used_at, rotated_at, account_id "
        "FROM api_keys"
    )
    params: list[Any] = []
    if not include_revoked:
        query += " WHERE revoked_at IS NULL"
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    with conn() as database:
        rows = database.execute(query, tuple(params)).fetchall()
    records: list[dict[str, Any]] = []
    for row in rows:
        records.append(
            {
                "id": row[0],
                "role": row[1],
                "limits": json.loads(row[2] or "{}"),
                "tenant": row[3],
                "display_name": row[4],
                "created_at": row[5],
                "expires_at": row[6],
                "revoked_at": row[7],
                "last_used_at": row[8],
                "rotated_at": row[9],
                "account_id": row[10],
            }
        )
    return records


async def list_api_keys_async(
    *, include_revoked: bool = False, limit: int = 100, offset: int = 0
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_list_api_keys(include_revoked=include_revoked, limit=limit, offset=offset)
    return await asyncio.to_thread(
        _list_api_keys_sqlite,
        include_revoked=include_revoked,
        limit=limit,
        offset=offset,
    )


def _list_known_tenants_sqlite(limit: int = 200) -> list[str]:
    query = (
        "SELECT DISTINCT tenant "
        "FROM api_keys "
        "WHERE tenant IS NOT NULL AND tenant != '' "
        "ORDER BY tenant ASC LIMIT ?"
    )
    with conn() as database:
        rows = database.execute(query, (limit,)).fetchall()
    return [row[0] for row in rows if row and row[0]]


def _create_tenant_sqlite(
    *,
    tenant_id: str,
    display_name: str,
    description: str | None,
    metadata: dict[str, Any] | None,
    tags: list[str] | None,
) -> None:
    payload_metadata = json.dumps(metadata or {}, ensure_ascii=False)
    payload_tags = json.dumps(tags or [], ensure_ascii=False)
    ts = _now_ts()
    with conn() as database:
        try:
            database.execute(
                """
                INSERT INTO tenants (id, display_name, description, metadata_json, tags_json, created_at, updated_at, archived_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (tenant_id, display_name, description, payload_metadata, payload_tags, ts, ts),
            )
        except sqlite3.IntegrityError as exc:  # pragma: no cover - constraint surfaced to API
            raise ValueError("Tenant already exists") from exc


def _update_tenant_sqlite(
    *,
    tenant_id: str,
    display_name: str | None,
    description: str | None,
    metadata: dict[str, Any] | None,
    tags: list[str] | None,
) -> None:
    assignments: list[str] = []
    params: list[Any] = []
    if display_name is not None:
        assignments.append("display_name = ?")
        params.append(display_name)
    if description is not None:
        assignments.append("description = ?")
        params.append(description)
    if metadata is not None:
        assignments.append("metadata_json = ?")
        params.append(json.dumps(metadata, ensure_ascii=False))
    if tags is not None:
        assignments.append("tags_json = ?")
        params.append(json.dumps(tags, ensure_ascii=False))
    if not assignments:
        return
    assignments.append("updated_at = ?")
    params.append(_now_ts())
    params.append(tenant_id)
    with conn() as database:
        cur = database.execute(
            "UPDATE tenants SET " + ", ".join(assignments) + " WHERE id = ?",
            tuple(params),
        )
        if cur.rowcount <= 0:
            raise ValueError("Tenant not found")


def _archive_tenant_sqlite(*, tenant_id: str) -> None:
    ts = _now_ts()
    with conn() as database:
        cur = database.execute(
            "UPDATE tenants SET archived_at = ?, updated_at = ? WHERE id = ?",
            (ts, ts, tenant_id),
        )
        if cur.rowcount <= 0:
            raise ValueError("Tenant not found")


def _restore_tenant_sqlite(*, tenant_id: str) -> None:
    ts = _now_ts()
    with conn() as database:
        cur = database.execute(
            "UPDATE tenants SET archived_at = NULL, updated_at = ? WHERE id = ?",
            (ts, tenant_id),
        )
        if cur.rowcount <= 0:
            raise ValueError("Tenant not found")


def _fetch_tenant_sqlite(*, tenant_id: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            """
            SELECT id, display_name, description, metadata_json, tags_json, created_at, updated_at, archived_at
            FROM tenants
            WHERE id = ?
            """,
            (tenant_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "display_name": row[1],
        "description": row[2],
        "metadata": _loads_json(row[3], {}),
        "tags": _loads_json(row[4], []),
        "created_at": row[5],
        "updated_at": row[6],
        "archived_at": row[7],
    }


def _list_tenants_sqlite(
    *, include_archived: bool, search: str | None, limit: int, offset: int
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if not include_archived:
        clauses.append("t.archived_at IS NULL")
    if search:
        like = f"%{search.lower()}%"
        clauses.append("(LOWER(t.id) LIKE ? OR LOWER(t.display_name) LIKE ?)")
        params.extend([like, like])
    where_sql = " WHERE " + " AND ".join(clauses) if clauses else ""
    query = (
        """
        SELECT t.id,
               t.display_name,
               t.description,
               t.metadata_json,
               t.tags_json,
               t.created_at,
               t.updated_at,
               t.archived_at,
               SUM(CASE WHEN k.revoked_at IS NULL THEN 1 ELSE 0 END) AS active_keys,
               COUNT(k.id) AS total_keys,
               MAX(k.rotated_at) AS last_key_rotated_at,
               MAX(k.last_used_at) AS last_key_used_at
        FROM tenants t
        LEFT JOIN api_keys k ON k.tenant = t.id
        %s
        GROUP BY t.id, t.display_name, t.description, t.metadata_json, t.tags_json, t.created_at, t.updated_at, t.archived_at
        ORDER BY t.display_name ASC
        LIMIT ? OFFSET ?
        """
        % where_sql
    )
    params.extend([limit, offset])
    with conn() as database:
        rows = database.execute(query, tuple(params)).fetchall()
    results: list[dict[str, Any]] = []
    for row in rows:
        results.append(
            {
                "id": row[0],
                "display_name": row[1],
                "description": row[2],
                "metadata": _loads_json(row[3], {}),
                "tags": _loads_json(row[4], []),
                "created_at": row[5],
                "updated_at": row[6],
                "archived_at": row[7],
                "active_keys": int(row[8] or 0),
                "total_keys": int(row[9] or 0),
                "last_key_rotated_at": row[10],
                "last_key_used_at": row[11],
            }
        )
    return results


def list_known_tenants(limit: int = 200) -> list[str]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_list_known_tenants(limit=limit))
        raise RuntimeError(
            "list_known_tenants() cannot be called from an active event loop; use await list_known_tenants_async() instead."
        )
    return _list_known_tenants_sqlite(limit=limit)


async def list_known_tenants_async(limit: int = 200) -> list[str]:
    if _USE_POSTGRES:
        return await pg_list_known_tenants(limit=limit)
    return await asyncio.to_thread(_list_known_tenants_sqlite, limit)


def create_tenant(
    *,
    tenant_id: str,
    display_name: str,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                pg_create_tenant(
                    tenant_id=tenant_id,
                    display_name=display_name,
                    description=description,
                    metadata=metadata,
                    tags=tags,
                )
            )
            return
        raise RuntimeError(
            "create_tenant() cannot be called from an active event loop; use await create_tenant_async() instead."
        )
    _create_tenant_sqlite(
        tenant_id=tenant_id,
        display_name=display_name,
        description=description,
        metadata=metadata,
        tags=tags,
    )


async def create_tenant_async(
    *,
    tenant_id: str,
    display_name: str,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> None:
    if _USE_POSTGRES:
        await pg_create_tenant(
            tenant_id=tenant_id,
            display_name=display_name,
            description=description,
            metadata=metadata,
            tags=tags,
        )
        return
    await asyncio.to_thread(
        _create_tenant_sqlite,
        tenant_id=tenant_id,
        display_name=display_name,
        description=description,
        metadata=metadata,
        tags=tags,
    )


def update_tenant(
    *,
    tenant_id: str,
    display_name: str | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                pg_update_tenant(
                    tenant_id=tenant_id,
                    display_name=display_name,
                    description=description,
                    metadata=metadata,
                    tags=tags,
                )
            )
            return
        raise RuntimeError(
            "update_tenant() cannot be called from an active event loop; use await update_tenant_async() instead."
        )
    _update_tenant_sqlite(
        tenant_id=tenant_id,
        display_name=display_name,
        description=description,
        metadata=metadata,
        tags=tags,
    )


async def update_tenant_async(
    *,
    tenant_id: str,
    display_name: str | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> None:
    if _USE_POSTGRES:
        await pg_update_tenant(
            tenant_id=tenant_id,
            display_name=display_name,
            description=description,
            metadata=metadata,
            tags=tags,
        )
        return
    await asyncio.to_thread(
        _update_tenant_sqlite,
        tenant_id=tenant_id,
        display_name=display_name,
        description=description,
        metadata=metadata,
        tags=tags,
    )


def archive_tenant(*, tenant_id: str) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(pg_archive_tenant(tenant_id=tenant_id))
            return
        raise RuntimeError(
            "archive_tenant() cannot be called from an active event loop; use await archive_tenant_async() instead."
        )
    _archive_tenant_sqlite(tenant_id=tenant_id)


async def archive_tenant_async(*, tenant_id: str) -> None:
    if _USE_POSTGRES:
        await pg_archive_tenant(tenant_id=tenant_id)
        return
    await asyncio.to_thread(_archive_tenant_sqlite, tenant_id=tenant_id)


def restore_tenant(*, tenant_id: str) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(pg_restore_tenant(tenant_id=tenant_id))
            return
        raise RuntimeError(
            "restore_tenant() cannot be called from an active event loop; use await restore_tenant_async() instead."
        )
    _restore_tenant_sqlite(tenant_id=tenant_id)


async def restore_tenant_async(*, tenant_id: str) -> None:
    if _USE_POSTGRES:
        await pg_restore_tenant(tenant_id=tenant_id)
        return
    await asyncio.to_thread(_restore_tenant_sqlite, tenant_id=tenant_id)


def fetch_tenant(*, tenant_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_tenant(tenant_id=tenant_id))
        raise RuntimeError(
            "fetch_tenant() cannot be called from an active event loop; use await fetch_tenant_async() instead."
        )
    return _fetch_tenant_sqlite(tenant_id=tenant_id)


async def fetch_tenant_async(*, tenant_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_tenant(tenant_id=tenant_id)
    return await asyncio.to_thread(_fetch_tenant_sqlite, tenant_id=tenant_id)


def list_tenants(
    *,
    include_archived: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                pg_list_tenants(
                    include_archived=include_archived,
                    search=search,
                    limit=limit,
                    offset=offset,
                )
            )
        raise RuntimeError(
            "list_tenants() cannot be called from an active event loop; use await list_tenants_async() instead."
        )
    return _list_tenants_sqlite(
        include_archived=include_archived,
        search=search,
        limit=limit,
        offset=offset,
    )


async def list_tenants_async(
    *,
    include_archived: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_list_tenants(
            include_archived=include_archived,
            search=search,
            limit=limit,
            offset=offset,
        )
    return await asyncio.to_thread(
        _list_tenants_sqlite,
        include_archived=include_archived,
        search=search,
        limit=limit,
        offset=offset,
    )


def update_api_key_limits(
    *,
    key_id: str,
    limits: dict[str, Any],
    expires_at: float | None = None,
    display_name: object = _UNSET,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                pg_update_api_key_limits(
                    key_id=key_id,
                    limits=limits,
                    expires_at=expires_at,
                    display_name=display_name if display_name is not _UNSET else None,
                    display_name_is_set=display_name is not _UNSET,
                )
            )
            return
        raise RuntimeError(
            "update_api_key_limits() cannot be called from an active event loop; use "
            "await update_api_key_limits_async() instead."
        )
    _update_api_key_limits_sqlite(
        key_id=key_id,
        limits=limits,
        expires_at=expires_at,
        display_name=display_name,
    )


def _update_api_key_limits_sqlite(
    *,
    key_id: str,
    limits: dict[str, Any],
    expires_at: float | None,
    display_name: object,
) -> None:
    with conn() as database:
        if display_name is _UNSET:
            database.execute(
                "UPDATE api_keys SET limits_json = ?, expires_at = ? WHERE id = ?",
                (json.dumps(limits), expires_at, key_id),
            )
        else:
            database.execute(
                "UPDATE api_keys SET limits_json = ?, expires_at = ?, display_name = ? WHERE id = ?",
                (json.dumps(limits), expires_at, display_name, key_id),
            )


async def update_api_key_limits_async(
    *,
    key_id: str,
    limits: dict[str, Any],
    expires_at: float | None = None,
    display_name: object = _UNSET,
) -> None:
    if _USE_POSTGRES:
        await pg_update_api_key_limits(
            key_id=key_id,
            limits=limits,
            expires_at=expires_at,
            display_name=display_name if display_name is not _UNSET else None,
            display_name_is_set=display_name is not _UNSET,
        )
    else:
        await asyncio.to_thread(
            _update_api_key_limits_sqlite,
            key_id=key_id,
            limits=limits,
            expires_at=expires_at,
            display_name=display_name,
        )


def revoke_api_key(*, key_id: str, revoked_at: float | None = None) -> None:
    ts = revoked_at or _now_ts()
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(pg_revoke_api_key(key_id=key_id, revoked_at=ts))
            return
        raise RuntimeError(
            "revoke_api_key() cannot be called from an active event loop; use "
            "await revoke_api_key_async() instead."
        )
    with conn() as database:
        database.execute(
            "UPDATE api_keys SET revoked_at = ? WHERE id = ?",
            (ts, key_id),
        )


def restore_api_key(*, key_id: str) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(pg_restore_api_key(key_id=key_id))
            return
        raise RuntimeError(
            "restore_api_key() cannot be called from an active event loop; use "
            "await restore_api_key_async() instead."
        )
    with conn() as database:
        database.execute(
            "UPDATE api_keys SET revoked_at = NULL WHERE id = ?",
            (key_id,),
        )


def revoke_api_keys_for_account(
    *,
    account_id: str,
    exclude_key_id: str | None = None,
) -> int:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                pg_revoke_api_keys_for_account(account_id=account_id, exclude_key_id=exclude_key_id)
            )
        raise RuntimeError(
            "revoke_api_keys_for_account() cannot be called from an active event loop; use "
            "await revoke_api_keys_for_account_async() instead."
        )
    return _revoke_api_keys_for_account_sqlite(
        account_id=account_id, exclude_key_id=exclude_key_id
    )


def _revoke_api_key_sqlite(*, key_id: str, revoked_at: float) -> None:
    with conn() as database:
        database.execute(
            "UPDATE api_keys SET revoked_at = ? WHERE id = ?",
            (revoked_at, key_id),
        )


def _restore_api_key_sqlite(*, key_id: str) -> None:
    with conn() as database:
        database.execute(
            "UPDATE api_keys SET revoked_at = NULL WHERE id = ?",
            (key_id,),
        )


def _revoke_api_keys_for_account_sqlite(
    *, account_id: str, exclude_key_id: str | None
) -> int:
    ts = _now_ts()
    query = "UPDATE api_keys SET revoked_at = ? WHERE account_id = ?"
    params: list[Any] = [ts, account_id]
    if exclude_key_id is not None:
        query += " AND id <> ?"
        params.append(exclude_key_id)
    with conn() as database:
        cursor = database.execute(query, tuple(params))
        return cursor.rowcount


async def revoke_api_key_async(*, key_id: str, revoked_at: float | None = None) -> None:
    ts = revoked_at or _now_ts()
    if _USE_POSTGRES:
        await pg_revoke_api_key(key_id=key_id, revoked_at=ts)
    else:
        await asyncio.to_thread(_revoke_api_key_sqlite, key_id=key_id, revoked_at=ts)


async def restore_api_key_async(*, key_id: str) -> None:
    if _USE_POSTGRES:
        await pg_restore_api_key(key_id=key_id)
    else:
        await asyncio.to_thread(_restore_api_key_sqlite, key_id=key_id)


async def revoke_api_keys_for_account_async(
    *, account_id: str, exclude_key_id: str | None = None
) -> int:
    if _USE_POSTGRES:
        return await pg_revoke_api_keys_for_account(
            account_id=account_id, exclude_key_id=exclude_key_id
        )
    return await asyncio.to_thread(
        _revoke_api_keys_for_account_sqlite,
        account_id=account_id,
        exclude_key_id=exclude_key_id,
    )


def record_audit_event(
    *,
    actor: str | None,
    action: str,
    target: str | None,
    metadata: dict[str, Any] | None,
    ip: str | None,
    session_id: str | None,
    tenant_id: str | None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                record_audit_event_async(
                    actor=actor,
                    action=action,
                    target=target,
                    metadata=metadata,
                    ip=ip,
                    session_id=session_id,
                    tenant_id=tenant_id,
                )
            )
            return
        raise RuntimeError(
            "record_audit_event() cannot be called from an active event loop; use "
            "await record_audit_event_async() instead."
        )
    _record_audit_event_sqlite(
        actor=actor,
        action=action,
        target=target,
        metadata=metadata,
        ip=ip,
        session_id=session_id,
        tenant_id=tenant_id,
    )


def _record_audit_event_sqlite(
    *,
    actor: str | None,
    action: str,
    target: str | None,
    metadata: dict[str, Any] | None,
    ip: str | None,
    session_id: str | None,
    tenant_id: str | None,
) -> None:
    with conn() as database:
        database.execute(
            """
            INSERT INTO audit (id, actor, action, target, metadata, ip, session_id, tenant_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _new_id(),
                actor,
                action,
                target,
                json.dumps(metadata or {}, ensure_ascii=False),
                ip,
                session_id,
                tenant_id,
                _now_ts(),
            ),
        )


async def record_audit_event_async(
    *,
    actor: str | None,
    action: str,
    target: str | None,
    metadata: dict[str, Any] | None,
    ip: str | None,
    session_id: str | None,
    tenant_id: str | None,
) -> None:
    if _USE_POSTGRES:
        await pg_record_audit_event(
            actor=actor,
            action=action,
            target=target,
            metadata=metadata or {},
            ip=ip,
            session_id=session_id,
            tenant_id=tenant_id,
        )
        return
    await asyncio.to_thread(
        _record_audit_event_sqlite,
        actor=actor,
        action=action,
        target=target,
        metadata=metadata,
        ip=ip,
        session_id=session_id,
        tenant_id=tenant_id,
    )


def purge_runs(before_ts: float, *, dry_run: bool = False) -> int:
    if _USE_POSTGRES:
        return asyncio.run(pg_purge_runs(before_ts, dry_run=dry_run))
    with conn() as database:
        count = database.execute(
            "SELECT COUNT(*) FROM runs WHERE ts < ?",
            (before_ts,),
        ).fetchone()[0]
        if not dry_run and count:
            database.execute("DELETE FROM runs WHERE ts < ?", (before_ts,))
    return int(count)


def purge_audit(before_ts: float, *, dry_run: bool = False) -> int:
    if _USE_POSTGRES:
        return asyncio.run(pg_purge_audit(before_ts, dry_run=dry_run))
    with conn() as database:
        count = database.execute(
            "SELECT COUNT(*) FROM audit WHERE created_at < ?",
            (before_ts,),
        ).fetchone()[0]
        if not dry_run and count:
            database.execute("DELETE FROM audit WHERE created_at < ?", (before_ts,))
    return int(count)


def fetch_expired_documents(
    *,
    tmp_cutoff: float,
    retained_cutoff: float,
    now_ts: float,
) -> list[tuple[str, str, str]]:
    if _USE_POSTGRES:
        return asyncio.run(
            pg_fetch_expired_documents(
                tmp_cutoff=tmp_cutoff,
                retained_cutoff=retained_cutoff,
                now_ts=now_ts,
            )
        )
    with conn() as database:
        rows = database.execute(
            """
            SELECT id, bucket, path
            FROM docs
            WHERE (
                bucket = 'tmp' AND created_at < ?
                AND (retained_until IS NULL OR retained_until < ?)
            )
            OR (
                bucket <> 'tmp' AND retained_until IS NOT NULL
                AND retained_until < ?
                AND created_at < ?
            )
            """,
            (tmp_cutoff, now_ts, now_ts, retained_cutoff),
        ).fetchall()
    return [(row[0], row[1], row[2]) for row in rows]


def delete_documents(ids: Sequence[str]) -> int:
    if not ids:
        return 0
    if _USE_POSTGRES:
        return asyncio.run(pg_delete_documents(ids))
    with conn() as database:
        placeholders = ",".join("?" for _ in ids)
        cursor = database.execute(
            f"DELETE FROM docs WHERE id IN ({placeholders})",
            tuple(ids),
        )
        return cursor.rowcount


def list_documents(
    *,
    session_id: str | None = None,
    bucket: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return asyncio.run(
            pg_list_documents(session_id=session_id, bucket=bucket, limit=limit)
        )
    clauses: list[str] = []
    params: list[Any] = []
    if session_id:
        clauses.append("session_id = ?")
        params.append(session_id)
    if bucket:
        clauses.append("bucket = ?")
        params.append(bucket)
    query = (
        "SELECT id, session_id, bucket, path, bytes, tags, retained_until, last_accessed_at, created_at "
        "FROM docs"
    )
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with conn() as database:
        rows = database.execute(query, tuple(params)).fetchall()
    documents: list[dict[str, Any]] = []
    for row in rows:
        tags_payload = json.loads(row[5] or "[]") if isinstance(row[5], str) else row[5] or []
        documents.append(
            {
                "id": row[0],
                "session_id": row[1],
                "bucket": row[2],
                "path": row[3],
                "bytes": row[4],
                "tags": tags_payload,
                "retained_until": row[6],
                "last_accessed_at": row[7],
                "created_at": row[8],
            }
        )
    return documents


def update_document_bucket(
    *,
    doc_id: str,
    bucket: str,
    retained_until: float | None,
) -> None:
    if _USE_POSTGRES:
        asyncio.run(
            pg_update_document_bucket(doc_id=doc_id, bucket=bucket, retained_until=retained_until)
        )
        return
    with conn() as database:
        database.execute(
            "UPDATE docs SET bucket = ?, retained_until = ? WHERE id = ?",
            (bucket, retained_until, doc_id),
        )


def purge_documents_for_session(session_id: str) -> int:
    if _USE_POSTGRES:
        return asyncio.run(pg_purge_documents_for_session(session_id=session_id))
    with conn() as database:
        rows = database.execute(
            "SELECT id FROM docs WHERE session_id = ?",
            (session_id,),
        ).fetchall()
    ids = [row[0] for row in rows]
    return delete_documents(ids)


def touch_api_key(*, key_id: str) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            _run_async(pg_touch_api_key(key_id=key_id))
            return
        raise RuntimeError(
            "touch_api_key() cannot be called from an active event loop; use "
            "await touch_api_key_async() instead."
        )
    _touch_api_key_sqlite(key_id=key_id)


def _touch_api_key_sqlite(*, key_id: str) -> None:
    with conn() as database:
        database.execute(
            "UPDATE api_keys SET last_used_at = ? WHERE id = ?",
            (time.time(), key_id),
        )


async def touch_api_key_async(*, key_id: str) -> None:
    if _USE_POSTGRES:
        await pg_touch_api_key(key_id=key_id)
    else:
        await asyncio.to_thread(_touch_api_key_sqlite, key_id=key_id)


# ---------------------------------------------------------------------------
# Admin account helpers


def _admin_row_to_dict(row: Sequence[Any]) -> dict[str, Any]:
    return {
        "id": row[0],
        "email": row[1],
        "display_name": row[2],
        "password_hash": row[3],
        "require_password_reset": bool(row[4]),
        "created_at": row[5],
        "updated_at": row[6],
        "last_login_at": row[7],
    }


def _create_admin_account_sqlite(
    *,
    admin_id: str,
    email: str,
    display_name: str | None,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    now = _now_ts()
    with conn() as database:
        existing = database.execute(
            "SELECT id FROM admin_accounts WHERE id = ?",
            (admin_id,),
        ).fetchone()
        if existing:
            database.execute(
                """
                UPDATE admin_accounts
                SET email = ?, display_name = ?, password_hash = ?, require_password_reset = ?, updated_at = ?
                WHERE id = ?
                """,
                (email, display_name, password_hash, int(require_password_reset), now, admin_id),
            )
        else:
            database.execute(
                """
                INSERT INTO admin_accounts (id, email, display_name, password_hash, require_password_reset, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (admin_id, email, display_name, password_hash, int(require_password_reset), now, now),
            )


def create_admin_account(
    *,
    admin_id: str,
    email: str,
    display_name: str | None,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    if _USE_POSTGRES:
        _run_async(
            pg_create_admin_account(
                admin_id=admin_id,
                email=email,
                display_name=display_name,
                password_hash=password_hash,
                require_password_reset=require_password_reset,
            )
        )
        return
    _create_admin_account_sqlite(
        admin_id=admin_id,
        email=email,
        display_name=display_name,
        password_hash=password_hash,
        require_password_reset=require_password_reset,
    )


async def create_admin_account_async(
    *,
    admin_id: str,
    email: str,
    display_name: str | None,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    if _USE_POSTGRES:
        await pg_create_admin_account(
            admin_id=admin_id,
            email=email,
            display_name=display_name,
            password_hash=password_hash,
            require_password_reset=require_password_reset,
        )
        return
    await asyncio.to_thread(
        _create_admin_account_sqlite,
        admin_id=admin_id,
        email=email,
        display_name=display_name,
        password_hash=password_hash,
        require_password_reset=require_password_reset,
    )


def update_admin_password(
    *,
    admin_id: str,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                update_admin_password_async(
                    admin_id=admin_id,
                    password_hash=password_hash,
                    require_password_reset=require_password_reset,
                )
            )
            return
        raise RuntimeError(
            "update_admin_password() cannot be called from an active event loop; use "
            "await update_admin_password_async() instead."
        )
    _update_admin_password_sqlite(
        admin_id=admin_id,
        password_hash=password_hash,
        require_password_reset=require_password_reset,
    )


def _update_admin_password_sqlite(
    *, admin_id: str, password_hash: str, require_password_reset: bool
) -> None:
    now = _now_ts()
    with conn() as database:
        database.execute(
            """
            UPDATE admin_accounts
            SET password_hash = ?, require_password_reset = ?, updated_at = ?
            WHERE id = ?
            """,
            (password_hash, int(require_password_reset), now, admin_id),
        )


async def update_admin_password_async(
    *,
    admin_id: str,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    if _USE_POSTGRES:
        await pg_update_admin_password(
            admin_id=admin_id,
            password_hash=password_hash,
            require_password_reset=require_password_reset,
        )
        return
    await asyncio.to_thread(
        _update_admin_password_sqlite,
        admin_id=admin_id,
        password_hash=password_hash,
        require_password_reset=require_password_reset,
    )


def update_admin_profile(
    *,
    admin_id: str,
    email: str | None = None,
    display_name: str | None = None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                update_admin_profile_async(
                    admin_id=admin_id,
                    email=email,
                    display_name=display_name,
                )
            )
            return
        raise RuntimeError(
            "update_admin_profile() cannot be called from an active event loop; use "
            "await update_admin_profile_async() instead."
        )
    _update_admin_profile_sqlite(admin_id=admin_id, email=email, display_name=display_name)


def _update_admin_profile_sqlite(
    *, admin_id: str, email: str | None, display_name: str | None
) -> None:
    assignments: list[str] = []
    params: list[Any] = []
    if email is not None:
        assignments.append("email = ?")
        params.append(email)
    if display_name is not None:
        assignments.append("display_name = ?")
        params.append(display_name)
    if not assignments:
        return
    assignments.append("updated_at = ?")
    params.append(_now_ts())
    params.append(admin_id)
    sql = "UPDATE admin_accounts SET " + ", ".join(assignments) + " WHERE id = ?"
    with conn() as database:
        database.execute(sql, tuple(params))


async def update_admin_profile_async(
    *,
    admin_id: str,
    email: str | None = None,
    display_name: str | None = None,
) -> None:
    if _USE_POSTGRES:
        await pg_update_admin_profile(
            admin_id=admin_id,
            email=email,
            display_name=display_name,
        )
        return
    await asyncio.to_thread(
        _update_admin_profile_sqlite,
        admin_id=admin_id,
        email=email,
        display_name=display_name,
    )


def touch_admin_login(admin_id: str) -> None:
    if _USE_POSTGRES:
        _run_async(pg_touch_admin_login(admin_id=admin_id))
        return
    now = _now_ts()
    with conn() as database:
        database.execute(
            "UPDATE admin_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?",
            (now, now, admin_id),
        )


def _fetch_admin_by_email_sqlite(email: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            """
            SELECT id, email, display_name, password_hash, require_password_reset,
                   created_at, updated_at, last_login_at
            FROM admin_accounts
            WHERE LOWER(email) = LOWER(?)
            """,
            (email,),
        ).fetchone()
    return _admin_row_to_dict(row) if row else None


def _fetch_admin_by_id_sqlite(admin_id: str) -> dict[str, Any] | None:
    with conn() as database:
        row = database.execute(
            """
            SELECT id, email, display_name, password_hash, require_password_reset,
                   created_at, updated_at, last_login_at
            FROM admin_accounts
            WHERE id = ?
            """,
            (admin_id,),
        ).fetchone()
    return _admin_row_to_dict(row) if row else None


def _touch_admin_login_sqlite(admin_id: str) -> None:
    now = _now_ts()
    with conn() as database:
        database.execute(
            "UPDATE admin_accounts SET last_login_at = ?, updated_at = ? WHERE id = ?",
            (now, now, admin_id),
        )


def fetch_admin_by_email(email: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_admin_by_email(email))
        raise RuntimeError(
            "fetch_admin_by_email() cannot be called from an active event loop; use "
            "await fetch_admin_by_email_async() instead."
        )
    return _fetch_admin_by_email_sqlite(email)


def fetch_admin_by_id(admin_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_fetch_admin_by_id(admin_id))
        raise RuntimeError(
            "fetch_admin_by_id() cannot be called from an active event loop; use "
            "await fetch_admin_by_id_async() instead."
        )
    return _fetch_admin_by_id_sqlite(admin_id)


async def fetch_admin_by_email_async(email: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_admin_by_email(email)
    return await asyncio.to_thread(_fetch_admin_by_email_sqlite, email)


async def fetch_admin_by_id_async(admin_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_admin_by_id(admin_id)
    return await asyncio.to_thread(_fetch_admin_by_id_sqlite, admin_id)


async def touch_admin_login_async(admin_id: str) -> None:
    if _USE_POSTGRES:
        await pg_touch_admin_login(admin_id=admin_id)
    else:
        await asyncio.to_thread(_touch_admin_login_sqlite, admin_id)


def _admin_account_count_sqlite() -> int:
    with conn() as database:
        row = database.execute("SELECT COUNT(*) FROM admin_accounts").fetchone()
    return int(row[0]) if row else 0


def admin_account_count() -> int:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(pg_admin_count())
        raise RuntimeError(
            "admin_account_count() cannot be called from an active event loop; use "
            "await admin_account_count_async() instead."
        )
    return _admin_account_count_sqlite()


async def admin_account_count_async() -> int:
    if _USE_POSTGRES:
        return await pg_admin_count()
    return await asyncio.to_thread(_admin_account_count_sqlite)


def list_audit_events(
    *,
    since: float | None = None,
    until: float | None = None,
    tenant: str | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(
                list_audit_events_async(
                    since=since,
                    until=until,
                    tenant=tenant,
                    limit=limit,
                )
            )
        raise RuntimeError(
            "list_audit_events() cannot be called from an active event loop; use "
            "await list_audit_events_async() instead."
        )
    return _list_audit_events_sqlite(
        since=since,
        until=until,
        tenant=tenant,
        limit=limit,
    )


def _list_audit_events_sqlite(
    *,
    since: float | None,
    until: float | None,
    tenant: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if since is not None:
        clauses.append("created_at >= ?")
        params.append(since)
    if until is not None:
        clauses.append("created_at <= ?")
        params.append(until)
    if tenant:
        clauses.append("tenant_id = ?")
        params.append(tenant)
    query = (
        "SELECT id, actor, action, target, metadata, ip, session_id, tenant_id, created_at FROM audit"
    )
    if clauses:
        query += " WHERE " + " AND ".join(clauses)
    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    with conn() as database:
        rows = database.execute(query, tuple(params)).fetchall()
    events: list[dict[str, Any]] = []
    for row in rows:
        metadata_payload = json.loads(row[4] or "{}") if isinstance(row[4], str) else row[4] or {}
        events.append(
            {
                "id": row[0],
                "actor": row[1],
                "action": row[2],
                "target": row[3],
                "metadata": metadata_payload,
                "ip": row[5],
                "session_id": row[6],
                "tenant_id": row[7],
                "created_at": row[8],
            }
        )
    return events


async def list_audit_events_async(
    *,
    since: float | None = None,
    until: float | None = None,
    tenant: str | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return await pg_list_audit_events(
            since=since,
            until=until,
            tenant=tenant,
            limit=limit,
        )
    return await asyncio.to_thread(
        _list_audit_events_sqlite,
        since=since,
        until=until,
        tenant=tenant,
        limit=limit,
    )


def _record_change_sqlite(
    *,
    scope: str,
    record_id: str,
    action: str,
    diff: dict[str, Any] | None,
    actor: str | None,
    notes: str | None,
    rollback_of: str | None,
) -> None:
    payload = json.dumps(diff or {}, ensure_ascii=False)
    with conn() as database:
        database.execute(
            """
            INSERT INTO config_change_log (id, scope, record_id, action, diff_json, actor, notes, created_at, rollback_of)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                _new_id(),
                scope,
                record_id,
                action,
                payload,
                actor,
                notes,
                _now_ts(),
                rollback_of,
            ),
        )


def stage_persona_prompt(
    *,
    persona: str,
    content_md: str,
    version: str | None = None,
    metadata: dict[str, Any] | None = None,
    author: str | None = None,
    notes: str | None = None,
    rollback_of: str | None = None,
    prompt_id: str | None = None,
) -> str:
    prompt_identifier = prompt_id or _new_id()
    resolved_version = version or time.strftime("%Y%m%d%H%M%S")
    checksum = _checksum_text(content_md)
    metadata = metadata or {}

    if _USE_POSTGRES:
        _run_async(
            pg_stage_persona_prompt(
                prompt_id=prompt_identifier,
                persona=persona,
                version=resolved_version,
                content_md=content_md,
                checksum=checksum,
                metadata=metadata,
                created_by=author,
                notes=notes,
                rollback_of=rollback_of,
            )
        )
    else:
        with conn() as database:
            database.execute(
                """
                INSERT INTO persona_prompts (
                    id, persona, version, content_md, checksum, metadata_json,
                    staged, active, created_by, notes, created_at, rollback_of
                ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)
                """,
                (
                    prompt_identifier,
                    persona,
                    resolved_version,
                    content_md,
                    checksum,
                    json.dumps(metadata, ensure_ascii=False),
                    author,
                    notes,
                    _now_ts(),
                    rollback_of,
                ),
            )
        _record_change_sqlite(
            scope="persona_prompt",
            record_id=prompt_identifier,
            action="stage",
            diff={
                "persona": persona,
                "version": resolved_version,
                "checksum": checksum,
                "metadata": metadata,
            },
            actor=author,
            notes=notes,
            rollback_of=rollback_of,
        )
    return prompt_identifier


def publish_persona_prompt(*, prompt_id: str, actor: str | None = None, notes: str | None = None) -> None:
    if _USE_POSTGRES:
        _run_async(pg_publish_persona_prompt(prompt_id=prompt_id, actor=actor, notes=notes))
        return

    with conn() as database:
        row = database.execute(
            "SELECT persona, version, checksum FROM persona_prompts WHERE id = ?",
            (prompt_id,),
        ).fetchone()
        if not row:
            raise ValueError(f"Persona prompt '{prompt_id}' not found")
        persona, version, checksum = row

        prev_row = database.execute(
            "SELECT id FROM persona_prompts WHERE persona = ? AND active = 1",
            (persona,),
        ).fetchone()
        previous_id = prev_row[0] if prev_row and prev_row[0] != prompt_id else None

        database.execute("UPDATE persona_prompts SET active = 0 WHERE persona = ?", (persona,))
        database.execute(
            """
            UPDATE persona_prompts
            SET active = 1,
                staged = 0,
                approved_at = ?,
                supersedes_id = ?
            WHERE id = ?
            """,
            (_now_ts(), previous_id, prompt_id),
        )

    _record_change_sqlite(
        scope="persona_prompt",
        record_id=prompt_id,
        action="publish",
        diff={
            "persona": persona,
            "version": version,
            "checksum": checksum,
            "supersedes_id": previous_id,
        },
        actor=actor,
        notes=notes,
        rollback_of=None,
    )


def get_active_persona_prompt(persona: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return asyncio.run(pg_fetch_active_persona_prompt(persona))

    with conn() as database:
        row = database.execute(
            """
            SELECT id, persona, version, content_md, checksum, metadata_json, created_by, notes,
                   created_at, approved_at, supersedes_id, rollback_of
            FROM persona_prompts
            WHERE persona = ? AND active = 1
            """,
            (persona,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "persona": row[1],
        "version": row[2],
        "content_md": row[3],
        "checksum": row[4],
        "metadata": json.loads(row[5] or "{}"),
        "created_by": row[6],
        "notes": row[7],
        "created_at": row[8],
        "approved_at": row[9],
        "supersedes_id": row[10],
        "rollback_of": row[11],
    }


def list_persona_versions(persona: str, *, limit: int = 10) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return asyncio.run(pg_fetch_persona_versions(persona, limit=limit))

    with conn() as database:
        rows = database.execute(
            """
            SELECT id, version, active, staged, created_at, approved_at
            FROM persona_prompts
            WHERE persona = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (persona, limit),
        ).fetchall()
    result: list[dict[str, Any]] = []
    for row in rows:
        result.append(
            {
                "id": row[0],
                "version": row[1],
                "active": bool(row[2]),
                "staged": bool(row[3]),
                "created_at": row[4],
                "approved_at": row[5],
            }
        )
    return result


def get_persona_prompt_by_id(prompt_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return asyncio.run(pg_fetch_persona_prompt_by_id(prompt_id))

    with conn() as database:
        row = database.execute(
            """
            SELECT id, persona, version, content_md, checksum, metadata_json, created_by, notes,
                   created_at, approved_at, supersedes_id, rollback_of
            FROM persona_prompts
            WHERE id = ?
            """,
            (prompt_id,),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "persona": row[1],
        "version": row[2],
        "content_md": row[3],
        "checksum": row[4],
        "metadata": json.loads(row[5] or "{}"),
        "created_by": row[6],
        "notes": row[7],
        "created_at": row[8],
        "approved_at": row[9],
        "supersedes_id": row[10],
        "rollback_of": row[11],
    }


async def get_active_persona_prompt_async(persona: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_active_persona_prompt(persona)
    return await asyncio.to_thread(get_active_persona_prompt, persona)


async def get_persona_prompt_by_id_async(prompt_id: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_fetch_persona_prompt_by_id(prompt_id)
    return await asyncio.to_thread(get_persona_prompt_by_id, prompt_id)


def stage_provider_config(
    *,
    provider: str,
    config: dict[str, Any],
    version: str | None = None,
    metadata: dict[str, Any] | None = None,
    author: str | None = None,
    notes: str | None = None,
    rollback_of: str | None = None,
    config_id: str | None = None,
) -> str:
    config_identifier = config_id or _new_id()
    resolved_version = version or time.strftime("%Y%m%d%H%M%S")
    metadata = metadata or {}

    sanitized_config, secret_map = _split_sensitive(config)
    checksum = _checksum_json(sanitized_config)
    secrets_checksum = _checksum_json(secret_map) if secret_map is not None else None
    secrets_payload = json.dumps(secret_map, ensure_ascii=False) if secret_map is not None else None
    rotated_at = _now_ts() if secret_map is not None else None
    secrets_ciphertext = encrypt_text(secrets_payload) if secrets_payload else None

    if _USE_POSTGRES:
        _run_async(
            pg_stage_provider_config(
                config_id=config_identifier,
                provider=provider,
                version=resolved_version,
                config_json=sanitized_config,
                checksum=checksum,
                metadata=metadata,
                created_by=author,
                notes=notes,
                rollback_of=rollback_of,
                secrets_ciphertext=secrets_ciphertext,
                secrets_checksum=secrets_checksum,
                rotated_at=rotated_at,
            )
        )
    else:
        with conn() as database:
            database.execute(
                """
                INSERT INTO provider_configs (
                    id, provider, version, config_json, checksum, metadata_json,
                    staged, active, created_by, notes, created_at, rollback_of,
                    secrets_ciphertext, secrets_checksum, rotated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    config_identifier,
                    provider,
                    resolved_version,
                    json.dumps(sanitized_config, ensure_ascii=False),
                    checksum,
                    json.dumps(metadata, ensure_ascii=False),
                    author,
                    notes,
                    _now_ts(),
                    rollback_of,
                    secrets_ciphertext,
                    secrets_checksum,
                    rotated_at,
                ),
            )
        _record_change_sqlite(
            scope="provider_config",
            record_id=config_identifier,
            action="stage",
            diff={
                "provider": provider,
                "version": resolved_version,
                "checksum": checksum,
                "metadata": metadata,
                "secrets_checksum": secrets_checksum,
            },
            actor=author,
            notes=notes,
            rollback_of=rollback_of,
        )
    return config_identifier


def publish_provider_config(*, config_id: str, actor: str | None = None, notes: str | None = None) -> None:
    if _USE_POSTGRES:
        _run_async(pg_publish_provider_config(config_id=config_id, actor=actor, notes=notes))
        return

    with conn() as database:
        row = database.execute(
            "SELECT provider, version, checksum FROM provider_configs WHERE id = ?",
            (config_id,),
        ).fetchone()
        if not row:
            raise ValueError(f"Provider config '{config_id}' not found")
        provider, version, checksum = row

        prev_row = database.execute(
            "SELECT id FROM provider_configs WHERE provider = ? AND active = 1",
            (provider,),
        ).fetchone()
        previous_id = prev_row[0] if prev_row and prev_row[0] != config_id else None

        database.execute("UPDATE provider_configs SET active = 0 WHERE provider = ?", (provider,))
        database.execute(
            """
            UPDATE provider_configs
            SET active = 1,
                staged = 0,
                approved_at = ?,
                supersedes_id = ?
            WHERE id = ?
            """,
            (_now_ts(), previous_id, config_id),
        )

    _record_change_sqlite(
        scope="provider_config",
        record_id=config_id,
        action="publish",
        diff={
            "provider": provider,
            "version": version,
            "checksum": checksum,
            "supersedes_id": previous_id,
        },
        actor=actor,
        notes=notes,
        rollback_of=None,
    )


def get_active_provider_config(provider: str, *, include_secrets: bool = False) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        record = asyncio.run(pg_fetch_active_provider_config(provider, include_secrets=include_secrets))
    else:
        with conn() as database:
            row = database.execute(
                """
                SELECT id, version, config_json, checksum, metadata_json, created_by, notes,
                       created_at, approved_at, supersedes_id, rollback_of,
                       secrets_ciphertext, secrets_checksum, rotated_at
                FROM provider_configs
                WHERE provider = ? AND active = 1
                """,
                (provider,),
            ).fetchone()
        if not row:
            return None
        secrets_map = None
        if include_secrets and row[11]:
            try:
                decrypted = decrypt_text(row[11])
                secrets_map = json.loads(decrypted)
            except SecretKeyMissing:
                raise
            except ValueError:  # pragma: no cover - indicates tampering
                secrets_map = None
        record = {
            "id": row[0],
            "version": row[1],
            "config": json.loads(row[2] or "{}"),
            "checksum": row[3],
            "metadata": json.loads(row[4] or "{}"),
            "created_by": row[5],
            "notes": row[6],
            "created_at": row[7],
            "approved_at": row[8],
            "supersedes_id": row[9],
            "rollback_of": row[10],
            "secrets": secrets_map,
            "secrets_checksum": row[12],
            "rotated_at": row[13],
        }

    if not record:
        return None

    config_payload = record.get("config", {})
    secrets_payload = record.get("secrets") if include_secrets else None
    merged_config = _merge_sensitive(config_payload, secrets_payload) if include_secrets else config_payload
    record["config"] = merged_config
    if not include_secrets:
        record.pop("secrets", None)
    return record


def stage_feature_flag(
    *,
    flag_key: str,
    environment: str,
    enabled: bool,
    version: str | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    author: str | None = None,
    notes: str | None = None,
    rollback_of: str | None = None,
    flag_id: str | None = None,
) -> str:
    flag_identifier = flag_id or _new_id()
    resolved_version = version or time.strftime("%Y%m%d%H%M%S")
    metadata = metadata or {}

    if _USE_POSTGRES:
        _run_async(
            pg_stage_feature_flag(
                flag_id=flag_identifier,
                flag_key=flag_key,
                environment=environment,
                version=resolved_version,
                enabled=enabled,
                description=description,
                metadata=metadata,
                created_by=author,
                notes=notes,
                rollback_of=rollback_of,
            )
        )
    else:
        with conn() as database:
            database.execute(
                """
                INSERT INTO feature_flags (
                    id, flag_key, environment, version, enabled, description, metadata_json,
                    staged, active, created_by, notes, created_at, supersedes_id, rollback_of
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)
                """,
                (
                    flag_identifier,
                    flag_key,
                    environment,
                    resolved_version,
                    int(enabled),
                    description,
                    json.dumps(metadata, ensure_ascii=False),
                    author,
                    notes,
                    _now_ts(),
                    None,
                    rollback_of,
                ),
            )
        _record_change_sqlite(
            scope="feature_flag",
            record_id=flag_identifier,
            action="stage",
            diff={
                "flag_key": flag_key,
                "environment": environment,
                "version": resolved_version,
                "enabled": enabled,
                "metadata": metadata,
            },
            actor=author,
            notes=notes,
            rollback_of=rollback_of,
        )
    return flag_identifier


def activate_feature_flag(*, flag_id: str, actor: str | None = None, notes: str | None = None) -> None:
    if _USE_POSTGRES:
        _run_async(pg_activate_feature_flag(flag_id=flag_id, actor=actor, notes=notes))
        return

    with conn() as database:
        row = database.execute(
            "SELECT flag_key, environment, enabled FROM feature_flags WHERE id = ?",
            (flag_id,),
        ).fetchone()
        if not row:
            raise ValueError(f"Feature flag '{flag_id}' not found")
        flag_key, environment, enabled = row

        prev_row = database.execute(
            "SELECT id FROM feature_flags WHERE flag_key = ? AND environment = ? AND active = 1",
            (flag_key, environment),
        ).fetchone()
        previous_id = prev_row[0] if prev_row and prev_row[0] != flag_id else None

        database.execute(
            "UPDATE feature_flags SET active = 0, archived_at = ? WHERE flag_key = ? AND environment = ?",
            (_now_ts(), flag_key, environment),
        )
        database.execute(
            """
            UPDATE feature_flags
            SET active = 1,
                staged = 0,
                activated_at = ?,
                supersedes_id = ?
            WHERE id = ?
            """,
            (_now_ts(), previous_id, flag_id),
        )

    _record_change_sqlite(
        scope="feature_flag",
        record_id=flag_id,
        action="activate",
        diff={
            "flag_key": flag_key,
            "environment": environment,
            "enabled": bool(enabled),
            "supersedes_id": previous_id,
        },
        actor=actor,
        notes=notes,
        rollback_of=None,
    )


def get_feature_flag(flag_key: str, environment: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return asyncio.run(pg_fetch_feature_flag(flag_key, environment))

    with conn() as database:
        row = database.execute(
            """
            SELECT id, version, enabled, description, metadata_json, active, staged, created_by, notes,
                   created_at, activated_at, archived_at, rollback_of
            FROM feature_flags
            WHERE flag_key = ? AND environment = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (flag_key, environment),
        ).fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "version": row[1],
        "enabled": bool(row[2]),
        "description": row[3],
        "metadata": json.loads(row[4] or "{}"),
        "active": bool(row[5]),
        "staged": bool(row[6]),
        "created_by": row[7],
        "notes": row[8],
        "created_at": row[9],
        "activated_at": row[10],
        "archived_at": row[11],
        "rollback_of": row[12],
    }


def list_config_changes(scope: str, *, limit: int = 10) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        return asyncio.run(pg_list_config_changes(scope, limit=limit))

    with conn() as database:
        rows = database.execute(
            """
            SELECT id, record_id, action, diff_json, actor, notes, created_at, rollback_of
            FROM config_change_log
            WHERE scope = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (scope, limit),
        ).fetchall()
    result: list[dict[str, Any]] = []
    for row in rows:
        result.append(
            {
                "id": row[0],
                "record_id": row[1],
                "action": row[2],
                "diff": json.loads(row[3] or "{}"),
                "actor": row[4],
                "notes": row[5],
                "created_at": row[6],
                "rollback_of": row[7],
            }
        )
    return result


def list_tool_model_mappings(*, limit: int | None = None) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(list_tool_model_mappings_async())
        raise RuntimeError("list_tool_model_mappings() cannot be used inside an active event loop; use async variant")

    query = (
        "SELECT tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by, updated_at "
        "FROM tool_model_mappings ORDER BY tool"
    )
    params: tuple = ()
    if limit is not None:
        query += " LIMIT ?"
        params = (limit,)
    with conn() as database:
        rows = database.execute(query, params).fetchall()
    return [
        {
            "tool": row[0],
            "primary_provider": row[1],
            "primary_model": row[2],
            "fallback_provider": row[3],
            "fallback_model": row[4],
            "updated_by": row[5],
            "updated_at": row[6],
        }
        for row in rows
    ]


def get_tool_model_mapping(tool: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            return asyncio.run(get_tool_model_mapping_async(tool))
        raise RuntimeError("get_tool_model_mapping() cannot be used inside an active event loop; use async variant")

    with conn() as database:
        row = database.execute(
            """
            SELECT tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by, updated_at
            FROM tool_model_mappings
            WHERE tool = ?
            """,
            (tool,),
        ).fetchone()
    if not row:
        return None
    return {
        "tool": row[0],
        "primary_provider": row[1],
        "primary_model": row[2],
        "fallback_provider": row[3],
        "fallback_model": row[4],
        "updated_by": row[5],
        "updated_at": row[6],
    }


def upsert_tool_model_mapping(
    *,
    tool: str,
    primary_provider: str,
    primary_model: str,
    fallback_provider: str | None,
    fallback_model: str | None,
    actor: str | None,
) -> None:
    if _USE_POSTGRES:
        try:
            asyncio.get_running_loop()
        except RuntimeError:
            asyncio.run(
                upsert_tool_model_mapping_async(
                    tool=tool,
                    primary_provider=primary_provider,
                    primary_model=primary_model,
                    fallback_provider=fallback_provider,
                    fallback_model=fallback_model,
                    actor=actor,
                )
            )
            return
        raise RuntimeError("upsert_tool_model_mapping() cannot be used inside an active event loop; use async variant")

    with conn() as database:
        database.execute(
            """
            INSERT INTO tool_model_mappings (tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(tool) DO UPDATE SET
                primary_provider = excluded.primary_provider,
                primary_model = excluded.primary_model,
                fallback_provider = excluded.fallback_provider,
                fallback_model = excluded.fallback_model,
                updated_by = excluded.updated_by,
                updated_at = strftime('%s','now')
            """,
            (tool, primary_provider, primary_model, fallback_provider, fallback_model, actor),
        )


async def list_tool_model_mappings_async(*, limit: int | None = None) -> list[dict[str, Any]]:
    if _USE_POSTGRES:
        result = await pg_list_tool_model_mappings_async()
        if limit is not None:
            return result[:limit]
        return result
    return await asyncio.to_thread(list_tool_model_mappings, limit=limit)


async def get_tool_model_mapping_async(tool: str) -> dict[str, Any] | None:
    if _USE_POSTGRES:
        return await pg_get_tool_model_mapping_async(tool)
    return await asyncio.to_thread(get_tool_model_mapping, tool)


async def upsert_tool_model_mapping_async(
    *,
    tool: str,
    primary_provider: str,
    primary_model: str,
    fallback_provider: str | None,
    fallback_model: str | None,
    actor: str | None,
) -> None:
    if _USE_POSTGRES:
        await pg_upsert_tool_model_mapping_async(
            tool=tool,
            primary_provider=primary_provider,
            primary_model=primary_model,
            fallback_provider=fallback_provider,
            fallback_model=fallback_model,
            actor=actor,
        )
        return
    await asyncio.to_thread(
        upsert_tool_model_mapping,
        tool=tool,
        primary_provider=primary_provider,
        primary_model=primary_model,
        fallback_provider=fallback_provider,
        fallback_model=fallback_model,
        actor=actor,
    )


async def check_db_health() -> bool:
    if _USE_POSTGRES:
        return await pg_health_check()
    try:
        with conn() as database:
            database.execute("SELECT 1")
        return True
    except sqlite3.Error:  # pragma: no cover - surfaced via health endpoint
        return False


async def shutdown_db() -> None:
    if _USE_POSTGRES:
        await pg_close_pool()



__all__ = [
    "init_db",
    "record_run",
    "record_run_async",
    "store_vector",
    "store_claim",
    "store_embedding",
    "store_embedding_async",
    "upsert_api_key",
    "upsert_api_key_async",
    "fetch_api_key",
    "fetch_api_key_async",
    "fetch_api_key_by_id",
    "fetch_api_key_by_id_async",
    "log_pipeline_event",
    "log_pipeline_event_async",
    "list_pipeline_events",
    "list_pipeline_events_async",
    "upsert_session_settings",
    "upsert_session_settings_async",
    "get_session_settings",
    "get_session_settings_async",
    "list_profiles",
    "list_profiles_async",
    "fetch_profile",
    "fetch_profile_async",
    "upsert_profile",
    "upsert_profile_async",
    "fetch_provider_state",
    "fetch_provider_state_async",
    "update_provider_state",
    "update_provider_state_async",
    "get_environment_settings",
    "get_environment_settings_async",
    "update_environment_settings",
    "update_environment_settings_async",
    "get_active_persona_prompt",
    "get_active_persona_prompt_async",
    "search_embeddings",
    "search_embeddings_async",
    "list_api_keys",
    "list_api_keys_async",
    "update_api_key_limits",
    "update_api_key_limits_async",
    "revoke_api_key",
    "revoke_api_key_async",
    "restore_api_key",
    "restore_api_key_async",
    "list_known_tenants",
    "list_known_tenants_async",
    "create_tenant",
    "create_tenant_async",
    "update_tenant",
    "update_tenant_async",
    "archive_tenant",
    "archive_tenant_async",
    "restore_tenant",
    "restore_tenant_async",
    "fetch_tenant",
    "fetch_tenant_async",
    "list_tenants",
    "list_tenants_async",
    "revoke_api_keys_for_account",
    "revoke_api_keys_for_account_async",
    "touch_api_key",
    "touch_api_key_async",
    "list_audit_events",
    "list_audit_events_async",
    "stage_persona_prompt",
    "publish_persona_prompt",
    "get_active_persona_prompt",
    "get_persona_prompt_by_id",
    "list_persona_versions",
    "stage_provider_config",
    "publish_provider_config",
    "get_active_provider_config",
    "stage_feature_flag",
    "activate_feature_flag",
    "get_feature_flag",
    "list_config_changes",
    "record_audit_event",
    "record_audit_event_async",
    "purge_runs",
    "purge_audit",
    "fetch_expired_documents",
    "delete_documents",
    "list_documents",
    "update_document_bucket",
    "purge_documents_for_session",
    "get_recent_sessions",
    "list_recent_sessions_async",
    "get_session_detail",
    "get_session_detail_async",
    "fetch_session_tenant",
    "fetch_session_tenant_async",
    "create_admin_account",
    "create_admin_account_async",
    "fetch_admin_by_email",
    "fetch_admin_by_email_async",
    "fetch_admin_by_id",
    "fetch_admin_by_id_async",
    "update_admin_password",
    "update_admin_password_async",
    "update_admin_profile",
    "update_admin_profile_async",
    "touch_admin_login",
    "touch_admin_login_async",
    "admin_account_count",
    "admin_account_count_async",
    "list_tool_model_mappings",
    "list_tool_model_mappings_async",
    "get_tool_model_mapping",
    "get_tool_model_mapping_async",
    "upsert_tool_model_mapping",
    "upsert_tool_model_mapping_async",
    "check_db_health",
    "shutdown_db",
]

# Ensure tables exist for CLI/tests without FastAPI startup
if not _USE_POSTGRES:
    _ensure_initialized()
