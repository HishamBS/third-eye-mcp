"""FastAPI application exposing Overseer Eye endpoints."""
from __future__ import annotations

import asyncio
import html
import io
import json
import os
import time
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import webbrowser
import logging

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, Field
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..auth import hash_api_key, validate_api_key_async
from ..admin_accounts import (
    AuthenticationError,
    authenticate_admin_async,
    change_admin_password_async,
    ensure_bootstrap_admin_async,
    get_admin_account_async,
    issue_admin_api_key_async,
    sanitize_admin_record,
    update_admin_account_async,
    verify_password,
)
from ..cache import close_redis, get_redis, redis_health_check
from ..config import CONFIG
from ..constants import DataKey, EYE_TOOL_VERSIONS, EyeTag, ToolName, TOOL_BRANCH_MAP, TOOL_TO_EYE
from ..db import (
    check_db_health,
    get_recent_sessions,
    get_session_detail,
    get_session_settings,
    get_session_settings_async,
    get_session_detail_async,
    init_db,
    list_pipeline_events,
    list_pipeline_events_async,
    list_recent_sessions_async,
    record_audit_event_async,
    record_run_async,
    shutdown_db,
    admin_account_count_async,
    upsert_session_settings_async,
)
from ..core.settings import (
    DEFAULT_PROFILE_NAME,
    build_session_settings,
    effective_settings as resolve_effective_settings,
    snapshot_for_session,
)
from ..groq_client import shutdown_groq_client
from ..logging_utils import setup_logging
from ..model_guard import ensure_models_available
from ..observability import record_budget_usage, record_request_metric, reset_metrics_counters
from ..provider_metrics import reset as reset_provider_metrics
from ..pipeline_bus import (
    PIPELINE_BUS,
    emit_custom_event,
    emit_eye_event,
    emit_settings_event,
    send_initial_snapshot,
)
from ..core.embeddings import ingest_markdown, fetch_similar_chunks

LOG = logging.getLogger(__name__)
from .admin import router as admin_router
from ..schemas.admin import (
    APIKeyCreateRequest,
    APIKeyEntry,
    APIKeyListResponse,
    APIKeyRotateResponse,
    APIKeyUpdateRequest,
    AdminAccountResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    AdminPasswordChangeRequest,
    AdminProfileUpdateRequest,
    AuditExportResponse,
)
from ..eyes import (
    navigate_async,
    clarify_async,
    confirm_intent_async,
    consistency_check_async,
    final_approval_async,
    plan_requirements_async,
    plan_review_async,
    review_docs_async,
    review_impl_async,
    review_scaffold_async,
    review_tests_async,
    rewrite_prompt_async,
    validate_claims_async,
)

setup_logging(CONFIG.logging.level, json_output=CONFIG.logging.json)

_PUBLIC_PATHS = {
    "/health/live",
    "/health/ready",
    "/metrics",
    "/admin/auth/login",
    "/admin/bootstrap/status",
}

_INITIAL_TOOL = ToolName.OVERSEER_NAVIGATOR.value
_POST_JOGAN_TOOLS = {
    ToolName.RINNEGAN_PLAN_REQUIREMENTS.value,
    ToolName.RINNEGAN_PLAN_REVIEW.value,
    ToolName.RINNEGAN_FINAL_APPROVAL.value,
    ToolName.MANGEKYO_REVIEW_SCAFFOLD.value,
    ToolName.MANGEKYO_REVIEW_IMPL.value,
    ToolName.MANGEKYO_REVIEW_TESTS.value,
    ToolName.MANGEKYO_REVIEW_DOCS.value,
    ToolName.TENSEIGAN_VALIDATE_CLAIMS.value,
    ToolName.BYAKUGAN_CONSISTENCY_CHECK.value,
}


async def _pipeline_get(session_id: str | None) -> list[str]:
    if not session_id:
        return []
    settings = await get_session_settings_async(session_id)
    pipeline = settings.get("pipeline") if isinstance(settings, dict) else None
    next_tools = pipeline.get("next_tools") if isinstance(pipeline, dict) else None
    if isinstance(next_tools, list):
        return [tool for tool in next_tools if isinstance(tool, str)]
    return []


async def _pipeline_set(session_id: str | None, next_tools: list[str]) -> None:
    if not session_id:
        return
    settings = await get_session_settings_async(session_id) or {}
    pipeline = dict((settings.get("pipeline") or {}))
    pipeline["next_tools"] = next_tools
    settings["pipeline"] = pipeline
    await upsert_session_settings_async(session_id=session_id, data=settings)


def _pipeline_next_for(tool: str) -> list[str]:
    if tool == ToolName.OVERSEER_NAVIGATOR.value:
        return [ToolName.SHARINGAN_CLARIFY.value]
    if tool == ToolName.SHARINGAN_CLARIFY.value:
        return [ToolName.HELPER_REWRITE_PROMPT.value]
    if tool == ToolName.HELPER_REWRITE_PROMPT.value:
        return [ToolName.JOGAN_CONFIRM_INTENT.value]
    if tool == ToolName.JOGAN_CONFIRM_INTENT.value:
        return sorted(_POST_JOGAN_TOOLS)
    if tool in _POST_JOGAN_TOOLS:
        return sorted(_POST_JOGAN_TOOLS)
    return []


async def _pipeline_enforce(session_id: str | None, tool: str) -> None:
    if not session_id:
        return
    allowed = await _pipeline_get(session_id)
    if not allowed:
        allowed = [_INITIAL_TOOL]
    if tool not in allowed:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Call the required MCP tool before continuing.",
                "expected_next": allowed,
            },
        )


async def _pipeline_advance(session_id: str | None, tool: str) -> None:
    if not session_id:
        return
    await _pipeline_set(session_id, _pipeline_next_for(tool))


async def _pipeline_reset(session_id: str | None) -> None:
    if not session_id:
        return
    await _pipeline_set(session_id, [])


