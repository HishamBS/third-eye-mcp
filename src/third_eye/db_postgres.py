"""Asynchronous PostgreSQL helpers."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from typing import Any, Iterable, Sequence

import psycopg
from psycopg.conninfo import make_conninfo
from psycopg.errors import FeatureNotSupported
from psycopg_pool import AsyncConnectionPool
from psycopg.types.json import Json

from .config import CONFIG
from .constants import ToolName
from .crypto import SecretKeyMissing, decrypt_text, encrypt_text

_CFG = CONFIG.postgres
_POOL: AsyncConnectionPool[Any] | None = None
LOG = logging.getLogger(__name__)
_VECTOR_AVAILABLE = False


def _resolve_conninfo() -> str:
    env_name = _CFG.dsn_env
    raw = os.getenv(env_name)
    if not raw:
        raise RuntimeError(f"{env_name} is not configured")
    options: list[str] = []
    if _CFG.statement_timeout_ms:
        options.append(f"-c statement_timeout={_CFG.statement_timeout_ms}")
    override_ssl = os.getenv("POSTGRES_REQUIRE_SSL")
    if override_ssl is not None:
        require_ssl = override_ssl.lower() not in {"0", "false", "no"}
    else:
        require_ssl = _CFG.require_ssl
    sslmode = None
    if "sslmode=" not in raw.lower():
        sslmode = "require" if require_ssl else "disable"
    return make_conninfo(
        raw,
        application_name=_CFG.application_name,
        connect_timeout=str(_CFG.connect_timeout_seconds),
        sslmode=sslmode,
        options=" ".join(options) if options else None,
    )


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


RUNS_SQL = """
CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    tool TEXT NOT NULL,
    eye TEXT,
    code TEXT,
    ok BOOLEAN,
    topic TEXT,
    input_json JSONB NOT NULL,
    output_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

VECTORS_SQL = """
CREATE TABLE IF NOT EXISTS vectors (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    vector JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

CLAIMS_SQL = """
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    claim TEXT NOT NULL,
    url TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

API_KEYS_SQL = """
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    hashed_secret TEXT NOT NULL,
    role TEXT NOT NULL,
    limits_json JSONB NOT NULL,
    tenant TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    rotated_at TIMESTAMPTZ,
    account_id TEXT
);
CREATE INDEX IF NOT EXISTS ix_api_keys_tenant ON api_keys (tenant);
"""

TENANTS_SQL = """
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    tags JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_tenants_active ON tenants (display_name) WHERE archived_at IS NULL;
"""

ADMIN_ACCOUNTS_SQL = """
CREATE TABLE IF NOT EXISTS admin_accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    password_hash TEXT NOT NULL,
    require_password_reset BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
"""

DOCS_SQL = """
CREATE TABLE IF NOT EXISTS docs (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    bucket TEXT NOT NULL,
    path TEXT NOT NULL,
    bytes INTEGER NOT NULL,
    tags TEXT[] NULL,
    retained_until TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_docs_session ON docs (session_id);
"""

CONFIG_VERSIONS_SQL = """
CREATE TABLE IF NOT EXISTS config_versions (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    version TEXT NOT NULL,
    author TEXT,
    diff JSONB,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_config_versions_kind ON config_versions (kind);
"""

RATE_COUNTERS_SQL = """
CREATE TABLE IF NOT EXISTS rate_counters (
    key TEXT PRIMARY KEY,
    window_start TIMESTAMPTZ NOT NULL,
    hits INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

ENVIRONMENT_SETTINGS_SQL = """
CREATE TABLE IF NOT EXISTS environment_settings (
    id SMALLINT PRIMARY KEY,
    defaults JSONB NOT NULL DEFAULT '[]'::jsonb,
    guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,
    observability JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);