def _extract_session_id(payload: Dict[str, Any], result: Dict[str, Any] | None) -> str | None:
    session_id = _session_id_from_payload(payload)
    if session_id:
        return session_id
    if result and isinstance(result, dict):
        data = result.get("data")
        if isinstance(data, dict):
            context = data.get("session_context")
            if isinstance(context, dict):
                extracted = context.get("session_id")
                if isinstance(extracted, str) and extracted.strip():
                    return extracted
    return None

class ClarificationsPayload(BaseModel):
    answers_md: str = Field(..., min_length=1)
    context: Dict[str, Any] = Field(default_factory=dict)


class SessionSettingsOverrides(BaseModel):
    ambiguity_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    citation_cutoff: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    consistency_tolerance: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    require_rollback: Optional[bool] = None
    mangekyo: Optional[str] = Field(default=None, min_length=3, max_length=32)


class SessionSettingsUpdatePayload(SessionSettingsOverrides):
    profile: Optional[str] = Field(default=None, min_length=2, max_length=64)


class SessionCreatePayload(BaseModel):
    profile: Optional[str] = Field(default=None, min_length=2, max_length=64)
    settings: Optional[SessionSettingsOverrides] = None


class SessionSettingsResponse(BaseModel):
    session_id: str
    profile: str
    settings: Dict[str, Any]
    provider: Dict[str, Any]


class SessionCreateResponse(SessionSettingsResponse):
    portal_url: str


class RevalidatePayload(BaseModel):
    context: Dict[str, Any]
    draft_md: str
    topic: str = Field(..., min_length=1)


class DuelPayload(BaseModel):
    agents: List[str] = Field(..., min_length=2, max_length=4)
    context: Dict[str, Any] = Field(default_factory=dict)
    topic: Optional[str] = Field(default=None, max_length=200)


class ResubmitPayload(BaseModel):
    eye: str = Field(..., min_length=3, max_length=64)
    context: Dict[str, Any] = Field(default_factory=dict)
    notes: Optional[str] = Field(default=None, max_length=2000)


def _html_escape(value: Optional[str]) -> str:
    if value is None:
        return ""
    return html.escape(value)


def _generate_html_export(session_id: str, events: List[Dict[str, Any]]) -> str:
    rows = []
    for event in events:
        md = _html_escape(event.get("md"))
        data_json = html.escape(json.dumps(event.get("data", {}), ensure_ascii=False, indent=2))
        rows.append(
            f"<tr><td>{_html_escape(event.get('ts'))}</td><td>{_html_escape(event.get('eye'))}</td><td>{_html_escape(event.get('code')) or ''}</td><td><pre>{md}</pre></td><td><pre>{data_json}</pre></td></tr>"
        )
    rows_html = "\n".join(rows)
    return (
        "<!DOCTYPE html>\n"
        "<html lang='en'>\n"
        "<head><meta charset='utf-8'/><title>Third Eye Session Export"
        f" — {session_id}</title><style>body{{font-family:Inter,Arial,sans-serif;background:#0B0B0D;color:#F8FAFC;padding:24px;}}table{{width:100%;border-collapse:collapse;margin-top:16px;}}td,th{{border:1px solid rgba(255,255,255,0.08);padding:8px;vertical-align:top;}}th{{background:#15161A;text-transform:uppercase;font-size:12px;letter-spacing:0.12em;color:#F7B500;}}pre{{white-space:pre-wrap;font-family:'Geist Mono',monospace;font-size:12px;color:#cbd5f5;background:#15161A;padding:8px;border-radius:6px;}}</style></head>\n"
        f"<body><h1>Third Eye Session Export — {session_id}</h1><p>Total events: {len(events)}</p><table>"
        "<thead><tr><th>Timestamp</th><th>Eye</th><th>Code</th><th>Markdown</th><th>Data</th></tr></thead><tbody>"
        f"{rows_html}</tbody></table></body></html>"
    )


def _generate_pdf_export(session_id: str, events: List[Dict[str, Any]]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, title=f"Third Eye Session {session_id}")
    styles = getSampleStyleSheet()
    story: List[Any] = []
    story.append(Paragraph(f"Third Eye Session Export — {session_id}", styles["Title"]))
    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(f"Event count: {len(events)}", styles["Normal"]))
    story.append(Spacer(1, 0.2 * inch))

    table_data = [["Timestamp", "Eye", "Code", "Summary"]]
    for event in events:
        ts = event.get("ts") or ""
        eye = event.get("eye") or ""
        code = event.get("code") or ""
        md_text = event.get("md") or ""
        if len(md_text) > 280:
            md_text = md_text[:277] + "…"
        table_data.append([ts, eye, code, md_text])

    table = Table(table_data, repeatRows=1, colWidths=[1.7 * inch, 1.1 * inch, 1.1 * inch, 2.9 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.082, 0.086, 0.102)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.Color(0.969, 0.71, 0.0)),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.lightgrey]),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.darkgray),
            ]
        )
    )
    story.append(table)

    doc.build(story)
    return buffer.getvalue()


def _session_id_from_payload(raw: Dict[str, Any]) -> Optional[str]:
    context = raw.get("context")
    if isinstance(context, dict):
        value = context.get("session_id")
        if isinstance(value, str):
            return value
    return None


def _resolve_tool_version(eye_tag: Optional[EyeTag], result: Dict[str, Any]) -> Optional[str]:
    data = result.get("data")
    if isinstance(data, dict):
        tool_version = data.get(DataKey.TOOL_VERSION.value)
        if isinstance(tool_version, str):
            return tool_version
    if eye_tag:
        return EYE_TOOL_VERSIONS.get(eye_tag)
    return None


def _build_leaderboard_summary(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    agents: Dict[str, Dict[str, Any]] = {}
    eyes: Dict[str, Dict[str, Any]] = {}
    for event in events:
        data = event.get("data") or {}
        agent = data.get("agent") or data.get("agent_name") or "primary"
        eye = event.get("eye") or "unknown"
        if agent not in agents:
            agents[agent] = {"agent": agent, "approvals": 0, "rejections": 0}
        if event.get("ok") is True:
            agents[agent]["approvals"] += 1
        elif event.get("ok") is False:
            agents[agent]["rejections"] += 1
        if eye not in eyes:
            eyes[eye] = {"eye": eye, "approvals": 0, "rejections": 0}
        if event.get("ok") is True:
            eyes[eye]["approvals"] += 1
        elif event.get("ok") is False:
            eyes[eye]["rejections"] += 1

    def _compute(items: Dict[str, Dict[str, Any]]) -> List[Dict[str, Any]]:
        summary: List[Dict[str, Any]] = []
        for value in items.values():
            total = value["approvals"] + value["rejections"]
            win_rate = 0
            if total:
                win_rate = round((value["approvals"] / total) * 100)
            summary.append({**value, "total": total, "win_rate": win_rate})
        summary.sort(key=lambda item: (-item["win_rate"], -item["approvals"]))
        return summary

    return {
        "agents": _compute(agents),
        "eyes": _compute(eyes),
    }


async def _emit_eye_update(
    *,
    session_id: Optional[str],
    tool_name: str,
    result: Dict[str, Any],
) -> None:
    eye_tag = TOOL_TO_EYE.get(tool_name)
    tool_version = _resolve_tool_version(eye_tag, result)
    md = result.get("md") if isinstance(result.get("md"), str) else None
    data = result.get("data") if isinstance(result.get("data"), dict) else {}
    await emit_eye_event(
        session_id=session_id,
        eye=eye_tag.name if eye_tag else tool_name,
        ok=result.get("ok"),
        code=result.get("code"),
        tool_version=tool_version,
        md=md,
        data=data,
    )


def _isoformat(ts: Optional[float]) -> Optional[str]:
    if ts is None:
        return None
    if isinstance(ts, Decimal):
        ts = float(ts)
    elif isinstance(ts, str):
        ts = float(ts)
    try:
        return datetime.fromtimestamp(float(ts)).isoformat()
    except (TypeError, ValueError):
        return str(ts)


def _serialize_timestamp(value: float | None) -> Optional[str]:
    return _isoformat(value)

_RATE_MEMORY: dict[str, tuple[int, float]] = {}
_BUDGET_MEMORY: dict[str, tuple[int, float]] = {}


async def _log_request(
    *,
    request: Request,
    record: Dict[str, Any] | None,
    status: int,
    detail: str | None = None,
    hashed_key: str | None = None,
) -> None:
    session_id = getattr(request.state, "session_id", None)
    metadata: Dict[str, Any] = {
        "method": request.method,
        "path": request.url.path,
        "status": status,
    }
    tool = getattr(request.state, "tool", None)
    branch = getattr(request.state, "branch", None)
    tenant = getattr(request.state, "tenant", None)
    tokens = getattr(request.state, "tokens", None)
    if tool:
        metadata["tool"] = tool
    if branch:
        metadata["branch"] = branch
    if tenant:
        metadata["tenant"] = tenant
    if tokens is not None:
        metadata["budget_tokens"] = tokens
    if detail:
        metadata["detail"] = detail
    if hashed_key:
        metadata["hashed_key"] = hashed_key
    else:
        metadata["hashed_key"] = None
    if session_id:
        metadata["session_id"] = session_id
    role = getattr(request.state, "role", None)
    if role:
        metadata["role"] = role
    ip = request.client.host if request.client else None
    actor = (record or {}).get("id") if record else "anonymous"
    target = tool or request.url.path
    try:
        await record_audit_event_async(
            actor=actor,
            action="api_request",
            target=target,
            metadata=metadata,
            ip=ip,
            session_id=session_id,
            tenant_id=tenant,
        )
    except Exception:
        pass


async def _enforce_rate_limit(*, key_id: str, rate_cfg: Dict[str, Any]) -> None:
    per_minute = int(rate_cfg.get("per_minute")) if rate_cfg.get("per_minute") else None
    if not per_minute or per_minute <= 0:
        return
    burst = int(rate_cfg.get("burst", per_minute))
    window_seconds = int(rate_cfg.get("window_seconds", 60))
    redis_client = None
    try:
        redis_client = await get_redis()
    except Exception:
        redis_client = None
    key = f"rate:{key_id}:{window_seconds}"
    now = time.time()
    if redis_client is not None:
        try:
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, window_seconds)
            if count > burst:
                raise HTTPException(status_code=429, detail="Rate limit exceeded")
            return
        except Exception:
            redis_client = None
    count, expiry = _RATE_MEMORY.get(key, (0, now + window_seconds))
    if now > expiry:
        count, expiry = 0, now + window_seconds
    count += 1
    _RATE_MEMORY[key] = (count, expiry)
    if count > burst:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


async def _enforce_budget(*, key_id: str, limit_cfg: Dict[str, Any], tokens: int) -> None:
    if tokens <= 0:
        return
    per_request = limit_cfg.get("max_per_request")
    if per_request is not None and tokens > int(per_request):
        raise HTTPException(status_code=403, detail="Request exceeds per-request token budget")
    daily = limit_cfg.get("daily")
    if daily is None:
        return
    daily = int(daily)
    if daily <= 0:
        return
    redis_client = None
    try:
        redis_client = await get_redis()
    except Exception:
        redis_client = None
    day_key = time.strftime("%Y%m%d")
    redis_key = f"budget:{key_id}:{day_key}"
    now = time.time()
    if redis_client is not None:
        try:
            total = await redis_client.incrby(redis_key, tokens)
            if total == tokens:
                await redis_client.expire(redis_key, 86400)
            if total > daily:
                raise HTTPException(status_code=403, detail="Daily token budget exceeded")
            return
        except Exception:
            redis_client = None
    total, expiry = _BUDGET_MEMORY.get(redis_key, (0, now + 86400))
    if now > expiry:
        total, expiry = 0, now + 86400
    total += tokens
    _BUDGET_MEMORY[redis_key] = (total, expiry)
    if total > daily:
        raise HTTPException(status_code=403, detail="Daily token budget exceeded")