"""

PIPELINE_EVENTS_SQL = """
CREATE TABLE IF NOT EXISTS pipeline_events (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    eye TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'eye_update',
    ok BOOLEAN,
    code TEXT,
    tool_version TEXT,
    md TEXT,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_pipeline_events_session ON pipeline_events (session_id, created_at DESC);
"""

SESSION_SETTINGS_SQL = """
CREATE TABLE IF NOT EXISTS session_settings (
    session_id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

PROFILES_SQL = """
CREATE TABLE IF NOT EXISTS profiles (
    name TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

PROVIDER_STATE_SQL = """
CREATE TABLE IF NOT EXISTS provider_state (
    id SMALLINT PRIMARY KEY,
    mode TEXT NOT NULL,
    engine JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);
"""

VECTOR_EXTENSION_SQL = "CREATE EXTENSION IF NOT EXISTS vector;"

EMBEDDINGS_VECTOR_SQL = """
CREATE TABLE IF NOT EXISTS embeddings (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    topic TEXT,
    chunk_md TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_embeddings_session ON embeddings (session_id, created_at DESC);
"""

EMBEDDINGS_FALLBACK_SQL = """
CREATE TABLE IF NOT EXISTS embeddings (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    topic TEXT,
    chunk_md TEXT NOT NULL,
    embedding JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_embeddings_session ON embeddings (session_id, created_at DESC);
"""

AUDIT_SQL = """
CREATE TABLE IF NOT EXISTS audit (
    id TEXT PRIMARY KEY,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    metadata JSONB,
    ip TEXT,
    session_id TEXT,
    tenant_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

PERSONA_PROMPTS_SQL = """
CREATE TABLE IF NOT EXISTS persona_prompts (
    id TEXT PRIMARY KEY,
    persona TEXT NOT NULL,
    version TEXT NOT NULL,
    content_md TEXT NOT NULL,
    checksum TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    staged BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    supersedes_id TEXT,
    rollback_of TEXT
);
CREATE INDEX IF NOT EXISTS ix_persona_prompts_persona_active
    ON persona_prompts(persona)
    WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS ix_persona_prompts_persona_staged
    ON persona_prompts(persona)
    WHERE staged = TRUE;
"""

PROVIDER_CONFIGS_SQL = """
CREATE TABLE IF NOT EXISTS provider_configs (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    version TEXT NOT NULL,
    config_json JSONB NOT NULL,
    checksum TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    staged BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    supersedes_id TEXT,
    rollback_of TEXT,
    secrets TEXT,
    secrets_checksum TEXT,
    rotated_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_provider_configs_active
    ON provider_configs(provider)
    WHERE active = TRUE;
"""

TOOL_MODEL_MAPPINGS_SQL = """
CREATE TABLE IF NOT EXISTS tool_model_mappings (
    tool TEXT PRIMARY KEY,
    primary_provider TEXT NOT NULL,
    primary_model TEXT NOT NULL,
    fallback_provider TEXT,
    fallback_model TEXT,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""

FEATURE_FLAGS_SQL = """
CREATE TABLE IF NOT EXISTS feature_flags (
    id TEXT PRIMARY KEY,
    flag_key TEXT NOT NULL,
    environment TEXT NOT NULL,
    version TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    staged BOOLEAN NOT NULL DEFAULT TRUE,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    created_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    supersedes_id TEXT,
    rollback_of TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_feature_flags_active
    ON feature_flags(flag_key, environment)
    WHERE active = TRUE;
"""

CONFIG_CHANGE_LOG_SQL = """
CREATE TABLE IF NOT EXISTS config_change_log (
    id TEXT PRIMARY KEY,
    scope TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    diff JSONB,
    actor TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rollback_of TEXT
);
CREATE INDEX IF NOT EXISTS ix_config_change_log_record
    ON config_change_log(record_id);
CREATE INDEX IF NOT EXISTS ix_config_change_log_scope
    ON config_change_log(scope, created_at DESC);
"""


async def _pool() -> AsyncConnectionPool[Any]:
    global _POOL
    if _POOL is None:
        conninfo = _resolve_conninfo()
        _POOL = AsyncConnectionPool(
            conninfo=conninfo,
            min_size=_CFG.pool_min_size,
            max_size=_CFG.pool_max_size,
            max_idle=_CFG.healthcheck_interval_seconds,
            timeout=_CFG.pool_timeout_seconds,
            max_lifetime=_CFG.healthcheck_interval_seconds * 4,
            kwargs={"autocommit": True},
            open=True,
        )
    return _POOL


async def ensure_schema() -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(RUNS_SQL)
            await cur.execute(VECTORS_SQL)
            await cur.execute(CLAIMS_SQL)
            await cur.execute(API_KEYS_SQL)
            await cur.execute(TENANTS_SQL)
            await cur.execute(DOCS_SQL)
            await cur.execute(CONFIG_VERSIONS_SQL)
            await cur.execute(RATE_COUNTERS_SQL)
            await cur.execute(AUDIT_SQL)
            await cur.execute(PERSONA_PROMPTS_SQL)
            await cur.execute(PROVIDER_CONFIGS_SQL)
            await cur.execute(TOOL_MODEL_MAPPINGS_SQL)
            await cur.execute(FEATURE_FLAGS_SQL)
            await cur.execute(CONFIG_CHANGE_LOG_SQL)
            await cur.execute(PIPELINE_EVENTS_SQL)
            await cur.execute(SESSION_SETTINGS_SQL)
            await cur.execute(PROFILES_SQL)
            await cur.execute(PROVIDER_STATE_SQL)
            await cur.execute(ENVIRONMENT_SETTINGS_SQL)
            await cur.execute(
                "ALTER TABLE environment_settings ADD COLUMN IF NOT EXISTS observability JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
            global _VECTOR_AVAILABLE
            _VECTOR_AVAILABLE = False
            enable_vector = os.getenv("POSTGRES_ENABLE_VECTOR", "true").lower() not in {"0", "false", "no"}
            if enable_vector:
                try:
                    await cur.execute(VECTOR_EXTENSION_SQL)
                    await cur.execute(EMBEDDINGS_VECTOR_SQL)
                    _VECTOR_AVAILABLE = True
                except (FeatureNotSupported, psycopg.Error) as exc:
                    LOG.warning("Vector extension unavailable (%s); falling back to JSON embeddings", exc)
                    await cur.execute(EMBEDDINGS_FALLBACK_SQL)
                    _VECTOR_AVAILABLE = False
            else:
                await cur.execute(EMBEDDINGS_FALLBACK_SQL)
                _VECTOR_AVAILABLE = False
            await cur.execute("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS display_name TEXT")
            await cur.execute("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ")
            await cur.execute("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS account_id TEXT")
            await cur.execute("ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS secrets TEXT")
            await cur.execute("ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS secrets_checksum TEXT")
            await cur.execute("ALTER TABLE provider_configs ADD COLUMN IF NOT EXISTS rotated_at TIMESTAMPTZ")
            await cur.execute("ALTER TABLE audit ADD COLUMN IF NOT EXISTS session_id TEXT")
            await cur.execute("ALTER TABLE audit ADD COLUMN IF NOT EXISTS tenant_id TEXT")
            await cur.execute(ADMIN_ACCOUNTS_SQL)

            defaults_cfg, guardrails_cfg = _environment_defaults_from_config()
            observability_cfg = _observability_defaults_from_config()
            await cur.execute(
                """
                INSERT INTO environment_settings (id, defaults, guardrails, observability, updated_by)
                VALUES (1, %s::jsonb, %s::jsonb, %s::jsonb, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    json.dumps(defaults_cfg, ensure_ascii=False),
                    json.dumps(guardrails_cfg, ensure_ascii=False),
                    json.dumps(observability_cfg, ensure_ascii=False),
                    "bootstrap",
                ),
            )
            try:
                navigator_mapping = CONFIG.groq.models.get(ToolName.OVERSEER_NAVIGATOR.value)
                await cur.execute(
                    """
                    INSERT INTO tool_model_mappings (tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by)
                    SELECT %s, 'groq', %s, %s, %s, 'bootstrap'
                    WHERE NOT EXISTS (SELECT 1 FROM tool_model_mappings WHERE tool = %s)
                    """,
                    (
                        ToolName.OVERSEER_NAVIGATOR.value,
                        navigator_mapping.primary,
                        'groq' if navigator_mapping.fallback else None,
                        navigator_mapping.fallback,
                        ToolName.OVERSEER_NAVIGATOR.value,
                    ),
                )
            except KeyError:
                LOG.warning("Navigator mapping missing in config; skipping bootstrap insert")


async def list_tool_model_mappings_async() -> list[dict[str, Any]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by, updated_at
                FROM tool_model_mappings
                ORDER BY tool
                """
            )
            rows = await cur.fetchall()
    return [
        {
            "tool": row[0],
            "primary_provider": row[1],
            "primary_model": row[2],
            "fallback_provider": row[3],
            "fallback_model": row[4],
            "updated_by": row[5],
            "updated_at": row[6].timestamp() if row[6] else None,
        }
        for row in rows
    ]


async def get_tool_model_mapping_async(tool: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by, updated_at
                FROM tool_model_mappings
                WHERE tool = %s
                """,
                (tool,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "tool": row[0],
        "primary_provider": row[1],
        "primary_model": row[2],
        "fallback_provider": row[3],
        "fallback_model": row[4],
        "updated_by": row[5],
        "updated_at": row[6].timestamp() if row[6] else None,
    }


async def upsert_tool_model_mapping_async(
    *,
    tool: str,
    primary_provider: str,
    primary_model: str,
    fallback_provider: str | None,
    fallback_model: str | None,
    actor: str | None,
) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO tool_model_mappings (tool, primary_provider, primary_model, fallback_provider, fallback_model, updated_by)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (tool) DO UPDATE
                SET primary_provider = EXCLUDED.primary_provider,
                    primary_model = EXCLUDED.primary_model,
                    fallback_provider = EXCLUDED.fallback_provider,
                    fallback_model = EXCLUDED.fallback_model,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = TIMEZONE('UTC', NOW())
                """,
                (tool, primary_provider, primary_model, fallback_provider, fallback_model, actor),
            )


async def record_run(
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
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO runs (id, session_id, tool, eye, code, ok, topic, input_json, output_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET session_id = EXCLUDED.session_id,
                    tool = EXCLUDED.tool,
                    eye = EXCLUDED.eye,
                    code = EXCLUDED.code,
                    ok = EXCLUDED.ok,
                    topic = EXCLUDED.topic,
                    input_json = EXCLUDED.input_json,
                    output_json = EXCLUDED.output_json
                """,
                (
                    run_id,
                    session_id,
                    tool,
                    eye,
                    code,
                    ok,
                    topic,
                    json.dumps(input_payload, ensure_ascii=False),
                    json.dumps(output_payload, ensure_ascii=False),
                ),
            )


async def store_vector(*, vector_id: str, topic: str, vector: Iterable[float]) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO vectors (id, topic, vector)
                VALUES (%s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET topic = EXCLUDED.topic,
                    vector = EXCLUDED.vector
                """,
                (
                    vector_id,
                    topic,
                    json.dumps(list(vector)),
                ),
            )


async def store_claim(*, claim_id: str, claim: str, url: str, confidence: float) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO claims (id, claim, url, confidence)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET claim = EXCLUDED.claim,
                    url = EXCLUDED.url,
                    confidence = EXCLUDED.confidence
                """,
                (
                    claim_id,
                    claim,
                    url,
                    confidence,
                ),
            )


def _coerce_jsonb(value: Any) -> dict[str, Any]:
    """Return JSONB payloads as native dicts without redundant parsing."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, memoryview):
        value = value.tobytes()
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8")
    if isinstance(value, str):
        return json.loads(value or "{}")
    return value  # pragma: no cover - defensive for unexpected adapters


async def upsert_api_key(
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
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO api_keys (id, hashed_secret, role, limits_json, tenant, display_name, created_at, expires_at, revoked_at, rotated_at, account_id)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), to_timestamp(%s), to_timestamp(%s), to_timestamp(%s), %s)
                ON CONFLICT (id) DO UPDATE
                SET hashed_secret = EXCLUDED.hashed_secret,
                    role = EXCLUDED.role,
                    limits_json = EXCLUDED.limits_json,
                    tenant = EXCLUDED.tenant,
                    display_name = EXCLUDED.display_name,
                    expires_at = EXCLUDED.expires_at,
                    revoked_at = EXCLUDED.revoked_at,
                    rotated_at = CASE
                        WHEN api_keys.hashed_secret <> EXCLUDED.hashed_secret THEN EXCLUDED.rotated_at
                        ELSE api_keys.rotated_at
                    END,
                    account_id = EXCLUDED.account_id
                """,
                (
                    key_id,
                    hashed_secret,
                    role,
                    Json(limits_json),
                    tenant,
                    display_name,
                    expires_at,
                    revoked_at,
                    rotated_at,
                    account_id,
                ),
            )


async def fetch_api_key(*, hashed_secret: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, role, limits_json, tenant, display_name,
                       EXTRACT(EPOCH FROM expires_at),
                       EXTRACT(EPOCH FROM revoked_at),
                       EXTRACT(EPOCH FROM rotated_at),
                       account_id
                FROM api_keys
                WHERE hashed_secret = %s
                """,
                (hashed_secret,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "role": row[1],
        "limits": _coerce_jsonb(row[2]),
        "tenant": row[3],
        "display_name": row[4],
        "expires_at": row[5],
        "revoked_at": row[6],
        "rotated_at": row[7],
        "account_id": row[8],
    }


async def fetch_api_key_by_id(key_id: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, role, limits_json, tenant, display_name,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM expires_at),
                       EXTRACT(EPOCH FROM revoked_at),
                       EXTRACT(EPOCH FROM last_used_at),
                       EXTRACT(EPOCH FROM rotated_at),
                       account_id
                FROM api_keys
                WHERE id = %s
                """,
                (key_id,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    limits = _coerce_jsonb(row[2])
    return {
        "id": row[0],
        "role": row[1],
        "limits": limits,
        "tenant": row[3],
        "display_name": row[4],
        "created_at": row[5],
        "expires_at": row[6],
        "revoked_at": row[7],
        "last_used_at": row[8],
        "rotated_at": row[9],
        "account_id": row[10],
    }


async def list_api_keys(
    *,
    include_revoked: bool,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    pool = await _pool()
    clause = "" if include_revoked else "WHERE revoked_at IS NULL"
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id, role, limits_json, tenant, display_name,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM expires_at),
                       EXTRACT(EPOCH FROM revoked_at),
                       EXTRACT(EPOCH FROM last_used_at),
                       EXTRACT(EPOCH FROM rotated_at),
                       account_id
                FROM api_keys
                {clause}
                ORDER BY created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )
            rows = await cur.fetchall()
    results: list[dict[str, Any]] = []
    for row in rows:
        limits = _coerce_jsonb(row[2])
        results.append(
            {
                "id": row[0],
                "role": row[1],
                "limits": limits,
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
    return results


async def create_tenant(
    *,
    tenant_id: str,
    display_name: str,
    description: str | None,
    metadata: dict[str, Any] | None,
    tags: list[str] | None,
) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO tenants (id, display_name, description, metadata, tags)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    tenant_id,
                    display_name,
                    description,
                    Json(metadata or {}),
                    Json(tags or []),
                ),
            )
            if cur.rowcount == 0:
                raise ValueError("Tenant already exists")


async def update_tenant(
    *,
    tenant_id: str,
    display_name: str | None = None,
    description: str | None = None,
    metadata: dict[str, Any] | None = None,
    tags: list[str] | None = None,
) -> None:
    assignments: list[str] = []
    params: list[Any] = []
    if display_name is not None:
        assignments.append("display_name = %s")
        params.append(display_name)
    if description is not None:
        assignments.append("description = %s")
        params.append(description)
    if metadata is not None:
        assignments.append("metadata = %s")
        params.append(Json(metadata))
    if tags is not None:
        assignments.append("tags = %s")
        params.append(Json(tags))
    if not assignments:
        return
    assignments.append("updated_at = NOW()")
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            params.append(tenant_id)
            await cur.execute(
                "UPDATE tenants SET " + ", ".join(assignments) + " WHERE id = %s",
                tuple(params),
            )
            if cur.rowcount == 0:
                raise ValueError("Tenant not found")


async def archive_tenant(*, tenant_id: str) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE tenants
                SET archived_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (tenant_id,),
            )
            if cur.rowcount == 0:
                raise ValueError("Tenant not found")


async def restore_tenant(*, tenant_id: str) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE tenants
                SET archived_at = NULL,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (tenant_id,),
            )
            if cur.rowcount == 0:
                raise ValueError("Tenant not found")


async def fetch_tenant(*, tenant_id: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id,
                       display_name,
                       description,
                       metadata,
                       tags,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM updated_at),
                       EXTRACT(EPOCH FROM archived_at)
                FROM tenants
                WHERE id = %s
                """,
                (tenant_id,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "display_name": row[1],
        "description": row[2],
        "metadata": _coerce_jsonb(row[3]) if row[3] is not None else {},
        "tags": _coerce_jsonb(row[4]) if row[4] is not None else [],
        "created_at": row[5],
        "updated_at": row[6],
        "archived_at": row[7],
    }


async def list_tenants(
    *,
    include_archived: bool,
    search: str | None,
    limit: int,
    offset: int,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if not include_archived:
        clauses.append("t.archived_at IS NULL")
    if search:
        like = f"%{search.lower()}%"
        clauses.append("(LOWER(t.id) LIKE %s OR LOWER(t.display_name) LIKE %s)")
        params.extend([like, like])
    where_sql = " WHERE " + " AND ".join(clauses) if clauses else ""
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT
                    t.id,
                    t.display_name,
                    t.description,
                    t.metadata,
                    t.tags,
                    EXTRACT(EPOCH FROM t.created_at),
                    EXTRACT(EPOCH FROM t.updated_at),
                    EXTRACT(EPOCH FROM t.archived_at),
                    COUNT(k.id) FILTER (WHERE k.revoked_at IS NULL) AS active_keys,
                    COUNT(k.id) AS total_keys,
                    MAX(EXTRACT(EPOCH FROM k.rotated_at)) AS last_key_rotated_at,
                    MAX(EXTRACT(EPOCH FROM k.last_used_at)) AS last_key_used_at
                FROM tenants t
                LEFT JOIN api_keys k ON k.tenant = t.id
                {where_sql}
                GROUP BY t.id, t.display_name, t.description, t.metadata, t.tags, t.created_at, t.updated_at, t.archived_at
                ORDER BY t.display_name ASC
                LIMIT %s OFFSET %s
                """,
                (*params, limit, offset),
            )
            rows = await cur.fetchall()
            if not rows:
                fallback_clauses = ["tenant IS NOT NULL", "tenant <> ''"]
                fallback_params: list[Any] = []
                if search:
                    like = f"%{search.lower()}%"
                    fallback_clauses.append("LOWER(tenant) LIKE %s")
                    fallback_params.append(like)
                fallback_where = " WHERE " + " AND ".join(fallback_clauses) if fallback_clauses else ""
                await cur.execute(
                    f"""
                    SELECT
                        tenant AS id,
                        tenant AS display_name,
                        NULL AS description,
                        '{{}}'::jsonb AS metadata,
                        '[]'::jsonb AS tags,
                        MIN(EXTRACT(EPOCH FROM created_at)) AS created_at,
                        MAX(EXTRACT(EPOCH FROM created_at)) AS updated_at,
                        NULL AS archived_at,
                        COUNT(id) FILTER (WHERE revoked_at IS NULL) AS active_keys,
                        COUNT(id) AS total_keys,
                        MAX(EXTRACT(EPOCH FROM rotated_at)) AS last_key_rotated_at,
                        MAX(EXTRACT(EPOCH FROM last_used_at)) AS last_key_used_at
                    FROM api_keys
                    {fallback_where}
                    GROUP BY tenant
                    ORDER BY tenant ASC
                    LIMIT %s OFFSET %s
                    """,
                    (*fallback_params, limit, offset),
                )
                rows = await cur.fetchall()
                fallback = True
    results: list[dict[str, Any]] = []
    for row in rows:
        metadata = _coerce_jsonb(row[3]) if row[3] is not None else {}
        tags = _coerce_jsonb(row[4]) if row[4] is not None else []
        results.append(
            {
                "id": row[0],
                "display_name": row[1],
                "description": row[2],
                "metadata": metadata,
                "tags": tags,
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


async def list_known_tenants(limit: int = 200) -> list[str]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id
                FROM tenants
                WHERE archived_at IS NULL
                ORDER BY display_name ASC
                LIMIT %s
                """,
                (limit,),
            )
            rows = await cur.fetchall()
            if rows:
                return [row[0] for row in rows if row and row[0]]
            await cur.execute(
                """
                SELECT DISTINCT tenant
                FROM api_keys
                WHERE tenant IS NOT NULL AND tenant <> ''
                ORDER BY tenant ASC
                LIMIT %s
                """,
                (limit,),
            )
            fallback = await cur.fetchall()
    return [row[0] for row in fallback if row and row[0]]


async def create_admin_account(
    *,
    admin_id: str,
    email: str,
    display_name: str | None,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO admin_accounts (id, email, display_name, password_hash, require_password_reset)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email,
                    display_name = EXCLUDED.display_name,
                    password_hash = EXCLUDED.password_hash,
                    require_password_reset = EXCLUDED.require_password_reset,
                    updated_at = NOW()
                """,
                (admin_id, email, display_name, password_hash, require_password_reset),
            )


def _admin_row_to_dict(row: Sequence[Any]) -> dict[str, Any]:
    return {
        "id": row[0],
        "email": row[1],
        "display_name": row[2],
        "password_hash": row[3],
        "require_password_reset": row[4],
        "created_at": row[5],
        "updated_at": row[6],
        "last_login_at": row[7],
    }


async def fetch_admin_by_email(email: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, email, display_name, password_hash, require_password_reset,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM updated_at),
                       EXTRACT(EPOCH FROM last_login_at)
                FROM admin_accounts
                WHERE LOWER(email) = LOWER(%s)
                """,
                (email,),
            )
            row = await cur.fetchone()
    return _admin_row_to_dict(row) if row else None


async def fetch_admin_by_id(admin_id: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, email, display_name, password_hash, require_password_reset,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM updated_at),
                       EXTRACT(EPOCH FROM last_login_at)
                FROM admin_accounts
                WHERE id = %s
                """,
                (admin_id,),
            )
            row = await cur.fetchone()
    return _admin_row_to_dict(row) if row else None


async def update_admin_password(
    *,
    admin_id: str,
    password_hash: str,
    require_password_reset: bool,
) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE admin_accounts
                SET password_hash = %s,
                    require_password_reset = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (password_hash, require_password_reset, admin_id),
            )


async def update_admin_profile(
    *,
    admin_id: str,
    email: str | None = None,
    display_name: str | None = None,
) -> None:
    assignments: list[str] = []
    params: list[Any] = []
    if email is not None:
        assignments.append("email = %s")
        params.append(email)
    if display_name is not None:
        assignments.append("display_name = %s")
        params.append(display_name)
    if not assignments:
        return
    assignments.append("updated_at = NOW()")
    params.append(admin_id)
    sql = "UPDATE admin_accounts SET " + ", ".join(assignments) + " WHERE id = %s"
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, tuple(params))