async def enforce_request_policies(request: Request, payload: Dict[str, Any]) -> None:
    record = getattr(request.state, "api_key", None)
    if record is None:
        raise HTTPException(status_code=500, detail="API key state missing")
    limits = record.get("limits") or {}
    role = (record.get("role") or "consumer").lower()
    request.state.role = role
    is_admin = role == "admin"
    context = payload.get("context", {})
    session_id = context.get("session_id")
    request_tenant = context.get("tenant")
    key_tenant = record.get("tenant")
    allowed_tenants = limits.get("tenants")
    request.state.session_id = session_id
    request.state.tenant = request_tenant or key_tenant
    if not is_admin and key_tenant and request_tenant != key_tenant:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    if not is_admin and allowed_tenants:
        if not request_tenant or request_tenant not in allowed_tenants:
            raise HTTPException(status_code=403, detail="Tenant not permitted")
    path = request.url.path
    tool = path[len("/eyes/"):] if path.startswith("/eyes/") else path.strip("/")
    branch = TOOL_BRANCH_MAP.get(tool, "shared")
    tokens = int(context.get("budget_tokens") or 0)
    allowed_tools = limits.get("tools")
    if allowed_tools and tool not in allowed_tools:
        raise HTTPException(status_code=403, detail="Tool not permitted")
    allowed_branches = limits.get("branches")
    if allowed_branches and branch not in allowed_branches:
        raise HTTPException(status_code=403, detail="Branch not permitted")
    request.state.tool = tool
    request.state.branch = branch
    request.state.tokens = tokens
    rate_cfg = limits.get("rate") if isinstance(limits.get("rate"), dict) else None
    if rate_cfg is None:
        rate_cfg = {
            "per_minute": CONFIG.rate_limits.per_minute,
            "burst": CONFIG.rate_limits.burst,
            "window_seconds": CONFIG.rate_limits.window_seconds,
        }
    await _enforce_rate_limit(key_id=record["id"], rate_cfg=rate_cfg)
    budget_cfg = limits.get("budget") if isinstance(limits.get("budget"), dict) else None
    if budget_cfg is None:
        budget_cfg = {
            "max_per_request": CONFIG.budgets.max_per_request,
            "daily": CONFIG.budgets.daily,
        }
    await _enforce_budget(key_id=record["id"], limit_cfg=budget_cfg, tokens=tokens)
    max_request_budget = limits.get("max_budget_tokens", CONFIG.budgets.max_per_request)
    if max_request_budget is not None and tokens > int(max_request_budget):
        raise HTTPException(status_code=403, detail="Request exceeds configured budget")
    if tokens > 0:
        record_budget_usage(key_id=record["id"], tokens=tokens)


async def _attach_session_settings(payload: Dict[str, Any]) -> None:
    session_id = _session_id_from_payload(payload)
    if not session_id:
        return
    context = payload.get("context")
    if not isinstance(context, dict):
        return
    try:
        settings = await resolve_effective_settings(session_id)
    except Exception:  # pragma: no cover - defensive fallback
        return
    enriched = dict(context)
    enriched["settings"] = settings
    payload["context"] = enriched


app = FastAPI(title="Third Eye MCP", version="2.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup() -> None:
    await ensure_models_available()
    await init_db()
    await ensure_bootstrap_admin_async(require_secret=False)
    reset_metrics_counters()
    reset_provider_metrics()


@app.on_event("shutdown")
async def shutdown() -> None:
    await shutdown_groq_client()
    await shutdown_db()
    await close_redis()


@app.middleware("http")
async def enforce_api_key(request: Request, call_next):
    start_time = time.perf_counter()
    if request.method == "OPTIONS" or request.url.path in _PUBLIC_PATHS:
        response = await call_next(request)
        elapsed = time.perf_counter() - start_time
        record_request_metric(
            tool=request.url.path.strip("/") or "root",
            branch="shared",
            status=response.status_code,
            latency=elapsed,
        )
        return response
    raw_key = request.headers.get("X-API-Key")
    hashed_key = hash_api_key(raw_key) if raw_key else None
    try:
        record = await validate_api_key_async(raw_key)
    except HTTPException as exc:
        await _log_request(
            request=request,
            record=None,
            status=exc.status_code,
            detail=exc.detail,
            hashed_key=hashed_key,
        )
        record_request_metric(
            tool=request.url.path.strip("/") or "root",
            branch="shared",
            status=exc.status_code,
            latency=time.perf_counter() - start_time,
        )
        return JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
    request.state.api_key = record
    request.state.role = (record.get("role") or "consumer").lower()
    request.state.tenant = record.get("tenant")
    request.state.account_id = record.get("account_id")
    try:
        response = await call_next(request)
    except HTTPException as exc:
        await _log_request(
            request=request,
            record=record,
            status=exc.status_code,
            detail=exc.detail,
        )
        record_request_metric(
            tool=getattr(request.state, "tool", request.url.path.strip("/")),
            branch=getattr(request.state, "branch", "shared"),
            status=exc.status_code,
            latency=time.perf_counter() - start_time,
        )
        raise
    except Exception as exc:
        await _log_request(
            request=request,
            record=record,
            status=500,
            detail=str(exc),
        )
        record_request_metric(
            tool=getattr(request.state, "tool", request.url.path.strip("/")),
            branch=getattr(request.state, "branch", "shared"),
            status=500,
            latency=time.perf_counter() - start_time,
        )
        raise
    else:
        await _log_request(
            request=request,
            record=record,
            status=response.status_code,
        )
        record_request_metric(
            tool=getattr(request.state, "tool", request.url.path.strip("/")),
            branch=getattr(request.state, "branch", "shared"),
            status=response.status_code,
            latency=time.perf_counter() - start_time,
        )
        return response


@app.get("/metrics", tags=["observability"], include_in_schema=False)
async def metrics_endpoint() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


def _should_auto_open_portal() -> bool:
    launch = os.getenv("LAUNCH_PORTAL_ON_CONNECT", "false").lower() in {"1", "true", "yes"}
    shell_allowed = os.getenv("ALLOW_SHELL_OPEN", "false").lower() in {"1", "true", "yes"}
    return launch and shell_allowed


@app.post("/session", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
async def api_create_session(payload: SessionCreatePayload, request: Request) -> SessionCreateResponse:
    session_id = str(uuid.uuid4())
    overrides_payload = payload.settings.model_dump(exclude_none=True) if payload.settings else {}
    record = await build_session_settings(profile=payload.profile or DEFAULT_PROFILE_NAME, overrides=overrides_payload)
    existing = {"session_id": session_id}
    existing.update(record)
    await emit_settings_event(session_id=session_id, settings=existing)
    await _pipeline_reset(session_id)

    portal_base = os.getenv("PORTAL_BASE_URL", "http://localhost:5173").rstrip("/")
    portal_url = f"{portal_base}/session/{session_id}"

    LOG.info("Session created", extra={"session_id": session_id, "portal_url": portal_url})

    if _should_auto_open_portal():  # pragma: no cover - environment-dependent behaviour
        try:
            webbrowser.open_new_tab(portal_url)
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Failed to auto-open portal for %s: %s", session_id, exc)

    await record_audit_event_async(
        actor=(getattr(request.state, "api_key", {}) or {}).get("id"),
        action="session.create",
        target=session_id,
        metadata={"profile": existing.get("profile"), "settings": overrides_payload},
        ip=request.client.host if request.client else None,
        session_id=session_id,
        tenant_id=getattr(request.state, "tenant", None),
    )

    return SessionCreateResponse(
        session_id=session_id,
        profile=existing["profile"],
        settings=existing["effective"],
        provider=existing.get("provider", {}),
        portal_url=portal_url,
    )


@app.get("/sessions", tags=["sessions"])
async def api_list_sessions(request: Request, limit: int = Query(20, ge=1, le=200)) -> Dict[str, Any]:
    role = getattr(request.state, "role", "")
    tenant = getattr(request.state, "tenant", None)
    is_admin = role == "admin"
    try:
        sessions = await list_recent_sessions_async(limit=limit)
    except RuntimeError:
        sessions = get_recent_sessions(limit=limit)
    items: List[Dict[str, Any]] = []
    for session in sessions:
        session_tenant = session.get("tenant")
        if not is_admin:
            if session_tenant and tenant and session_tenant != tenant:
                continue
            if session_tenant and not tenant:
                continue
        items.append(session)
    return {"items": items}


@app.get("/sessions/{session_id}", tags=["sessions"])
async def api_get_session(session_id: str, request: Request) -> Dict[str, Any]:
    try:
        detail = await get_session_detail_async(session_id)
    except RuntimeError:
        detail = get_session_detail(session_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Session not found")
    role = getattr(request.state, "role", "")
    tenant = getattr(request.state, "tenant", None)
    is_admin = role == "admin"
    session_tenant = detail.get("tenant")
    if not is_admin:
        if session_tenant and tenant and session_tenant != tenant:
            raise HTTPException(status_code=404, detail="Session not found")
        if session_tenant and not tenant:
            raise HTTPException(status_code=404, detail="Session not found")
    return detail


@app.get("/health/live", tags=["health"])
async def health_live() -> Dict[str, str]:
    return {"status": "alive"}


@app.get("/health/ready", tags=["health"])
async def health_ready() -> JSONResponse:
    db_ok = await check_db_health()
    redis_ok = await redis_health_check()
    ready = db_ok and redis_ok
    status_code = 200 if ready else 503
    payload = {"status": "ready" if ready else "degraded", "database": db_ok, "redis": redis_ok}
    return JSONResponse(payload, status_code=status_code)


@app.post("/eyes/overseer/navigator")
async def api_navigator(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.OVERSEER_NAVIGATOR.value)
    await _attach_session_settings(payload)
    result = await navigate_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_reset(session_id)
    await _pipeline_advance(session_id, ToolName.OVERSEER_NAVIGATOR.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.OVERSEER_NAVIGATOR.value,
        result=result,
    )
    return result


@app.post("/eyes/sharingan/clarify")
async def api_sharingan(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.SHARINGAN_CLARIFY.value)
    await _attach_session_settings(payload)
    result = await clarify_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.SHARINGAN_CLARIFY.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.SHARINGAN_CLARIFY.value,
        result=result,
    )
    return result


@app.post("/eyes/helper/rewrite_prompt")
async def api_helper(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.PROMPT_HELPER_REWRITE.value)
    await _attach_session_settings(payload)
    result = await rewrite_prompt_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.PROMPT_HELPER_REWRITE.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.PROMPT_HELPER_REWRITE.value,
        result=result,
    )
    return result


@app.post("/eyes/jogan/confirm_intent")
async def api_jogan(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.JOGAN_CONFIRM_INTENT.value)
    await _attach_session_settings(payload)
    result = await confirm_intent_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.JOGAN_CONFIRM_INTENT.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.JOGAN_CONFIRM_INTENT.value,
        result=result,
    )
    return result


@app.post("/eyes/rinnegan/plan_requirements")
async def api_plan_requirements(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.RINNEGAN_PLAN_REQUIREMENTS.value)
    await _attach_session_settings(payload)
    result = await plan_requirements_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.RINNEGAN_PLAN_REQUIREMENTS.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.RINNEGAN_PLAN_REQUIREMENTS.value,
        result=result,
    )
    return result


@app.post("/eyes/rinnegan/plan_review")
async def api_plan_review(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.RINNEGAN_PLAN_REVIEW.value)
    try:
        plan_md = payload.get("payload", {}).get("submitted_plan_md")
        if session_id and isinstance(plan_md, str) and plan_md.strip():
            await ingest_markdown(session_id=session_id, topic="plan", markdown=plan_md)
    except Exception as exc:  # pragma: no cover - ingestion failures should not block
        LOG.warning("Failed to ingest plan embeddings: %s", exc)
    await _attach_session_settings(payload)
    result = await plan_review_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.RINNEGAN_PLAN_REVIEW.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.RINNEGAN_PLAN_REVIEW.value,
        result=result,
    )
    return result