async def touch_admin_login(admin_id: str) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE admin_accounts
                SET last_login_at = NOW(),
                    updated_at = NOW()
                WHERE id = %s
                """,
                (admin_id,),
            )


async def admin_count() -> int:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT COUNT(*) FROM admin_accounts")
            row = await cur.fetchone()
    return int(row[0]) if row else 0


async def update_api_key_limits(
    *,
    key_id: str,
    limits: dict[str, Any],
    expires_at: float | None,
    display_name: str | None,
    display_name_is_set: bool,
) -> None:
    assignments = ["limits_json = %s", "expires_at = to_timestamp(%s)"]
    params: list[Any] = [Json(limits), expires_at]
    if display_name_is_set:
        assignments.append("display_name = %s")
        params.append(display_name)
    params.append(key_id)
    sql = "UPDATE api_keys SET " + ", ".join(assignments) + " WHERE id = %s"
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, tuple(params))


async def revoke_api_key(*, key_id: str, revoked_at: float) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE api_keys SET revoked_at = to_timestamp(%s) WHERE id = %s",
                (revoked_at, key_id),
            )


async def restore_api_key(*, key_id: str) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE api_keys SET revoked_at = NULL WHERE id = %s",
                (key_id,),
            )


async def revoke_api_keys_for_account(
    *,
    account_id: str,
    exclude_key_id: str | None = None,
) -> int:
    pool = await _pool()
    params: list[Any] = [account_id]
    sql = "UPDATE api_keys SET revoked_at = NOW() WHERE account_id = %s"
    if exclude_key_id:
        sql += " AND id <> %s"
        params.append(exclude_key_id)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, tuple(params))
            return cur.rowcount or 0


async def record_audit_event(
    *,
    actor: str | None,
    action: str,
    target: str | None,
    metadata: dict[str, Any] | None,
    ip: str | None,
    session_id: str | None,
    tenant_id: str | None,
) -> None:
    payload = json.dumps(metadata or {}, ensure_ascii=False)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO audit (id, actor, action, target, metadata, ip, session_id, tenant_id, created_at)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, NOW())
                """,
                (str(uuid.uuid4()), actor, action, target, payload, ip, session_id, tenant_id),
            )