@app.post("/eyes/mangekyo/review_scaffold")
async def api_review_scaffold(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.MANGEKYO_REVIEW_SCAFFOLD.value)
    await _attach_session_settings(payload)
    result = await review_scaffold_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.MANGEKYO_REVIEW_SCAFFOLD.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.MANGEKYO_REVIEW_SCAFFOLD.value,
        result=result,
    )
    return result


@app.post("/eyes/mangekyo/review_impl")
async def api_review_impl(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.MANGEKYO_REVIEW_IMPL.value)
    await _attach_session_settings(payload)
    result = await review_impl_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.MANGEKYO_REVIEW_IMPL.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.MANGEKYO_REVIEW_IMPL.value,
        result=result,
    )
    return result


@app.post("/eyes/mangekyo/review_tests")
async def api_review_tests(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.MANGEKYO_REVIEW_TESTS.value)
    await _attach_session_settings(payload)
    result = await review_tests_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.MANGEKYO_REVIEW_TESTS.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.MANGEKYO_REVIEW_TESTS.value,
        result=result,
    )
    return result


@app.post("/eyes/mangekyo/review_docs")
async def api_review_docs(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.MANGEKYO_REVIEW_DOCS.value)
    await _attach_session_settings(payload)
    result = await review_docs_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.MANGEKYO_REVIEW_DOCS.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.MANGEKYO_REVIEW_DOCS.value,
        result=result,
    )
    return result


@app.post("/eyes/tenseigan/validate_claims")
async def api_validate_claims(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.TENSEIGAN_VALIDATE_CLAIMS.value)
    try:
        draft_md = payload.get("payload", {}).get("draft_md")
        topic = payload.get("payload", {}).get("topic") if isinstance(payload.get("payload"), dict) else None
        if session_id and isinstance(draft_md, str) and draft_md.strip():
            await ingest_markdown(session_id=session_id, topic=str(topic or "draft"), markdown=draft_md)
    except Exception as exc:  # pragma: no cover - ingestion failures should not block
        LOG.warning("Failed to ingest draft embeddings: %s", exc)
    await _attach_session_settings(payload)
    result = await validate_claims_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.TENSEIGAN_VALIDATE_CLAIMS.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.TENSEIGAN_VALIDATE_CLAIMS.value,
        result=result,
    )
    return result


@app.post("/eyes/byakugan/consistency_check")
async def api_consistency(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.BYAKUGAN_CONSISTENCY_CHECK.value)
    try:
        draft_md = payload.get("payload", {}).get("draft_md")
        topic = payload.get("payload", {}).get("topic") if isinstance(payload.get("payload"), dict) else None
        if session_id and isinstance(draft_md, str) and draft_md.strip():
            references = await fetch_similar_chunks(
                session_id=session_id,
                markdown=draft_md,
                topic=topic,
            )
            if references:
                payload.setdefault("payload", {})
                if isinstance(payload["payload"], dict):
                    payload["payload"]["memory_references"] = references
    except Exception as exc:  # pragma: no cover - ingestion failures should not block
        LOG.warning("Failed to fetch memory references: %s", exc)
    await _attach_session_settings(payload)
    result = await consistency_check_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.BYAKUGAN_CONSISTENCY_CHECK.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.BYAKUGAN_CONSISTENCY_CHECK.value,
        result=result,
    )
    return result


@app.post("/eyes/rinnegan/final_approval")
async def api_final(payload: Dict[str, Any], request: Request):
    await enforce_request_policies(request, payload)
    session_id = _session_id_from_payload(payload)
    await _pipeline_enforce(session_id, ToolName.RINNEGAN_FINAL_APPROVAL.value)
    await _attach_session_settings(payload)
    result = await final_approval_async(payload)
    session_id = _extract_session_id(payload, result)
    await _pipeline_advance(session_id, ToolName.RINNEGAN_FINAL_APPROVAL.value)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.RINNEGAN_FINAL_APPROVAL.value,
        result=result,
    )
    return result


@app.get("/session/{session_id}/events")
async def api_list_events(
    session_id: str,
    request: Request,
    limit: int = 100,
    from_ts: float | None = None,
    to_ts: float | None = None,
):
    _ = request.state.api_key  # ensure middleware set; raises if missing
    limit = max(1, min(limit, 500))
    events = await list_pipeline_events_async(
        session_id=session_id,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
    )
    items = [
        {
            "type": event.get("event_type", "eye_update"),
            "session_id": session_id,
            "eye": event.get("eye"),
            "ok": event.get("ok"),
            "code": event.get("code"),
            "tool_version": event.get("tool_version"),
            "md": event.get("md"),
            "data": event.get("data", {}),
            "ts": _isoformat(event.get("created_at")),
        }
        for event in events
    ]
    return {"items": items, "count": len(items)}


@app.post("/session/{session_id}/clarifications", status_code=202)
async def api_submit_clarifications(session_id: str, payload: ClarificationsPayload, request: Request):
    await enforce_request_policies(request, {"context": payload.context})
    await emit_custom_event(
        session_id=session_id,
        event_type="user_input",
        eye=EyeTag.SHARINGAN.name,
        data={"answers_md": payload.answers_md},
    )
    return {"status": "accepted"}


@app.post("/session/{session_id}/resubmit", status_code=202)
async def api_request_resubmit(session_id: str, payload: ResubmitPayload, request: Request):
    await enforce_request_policies(request, {"context": payload.context})
    eye = payload.eye.upper()
    md = f"### Resubmission Requested\nHost agent must address issues and resubmit `{eye}` payload."
    await emit_custom_event(
        session_id=session_id,
        event_type="resubmit_requested",
        eye=eye,
        data={"notes": payload.notes, "context": payload.context},
        md=md,
    )
    return {"status": "accepted"}


@app.post("/session/{session_id}/duel")
async def api_session_duel(session_id: str, payload: DuelPayload, request: Request):
    await enforce_request_policies(request, {"context": payload.context})
    role = (getattr(request.state, "role", "") or "").lower()
    if role not in {"admin", "operator"}:
        raise HTTPException(status_code=403, detail="Duel mode restricted to operators")

    unique_agents: List[str] = []
    for agent in payload.agents:
        trimmed = agent.strip()
        if not trimmed:
            continue
        if trimmed not in unique_agents:
            unique_agents.append(trimmed)

    if len(unique_agents) < 2:
        raise HTTPException(status_code=400, detail="Provide at least two distinct agents")

    run_refs: List[Dict[str, Any]] = []
    for agent in unique_agents:
        run_id = str(uuid.uuid4())
        run_refs.append({"agent": agent, "run_id": run_id})
        await record_run_async(
            run_id=run_id,
            tool="duel",
            topic=payload.topic,
            input_payload={
                "session_id": session_id,
                "agent": agent,
                "context": payload.context,
            },
            output_payload={"status": "scheduled"},
            session_id=session_id,
            eye=EyeTag.OVERSEER.name,
            code="DUEL_SCHEDULED",
            ok=None,
        )

    md_lines = ["### Duel Requested", "", "Agents:"]
    for ref in run_refs:
        md_lines.append(f"- `{ref['agent']}` → run `{ref['run_id']}`")
    if payload.topic:
        md_lines.extend(["", f"Topic: `{payload.topic}`"])
    md = "\n".join(md_lines)

    await emit_custom_event(
        session_id=session_id,
        event_type="duel_requested",
        eye=EyeTag.OVERSEER.name,
        data={"agents": unique_agents, "runs": run_refs, "topic": payload.topic},
        md=md,
    )
    await record_audit_event_async(
        actor=(getattr(request.state, "api_key", {}) or {}).get("id"),
        action="session.duel",
        target=session_id,
        metadata={"agents": unique_agents, "topic": payload.topic},
        ip=request.client.host if request.client else None,
        session_id=session_id,
        tenant_id=getattr(request.state, "tenant", None),
    )

    return {"status": "scheduled", "session_id": session_id, "runs": run_refs}


@app.get("/session/{session_id}/leaderboard")
async def api_session_leaderboard(session_id: str, request: Request, limit: int = 500) -> Dict[str, Any]:
    _ = request.state.api_key
    limit = max(50, min(limit, 1000))
    try:
        events = await list_pipeline_events_async(session_id=session_id, limit=limit)
    except RuntimeError:
        events = list_pipeline_events(session_id=session_id, limit=limit)
    return _build_leaderboard_summary(events)


@app.post("/session/{session_id}/export")
async def api_export_session(
    session_id: str,
    request: Request,
    fmt: str = Query("pdf", pattern=r"^(pdf|html)$"),
) -> Response:
    role = (getattr(request.state, "role", "") or "").lower()
    if role != "admin":
        raise HTTPException(status_code=403, detail="Exports restricted to admins")

    try:
        events = await list_pipeline_events_async(session_id=session_id, limit=1000)
    except RuntimeError:
        events = list_pipeline_events(session_id=session_id, limit=1000)
    if not events:
        raise HTTPException(status_code=404, detail="No pipeline events for session")

    transformed: List[Dict[str, Any]] = []
    for event in events:
        transformed.append(
            {
                "ts": _isoformat(event.get("created_at")),
                "eye": event.get("eye"),
                "code": event.get("code"),
                "md": event.get("md"),
                "data": event.get("data", {}),
            }
        )

    if fmt == "html":
        content = _generate_html_export(session_id, transformed)
        media_type = "text/html; charset=utf-8"
        filename = f"session-{session_id}.html"
        body = content.encode("utf-8")
    else:
        body = _generate_pdf_export(session_id, transformed)
        media_type = "application/pdf"
        filename = f"session-{session_id}.pdf"

    await record_audit_event_async(
        actor=(getattr(request.state, "api_key", {}) or {}).get("id"),
        action="session.export",
        target=session_id,
        metadata={"format": fmt, "event_count": len(transformed)},
        ip=request.client.host if request.client else None,
        session_id=session_id,
        tenant_id=getattr(request.state, "tenant", None),
    )

    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=body, media_type=media_type, headers=headers)


@app.put("/session/{session_id}/settings", response_model=SessionSettingsResponse)
async def api_update_settings(session_id: str, payload: SessionSettingsUpdatePayload, request: Request) -> SessionSettingsResponse:
    if getattr(request.state, "role", "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")

    try:
        existing = await get_session_settings_async(session_id)
    except RuntimeError:
        existing = get_session_settings(session_id)

    if existing is None:
        existing = {}

    snapshot = await snapshot_for_session(session_id)
    profile_name = payload.profile or snapshot.get("profile") or DEFAULT_PROFILE_NAME

    overrides_base = snapshot.get("overrides") if isinstance(snapshot.get("overrides"), dict) else {}
    overrides_mutation = payload.model_dump(exclude_none=True)
    overrides_mutation.pop("profile", None)
    combined_overrides = dict(overrides_base)
    combined_overrides.update(overrides_mutation)

    rebuilt = await build_session_settings(profile=profile_name, overrides=combined_overrides)
    merged = dict(existing)
    merged.update(rebuilt)
    merged["session_id"] = session_id

    await emit_settings_event(session_id=session_id, settings=merged)

    await record_audit_event_async(
        actor=(getattr(request.state, "api_key", {}) or {}).get("id"),
        action="session.settings.update",
        target=session_id,
        metadata={"profile": profile_name, "overrides": combined_overrides},
        ip=request.client.host if request.client else None,
        session_id=session_id,
        tenant_id=getattr(request.state, "tenant", None),
    )

    return SessionSettingsResponse(
        session_id=session_id,
        profile=merged["profile"],
        settings=merged["effective"],
        provider=merged.get("provider", {}),
    )