async def list_audit_events(
    *,
    since: float | None,
    until: float | None,
    tenant: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if since is not None:
        clauses.append("created_at >= to_timestamp(%s)")
        params.append(since)
    if until is not None:
        clauses.append("created_at <= to_timestamp(%s)")
        params.append(until)
    if tenant:
        clauses.append("tenant_id = %s")
        params.append(tenant)
    where_clause = ""
    if clauses:
        where_clause = " WHERE " + " AND ".join(clauses)
    params.append(limit)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id, actor, action, target, metadata,
                       ip, session_id, tenant_id,
                       EXTRACT(EPOCH FROM created_at)
                FROM audit
                {where_clause}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = await cur.fetchall()
    events: list[dict[str, Any]] = []
    for row in rows:
        events.append(
            {
                "id": row[0],
                "actor": row[1],
                "action": row[2],
                "target": row[3],
                "metadata": row[4] or {},
                "ip": row[5],
                "session_id": row[6],
                "tenant_id": row[7],
                "created_at": row[8],
            }
        )
    return events


async def purge_runs(before: float, *, dry_run: bool) -> int:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(*) FROM runs WHERE created_at < to_timestamp(%s)",
                (before,),
            )
            count = (await cur.fetchone())[0]
            if not dry_run and count:
                await cur.execute(
                    "DELETE FROM runs WHERE created_at < to_timestamp(%s)",
                    (before,),
                )
    return int(count)


async def purge_audit(before: float, *, dry_run: bool) -> int:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT COUNT(*) FROM audit WHERE created_at < to_timestamp(%s)",
                (before,),
            )
            count = (await cur.fetchone())[0]
            if not dry_run and count:
                await cur.execute(
                    "DELETE FROM audit WHERE created_at < to_timestamp(%s)",
                    (before,),
                )
    return int(count)


async def fetch_expired_documents(
    *,
    tmp_cutoff: float,
    retained_cutoff: float,
    now_ts: float,
) -> list[tuple[str, str, str]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, bucket, path
                FROM docs
                WHERE (
                    bucket = 'tmp' AND created_at < to_timestamp(%s)
                    AND (retained_until IS NULL OR retained_until < to_timestamp(%s))
                )
                OR (
                    bucket <> 'tmp' AND retained_until IS NOT NULL
                    AND retained_until < to_timestamp(%s)
                    AND created_at < to_timestamp(%s)
                )
                """,
                (tmp_cutoff, now_ts, now_ts, retained_cutoff),
            )
            rows = await cur.fetchall()
    return [(row[0], row[1], row[2]) for row in rows]


async def delete_documents(ids: Sequence[str]) -> int:
    if not ids:
        return 0
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM docs WHERE id = ANY(%s)",
                (list(ids),),
            )
            return cur.rowcount


async def list_documents(
    *,
    session_id: str | None,
    bucket: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    clauses: list[str] = []
    params: list[Any] = []
    if session_id:
        clauses.append("session_id = %s")
        params.append(session_id)
    if bucket:
        clauses.append("bucket = %s")
        params.append(bucket)
    where_clause = ""
    if clauses:
        where_clause = " WHERE " + " AND ".join(clauses)
    params.append(limit)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id, session_id, bucket, path, bytes, tags,
                       EXTRACT(EPOCH FROM retained_until),
                       EXTRACT(EPOCH FROM last_accessed_at),
                       EXTRACT(EPOCH FROM created_at)
                FROM docs
                {where_clause}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = await cur.fetchall()
    documents: list[dict[str, Any]] = []
    for row in rows:
        documents.append(
            {
                "id": row[0],
                "session_id": row[1],
                "bucket": row[2],
                "path": row[3],
                "bytes": row[4],
                "tags": row[5] or [],
                "retained_until": row[6],
                "last_accessed_at": row[7],
                "created_at": row[8],
            }
        )
    return documents


async def update_document_bucket(
    *,
    doc_id: str,
    bucket: str,
    retained_until: float | None,
) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE docs
                SET bucket = %s,
                    retained_until = CASE WHEN %s IS NULL THEN NULL ELSE to_timestamp(%s) END
                WHERE id = %s
                """,
                (bucket, retained_until, retained_until, doc_id),
            )


async def purge_documents_for_session(*, session_id: str) -> int:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id FROM docs WHERE session_id = %s",
                (session_id,),
            )
            ids = [row[0] for row in await cur.fetchall()]
    return await delete_documents(ids)


async def insert_pipeline_event(*, session_id: str, eye: str, event_type: str, ok: bool | None, code: str | None, tool_version: str | None, md: str | None, data: dict[str, Any] | None) -> None:
    payload = json.dumps(data or {}, ensure_ascii=False)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO pipeline_events (session_id, eye, event_type, ok, code, tool_version, md, data)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (session_id, eye, event_type, ok, code, tool_version, md, payload),
            )


async def list_pipeline_events(*, session_id: str, from_ts: float | None, to_ts: float | None, limit: int) -> list[dict[str, Any]]:
    clauses = ["session_id = %s"]
    params: list[Any] = [session_id]
    if from_ts is not None:
        clauses.append("created_at >= to_timestamp(%s)")
        params.append(from_ts)
    if to_ts is not None:
        clauses.append("created_at <= to_timestamp(%s)")
        params.append(to_ts)
    where_clause = " WHERE " + " AND ".join(clauses)
    params.append(limit)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id, eye, event_type, ok, code, tool_version, md, data, EXTRACT(EPOCH FROM created_at)
                FROM pipeline_events
                {where_clause}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = await cur.fetchall()
    events: list[dict[str, Any]] = []
    for row in rows:
        events.append(
            {
                "id": row[0],
                "eye": row[1],
                "event_type": row[2],
                "ok": row[3],
                "code": row[4],
                "tool_version": row[5],
                "md": row[6],
                "data": row[7] or {},
                "created_at": row[8],
            }
        )
    return events