@app.post("/session/{session_id}/revalidate")
async def api_revalidate(session_id: str, payload: RevalidatePayload, request: Request):
    envelope = {"context": payload.context}
    await enforce_request_policies(request, envelope)

    tenseigan_payload = {
        "context": payload.context,
        "payload": {"draft_md": payload.draft_md},
        "reasoning_md": "### Overseer Kill Switch",
    }
    tenseigan_result = await validate_claims_async(tenseigan_payload)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.TENSEIGAN_VALIDATE_CLAIMS.value,
        result=tenseigan_result,
    )

    byakugan_payload = {
        "context": payload.context,
        "payload": {"topic": payload.topic, "draft_md": payload.draft_md},
        "reasoning_md": "### Overseer Kill Switch",
    }
    byakugan_result = await consistency_check_async(byakugan_payload)
    await _emit_eye_update(
        session_id=session_id,
        tool_name=ToolName.BYAKUGAN_CONSISTENCY_CHECK.value,
        result=byakugan_result,
    )

    return {"tenseigan": tenseigan_result, "byakugan": byakugan_result}


@app.websocket("/ws/pipeline/{session_id}")
async def ws_pipeline(websocket: WebSocket, session_id: str):
    api_key = websocket.headers.get("X-API-Key")
    if not api_key:
        query_key = websocket.query_params.get("api_key")
        if query_key:
            api_key = query_key
    try:
        record = await validate_api_key_async(api_key)
    except HTTPException:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    await PIPELINE_BUS.register(session_id, websocket)
    await record_audit_event_async(
        actor=record.get("id"),
        action="ws_connect",
        target=f"session:{session_id}",
        metadata={"role": record.get("role")},
        ip=websocket.client.host if websocket.client else None,
        session_id=session_id,
        tenant_id=record.get("tenant"),
    )
    try:
        snapshot = await snapshot_for_session(session_id)
        if snapshot:
            payload = {
                "type": "settings_update",
                "session_id": session_id,
                "data": snapshot,
                "ts": _serialize_timestamp(time.time()),
            }
            await websocket.send_json(payload)
        await send_initial_snapshot(session_id, websocket)
        while True:
            try:
                message = await websocket.receive_text()
                if message.strip().lower() == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception:
                break
    finally:
        await PIPELINE_BUS.unregister(session_id, websocket)


@app.get("/admin/bootstrap/status", tags=["admin"])
async def admin_bootstrap_status() -> Dict[str, Any]:
    count = await admin_account_count_async()
    return {
        "bootstrapped": count > 0,
        "admin_count": count,
        "bootstrap_email": CONFIG.admin.email,
    }


@app.post("/admin/auth/login", response_model=AdminLoginResponse, tags=["admin"])
async def admin_login(payload: AdminLoginRequest, request: Request) -> AdminLoginResponse:
    try:
        account = await authenticate_admin_async(payload.email, payload.password)
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    key_id, api_key = await issue_admin_api_key_async(account["id"])
    sanitized = sanitize_admin_record(account)
    await record_audit_event_async(
        actor=account["id"],
        action="admin.login",
        target=account["id"],
        metadata={"key_id": key_id, "email": sanitized["email"]},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return AdminLoginResponse(
        key_id=key_id,
        api_key=api_key,
        account=AdminAccountResponse(**sanitized),
        force_password_reset=sanitized["require_password_reset"],
    )


async def _require_admin_request_async(request: Request) -> tuple[str, Dict[str, Any]]:
    role = getattr(request.state, "role", "")
    if role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    account_id = getattr(request.state, "account_id", None)
    if not account_id:
        raise HTTPException(status_code=403, detail="Admin account context missing")
    account = await get_admin_account_async(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Admin account not found")
    return account_id, account


def _require_admin_request(request: Request) -> tuple[str, Dict[str, Any]]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(_require_admin_request_async(request))
    raise RuntimeError(
        "_require_admin_request() cannot be called from an active event loop; use "
        "await _require_admin_request_async() instead."
    )


@app.get("/admin/account", response_model=AdminAccountResponse, tags=["admin"])
async def admin_get_account(request: Request) -> AdminAccountResponse:
    account_id, account = await _require_admin_request_async(request)
    sanitized = sanitize_admin_record(account)
    await record_audit_event_async(
        actor=account_id,
        action="admin.profile.view",
        target=account_id,
        metadata={},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return AdminAccountResponse(**sanitized)


@app.post("/admin/auth/change-password", response_model=AdminLoginResponse, tags=["admin"])
async def admin_change_password(
    payload: AdminPasswordChangeRequest,
    request: Request,
) -> AdminLoginResponse:
    account_id, account = await _require_admin_request_async(request)

    if not verify_password(payload.old_password, account["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    key_id, api_key = await change_admin_password_async(account_id, payload.new_password)
    updated = await get_admin_account_async(account_id)
    sanitized = sanitize_admin_record(updated)
    await record_audit_event_async(
        actor=account_id,
        action="admin.password.change",
        target=account_id,
        metadata={"key_id": key_id},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return AdminLoginResponse(
        key_id=key_id,
        api_key=api_key,
        account=AdminAccountResponse(**sanitized),
        force_password_reset=False,
    )


@app.patch("/admin/account", response_model=AdminAccountResponse, tags=["admin"])
async def admin_update_account_endpoint(
    payload: AdminProfileUpdateRequest,
    request: Request,
) -> AdminAccountResponse:
    if payload.email is None and payload.display_name is None:
        raise HTTPException(status_code=400, detail="No changes supplied")

    account_id, _ = await _require_admin_request_async(request)
    try:
        await update_admin_account_async(
            admin_id=account_id,
            email=payload.email,
            display_name=payload.display_name,
        )
    except Exception as exc:  # pragma: no cover - surfaces as HTTP error
        message = str(exc)
        if "UNIQUE" in message.upper():
            raise HTTPException(status_code=409, detail="Email already in use") from exc
        raise

    updated = await get_admin_account_async(account_id)
    sanitized = sanitize_admin_record(updated)
    await record_audit_event_async(
        actor=account_id,
        action="admin.profile.update",
        target=account_id,
        metadata={"email": sanitized["email"], "display_name": sanitized["display_name"]},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return AdminAccountResponse(**sanitized)


app.include_router(admin_router, prefix="/admin", tags=["admin"])


__all__ = ["app"]