async def list_recent_sessions(limit: int) -> list[dict[str, Any]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT
                    session_id,
                    MIN(EXTRACT(EPOCH FROM created_at)) AS created_at,
                    MAX(EXTRACT(EPOCH FROM created_at)) AS last_event_at
                FROM pipeline_events
                GROUP BY session_id
                ORDER BY last_event_at DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = await cur.fetchall()
    return [
        {
            "session_id": row[0],
            "created_at": row[1],
            "last_event_at": row[2],
        }
        for row in rows
    ]


async def fetch_session_tenant(session_id: str) -> str | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT tenant_id
                FROM audit
                WHERE session_id = %s AND tenant_id IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (session_id,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    tenant = row[0]
    return tenant if tenant else None


async def upsert_session_settings(*, session_id: str, data: dict[str, Any]) -> None:
    payload = json.dumps(data or {}, ensure_ascii=False)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO session_settings (session_id, data)
                VALUES (%s, %s::jsonb)
                ON CONFLICT (session_id) DO UPDATE
                SET data = EXCLUDED.data, updated_at = NOW()
                """,
                (session_id, payload),
            )


async def fetch_session_settings(session_id: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT data FROM session_settings WHERE session_id = %s",
                (session_id,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return row[0] or {}


async def list_profiles() -> list[dict[str, Any]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT name,
                       data,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM updated_at)
                FROM profiles
                ORDER BY name
                """
            )
            rows = await cur.fetchall()
    profiles: list[dict[str, Any]] = []
    for row in rows:
        profiles.append(
            {
                "name": row[0],
                "data": row[1] or {},
                "created_at": row[2],
                "updated_at": row[3],
            }
        )
    return profiles


async def fetch_profile(name: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT data,
                       EXTRACT(EPOCH FROM created_at),
                       EXTRACT(EPOCH FROM updated_at)
                FROM profiles
                WHERE name = %s
                """,
                (name,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "name": name,
        "data": row[0] or {},
        "created_at": row[1],
        "updated_at": row[2],
    }


async def upsert_profile(
    *,
    name: str,
    data: dict[str, Any],
    actor: str | None = None,
) -> dict[str, Any]:
    payload = Json(data or {})
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO profiles (name, data)
                VALUES (%s, %s)
                ON CONFLICT (name) DO UPDATE
                SET data = EXCLUDED.data,
                    updated_at = TIMEZONE('UTC', NOW())
                RETURNING data,
                          EXTRACT(EPOCH FROM created_at),
                          EXTRACT(EPOCH FROM updated_at)
                """,
                (name, payload),
            )
            row = await cur.fetchone()
    await _record_change(
        scope="profile",
        record_id=name,
        action="upsert",
        diff=data,
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return {
        "name": name,
        "data": row[0] or {},
        "created_at": row[1],
        "updated_at": row[2],
    }


async def fetch_provider_state() -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT mode,
                       engine,
                       EXTRACT(EPOCH FROM updated_at),
                       updated_by
                FROM provider_state
                WHERE id = 1
                """
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "mode": row[0],
        "engine": row[1] or {},
        "updated_at": row[2],
        "updated_by": row[3],
    }


async def update_provider_state(
    *,
    mode: str,
    engine: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    engine_json = json.dumps(engine or {}, ensure_ascii=False)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO provider_state (id, mode, engine, updated_by)
                VALUES (1, %s, %s::jsonb, %s)
                ON CONFLICT (id) DO UPDATE
                SET mode = EXCLUDED.mode,
                    engine = EXCLUDED.engine,
                    updated_at = TIMEZONE('UTC', NOW()),
                    updated_by = EXCLUDED.updated_by
                RETURNING mode,
                          engine,
                          EXTRACT(EPOCH FROM updated_at),
                          updated_by
                """,
                (mode, engine_json, actor),
            )
            row = await cur.fetchone()
    await _record_change(
        scope="provider_state",
        record_id="global",
        action="update",
        diff={"mode": mode, "engine": engine},
        actor=actor,
        notes=None,
        rollback_of=None,
    )
    return {
        "mode": row[0],
        "engine": row[1] or {},
        "updated_at": row[2],
        "updated_by": row[3],
    }


async def fetch_environment_settings() -> dict[str, Any]:
    defaults_cfg, guardrails_cfg = _environment_defaults_from_config()
    observability_cfg = _observability_defaults_from_config()
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT defaults, guardrails, observability, EXTRACT(EPOCH FROM updated_at), updated_by
                FROM environment_settings
                WHERE id = 1
                """
            )
            row = await cur.fetchone()
    if not row:
        return {
            "defaults": defaults_cfg,
            "guardrails": guardrails_cfg,
            "observability": observability_cfg,
            "updated_at": None,
            "updated_by": None,
        }
    defaults = row[0] if isinstance(row[0], list) else row[0] or defaults_cfg
    guardrails = row[1] if isinstance(row[1], dict) else row[1] or guardrails_cfg
    observability = row[2] if isinstance(row[2], dict) else row[2] or observability_cfg
    return {
        "defaults": defaults,
        "guardrails": guardrails,
        "observability": observability,
        "updated_at": row[3],
        "updated_by": row[4],
    }


async def update_environment_settings(
    *,
    defaults: list[dict[str, Any]],
    guardrails: dict[str, Any],
    observability: dict[str, Any],
    actor: str | None,
) -> dict[str, Any]:
    defaults_json = json.dumps(defaults, ensure_ascii=False)
    guardrails_json = json.dumps(guardrails, ensure_ascii=False)
    observability_json = json.dumps(observability, ensure_ascii=False)
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO environment_settings (id, defaults, guardrails, observability, updated_by)
                VALUES (1, %s::jsonb, %s::jsonb, %s::jsonb, %s)
                ON CONFLICT (id) DO UPDATE
                SET defaults = EXCLUDED.defaults,
                    guardrails = EXCLUDED.guardrails,
                    observability = EXCLUDED.observability,
                    updated_at = TIMEZONE('UTC', NOW()),
                    updated_by = EXCLUDED.updated_by
                RETURNING defaults, guardrails, observability, EXTRACT(EPOCH FROM updated_at), updated_by
                """,
                (defaults_json, guardrails_json, observability_json, actor),
            )
            row = await cur.fetchone()

    await _record_change(
        scope="environment_settings",
        record_id="global",
        action="update",
        diff={"defaults": defaults, "guardrails": guardrails, "observability": observability},
        actor=actor,
        notes=None,
        rollback_of=None,
    )

    defaults_out = row[0] if isinstance(row[0], list) else row[0] or []
    guardrails_out = row[1] if isinstance(row[1], dict) else row[1] or {}
    observability_out = row[2] if isinstance(row[2], dict) else row[2] or observability
    return {
        "defaults": defaults_out,
        "guardrails": guardrails_out,
        "observability": observability_out,
        "updated_at": row[3],
        "updated_by": row[4],
    }


async def store_embedding(*, session_id: str, topic: str | None, chunk_md: str, embedding: list[float]) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            if _VECTOR_AVAILABLE:
                await cur.execute(
                    """
                    INSERT INTO embeddings (session_id, topic, chunk_md, embedding)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (session_id, topic, chunk_md, embedding),
                )
            else:
                await cur.execute(
                    """
                    INSERT INTO embeddings (session_id, topic, chunk_md, embedding)
                    VALUES (%s, %s, %s, %s::jsonb)
                    """,
                    (session_id, topic, chunk_md, json.dumps(embedding)),
                )


async def search_embeddings(
    *,
    session_id: str,
    query_vector: list[float],
    limit: int,
    topic: str | None = None,
    exclude_session_id: str | None = None,
) -> list[dict[str, Any]]:
    if not _VECTOR_AVAILABLE:
        return []
    clauses: list[str] = []
    params: list[Any] = []
    if topic:
        clauses.append("topic = %s")
        params.append(topic)
    if exclude_session_id:
        clauses.append("session_id <> %s")
        params.append(exclude_session_id)
    where_clause = f" WHERE {' AND '.join(clauses)}" if clauses else ""
    query_params = tuple(params + [query_vector, query_vector, limit])
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"""
                SELECT id, session_id, topic, chunk_md, EXTRACT(EPOCH FROM created_at), embedding <=> %s AS distance
                FROM embeddings
                {where_clause}
                ORDER BY embedding <=> %s
                LIMIT %s
                """,
                query_params,
            )
            rows = await cur.fetchall()
    results: list[dict[str, Any]] = []
    for row in rows:
        results.append(
            {
                "id": row[0],
                "session_id": row[1],
                "topic": row[2],
                "chunk_md": row[3],
                "created_at": row[4],
                "distance": float(row[5]) if row[5] is not None else None,
            }
        )
    return results



async def touch_api_key(*, key_id: str) -> None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE api_keys
                SET last_used_at = NOW()
                WHERE id = %s
                """,
                (key_id,),
            )


async def _record_change(
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
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO config_change_log (id, scope, record_id, action, diff, actor, notes, rollback_of)
                VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                """,
                (str(uuid.uuid4()), scope, record_id, action, payload, actor, notes, rollback_of),
            )


async def stage_persona_prompt(
    *,
    prompt_id: str,
    persona: str,
    version: str,
    content_md: str,
    checksum: str,
    metadata: dict[str, Any] | None,
    created_by: str | None,
    notes: str | None,
    rollback_of: str | None,
) -> None:
    pool = await _pool()
    meta_payload = json.dumps(metadata or {}, ensure_ascii=False)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO persona_prompts (id, persona, version, content_md, checksum, metadata, staged, active, created_by, notes, rollback_of)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, TRUE, FALSE, %s, %s, %s)
                """,
                (prompt_id, persona, version, content_md, checksum, meta_payload, created_by, notes, rollback_of),
            )
    await _record_change(
        scope="persona_prompt",
        record_id=prompt_id,
        action="stage",
        diff={
            "persona": persona,
            "version": version,
            "checksum": checksum,
            "metadata": metadata or {},
        },
        actor=created_by,
        notes=notes,
        rollback_of=rollback_of,
    )


async def publish_persona_prompt(
    *,
    prompt_id: str,
    actor: str | None,
    notes: str | None,
) -> None:
    pool = await _pool()
    previous_id: str | None = None
    persona: str | None = None
    version: str | None = None
    checksum: str | None = None

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute("SELECT persona, version, checksum FROM persona_prompts WHERE id = %s", (prompt_id,))
            row = await cur.fetchone()
            if not row:
                raise ValueError(f"Persona prompt '{prompt_id}' not found")
            persona, version, checksum = row

            await cur.execute(
                "SELECT id FROM persona_prompts WHERE persona = %s AND active = TRUE",
                (persona,),
            )
            existing = await cur.fetchone()
            if existing:
                previous_id = existing[0]

            await cur.execute("UPDATE persona_prompts SET active = FALSE WHERE persona = %s", (persona,))
            await cur.execute(
                """
                UPDATE persona_prompts
                SET active = TRUE,
                    staged = FALSE,
                    approved_at = NOW(),
                    supersedes_id = %s
                WHERE id = %s
                """,
                (previous_id, prompt_id),
            )

    await _record_change(
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


async def fetch_active_persona_prompt(persona: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, persona, version, content_md, checksum, metadata, created_by, notes,
                       created_at, approved_at, supersedes_id, rollback_of
                FROM persona_prompts
                WHERE persona = %s AND active = TRUE
                """,
                (persona,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "persona": row[1],
        "version": row[2],
        "content_md": row[3],
        "checksum": row[4],
        "metadata": row[5] or {},
        "created_by": row[6],
        "notes": row[7],
        "created_at": row[8],
        "approved_at": row[9],
        "supersedes_id": row[10],
        "rollback_of": row[11],
    }


async def fetch_persona_versions(persona: str, *, limit: int) -> list[dict[str, Any]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, version, active, staged, created_at, approved_at
                FROM persona_prompts
                WHERE persona = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (persona, limit),
            )
            rows = await cur.fetchall()
    return [
        {
            "id": row[0],
            "version": row[1],
            "active": row[2],
            "staged": row[3],
            "created_at": row[4],
            "approved_at": row[5],
        }
        for row in rows
    ]


async def fetch_persona_prompt_by_id(prompt_id: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, persona, version, content_md, checksum, metadata, created_by, notes,
                       created_at, approved_at, supersedes_id, rollback_of
                FROM persona_prompts
                WHERE id = %s
                """,
                (prompt_id,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "persona": row[1],
        "version": row[2],
        "content_md": row[3],
        "checksum": row[4],
        "metadata": row[5] or {},
        "created_by": row[6],
        "notes": row[7],
        "created_at": row[8],
        "approved_at": row[9],
        "supersedes_id": row[10],
        "rollback_of": row[11],
    }


async def stage_provider_config(
    *,
    config_id: str,
    provider: str,
    version: str,
    config_json: dict[str, Any],
    checksum: str,
    metadata: dict[str, Any] | None,
    created_by: str | None,
    notes: str | None,
    rollback_of: str | None,
    secrets_ciphertext: str | None,
    secrets_checksum: str | None,
    rotated_at: float | None,
) -> None:
    pool = await _pool()
    payload = json.dumps(config_json, ensure_ascii=False)
    meta_payload = json.dumps(metadata or {}, ensure_ascii=False)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO provider_configs (
                    id, provider, version, config_json, checksum, metadata,
                    staged, active, created_by, notes, rollback_of,
                    secrets, secrets_checksum, rotated_at
                )
                VALUES (%s, %s, %s, %s::jsonb, %s, %s::jsonb, TRUE, FALSE, %s, %s, %s, %s, %s, to_timestamp(%s))
                """,
                (
                    config_id,
                    provider,
                    version,
                    payload,
                    checksum,
                    meta_payload,
                    created_by,
                    notes,
                    rollback_of,
                    secrets_ciphertext,
                    secrets_checksum,
                    rotated_at,
                ),
            )
    await _record_change(
        scope="provider_config",
        record_id=config_id,
        action="stage",
        diff={
            "provider": provider,
            "version": version,
            "checksum": checksum,
            "metadata": metadata or {},
            "secrets_checksum": secrets_checksum,
        },
        actor=created_by,
        notes=notes,
        rollback_of=rollback_of,
    )


async def publish_provider_config(
    *,
    config_id: str,
    actor: str | None,
    notes: str | None,
) -> None:
    pool = await _pool()
    provider: str | None = None
    version: str | None = None
    checksum: str | None = None
    previous_id: str | None = None

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT provider, version, checksum FROM provider_configs WHERE id = %s",
                (config_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise ValueError(f"Provider config '{config_id}' not found")
            provider, version, checksum = row

            await cur.execute(
                "SELECT id FROM provider_configs WHERE provider = %s AND active = TRUE",
                (provider,),
            )
            existing = await cur.fetchone()
            if existing:
                previous_id = existing[0]

            await cur.execute("UPDATE provider_configs SET active = FALSE WHERE provider = %s", (provider,))
            await cur.execute(
                """
                UPDATE provider_configs
                SET active = TRUE,
                    staged = FALSE,
                    approved_at = NOW(),
                    supersedes_id = %s
                WHERE id = %s
                """,
                (previous_id, config_id),
            )

    await _record_change(
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


async def fetch_active_provider_config(provider: str, *, include_secrets: bool = False) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, version, config_json, checksum, metadata, created_by, notes,
                       created_at, approved_at, supersedes_id, rollback_of,
                       secrets, secrets_checksum, rotated_at
                FROM provider_configs
                WHERE provider = %s AND active = TRUE
                """,
                (provider,),
            )
            row = await cur.fetchone()
    if not row:
        return None
    secrets_payload = row[11]
    secrets_checksum = row[12]
    rotated_at = row[13]
    secrets: dict[str, Any] | None = None
    if include_secrets and secrets_payload:
        try:
            decrypted = decrypt_text(secrets_payload)
            secrets = json.loads(decrypted)
        except SecretKeyMissing:
            raise
        except ValueError:  # pragma: no cover - indicates tampering
            secrets = None
    return {
        "id": row[0],
        "version": row[1],
        "config": row[2] or {},
        "checksum": row[3],
        "metadata": row[4] or {},
        "created_by": row[5],
        "notes": row[6],
        "created_at": row[7],
        "approved_at": row[8],
        "supersedes_id": row[9],
        "rollback_of": row[10],
        "secrets": secrets,
        "secrets_checksum": secrets_checksum,
        "rotated_at": rotated_at,
    }


async def stage_feature_flag(
    *,
    flag_id: str,
    flag_key: str,
    environment: str,
    version: str,
    enabled: bool,
    description: str | None,
    metadata: dict[str, Any] | None,
    created_by: str | None,
    notes: str | None,
    rollback_of: str | None,
) -> None:
    pool = await _pool()
    meta_payload = json.dumps(metadata or {}, ensure_ascii=False)
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO feature_flags (id, flag_key, environment, version, enabled, description, metadata, staged, active, created_by, notes, rollback_of)
                VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, TRUE, FALSE, %s, %s, %s)
                """,
                (flag_id, flag_key, environment, version, enabled, description, meta_payload, created_by, notes, rollback_of),
            )
    await _record_change(
        scope="feature_flag",
        record_id=flag_id,
        action="stage",
        diff={
            "flag_key": flag_key,
            "environment": environment,
            "version": version,
            "enabled": enabled,
            "metadata": metadata or {},
        },
        actor=created_by,
        notes=notes,
        rollback_of=rollback_of,
    )


async def activate_feature_flag(
    *,
    flag_id: str,
    actor: str | None,
    notes: str | None,
) -> None:
    pool = await _pool()
    flag_key: str | None = None
    environment: str | None = None
    enabled: bool | None = None
    previous_id: str | None = None

    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT flag_key, environment, enabled FROM feature_flags WHERE id = %s",
                (flag_id,),
            )
            row = await cur.fetchone()
            if not row:
                raise ValueError(f"Feature flag '{flag_id}' not found")
            flag_key, environment, enabled = row

            await cur.execute(
                "SELECT id FROM feature_flags WHERE flag_key = %s AND environment = %s AND active = TRUE",
                (flag_key, environment),
            )
            existing = await cur.fetchone()
            if existing:
                previous_id = existing[0]

            await cur.execute(
                "UPDATE feature_flags SET active = FALSE, archived_at = NOW() WHERE flag_key = %s AND environment = %s",
                (flag_key, environment),
            )
            await cur.execute(
                """
                UPDATE feature_flags
                SET active = TRUE,
                    staged = FALSE,
                    activated_at = NOW(),
                    supersedes_id = %s
                WHERE id = %s
                """,
                (previous_id, flag_id),
            )

    await _record_change(
        scope="feature_flag",
        record_id=flag_id,
        action="activate",
        diff={
            "flag_key": flag_key,
            "environment": environment,
            "enabled": enabled,
            "supersedes_id": previous_id,
        },
        actor=actor,
        notes=notes,
        rollback_of=None,
    )


async def fetch_feature_flag(flag_key: str, environment: str) -> dict[str, Any] | None:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, version, enabled, description, metadata, active, staged, created_by, notes,
                       created_at, activated_at, archived_at, rollback_of
                FROM feature_flags
                WHERE flag_key = %s AND environment = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (flag_key, environment),
            )
            row = await cur.fetchone()
    if not row:
        return None
    return {
        "id": row[0],
        "version": row[1],
        "enabled": row[2],
        "description": row[3],
        "metadata": row[4] or {},
        "active": row[5],
        "staged": row[6],
        "created_by": row[7],
        "notes": row[8],
        "created_at": row[9],
        "activated_at": row[10],
        "archived_at": row[11],
        "rollback_of": row[12],
    }


async def list_config_changes(scope: str, *, limit: int) -> list[dict[str, Any]]:
    pool = await _pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                SELECT id, record_id, action, diff, actor, notes, created_at, rollback_of
                FROM config_change_log
                WHERE scope = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (scope, limit),
            )
            rows = await cur.fetchall()
    return [
        {
            "id": row[0],
            "record_id": row[1],
            "action": row[2],
            "diff": row[3] or {},
            "actor": row[4],
            "notes": row[5],
            "created_at": row[6],
            "rollback_of": row[7],
        }
        for row in rows
    ]


async def health_check() -> bool:
    pool = await _pool()
    try:
        async with pool.connection(timeout=_CFG.pool_timeout_seconds) as conn:
            async with conn.cursor() as cur:
                await cur.execute("SELECT 1")
                await cur.fetchone()
    except Exception:  # pragma: no cover - surfaced via health endpoint
        return False
    return True


async def close_pool() -> None:
    global _POOL
    if _POOL is not None:
        await _POOL.close()
        _POOL = None


__all__ = [
    "ensure_schema",
    "record_run",
    "store_vector",
    "store_claim",
    "upsert_api_key",
    "fetch_api_key",
    "fetch_api_key_by_id",
    "list_api_keys",
    "create_tenant",
    "update_tenant",
    "archive_tenant",
    "restore_tenant",
    "fetch_tenant",
    "list_tenants",
    "list_known_tenants",
    "update_api_key_limits",
    "revoke_api_key",
    "restore_api_key",
    "revoke_api_keys_for_account",
    "revoke_api_keys_for_account",
    "touch_api_key",
    "record_audit_event",
    "list_audit_events",
    "purge_runs",
    "purge_audit",
    "fetch_expired_documents",
    "delete_documents",
    "list_documents",
    "update_document_bucket",
    "purge_documents_for_session",
    "list_recent_sessions",
    "fetch_session_tenant",
    "upsert_session_settings",
    "fetch_session_settings",
    "list_profiles",
    "fetch_profile",
    "upsert_profile",
    "fetch_provider_state",
    "update_provider_state",
    "stage_persona_prompt",
    "publish_persona_prompt",
    "fetch_active_persona_prompt",
    "fetch_persona_versions",
    "stage_provider_config",
    "publish_provider_config",
    "fetch_active_provider_config",
    "stage_feature_flag",
    "activate_feature_flag",
    "fetch_feature_flag",
    "list_config_changes",
    "list_tool_model_mappings_async",
    "get_tool_model_mapping_async",
    "upsert_tool_model_mapping_async",
    "fetch_environment_settings",
    "update_environment_settings",
    "create_admin_account",
    "fetch_admin_by_email",
    "fetch_admin_by_id",
    "update_admin_password",
    "update_admin_profile",
    "touch_admin_login",
    "admin_count",
    "health_check",
    "close_pool",
]
