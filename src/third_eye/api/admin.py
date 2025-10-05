"""Admin API endpoints for key lifecycle, auditing, and observability."""
from __future__ import annotations

import asyncio
import hashlib
import os
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from .. import provider_metrics
from ..auth import create_api_key_async, generate_api_key
from ..utils.ids import generate_key_id
from ..db import (
    fetch_api_key_by_id_async,
    list_api_keys_async,
    list_audit_events_async,
    list_known_tenants_async,
    list_tool_model_mappings_async,
    get_tool_model_mapping_async,
    upsert_tool_model_mapping_async,
    record_audit_event_async,
    restore_api_key_async,
    revoke_api_key_async,
    update_api_key_limits_async,
    stage_persona_prompt,
    publish_persona_prompt,
    get_active_persona_prompt,
    list_persona_versions,
    get_persona_prompt_by_id,
    get_environment_settings_async,
    update_environment_settings_async,
    create_tenant_async,
    update_tenant_async,
    archive_tenant_async,
    restore_tenant_async,
    fetch_tenant_async,
    list_tenants_async,
    list_profiles_async,
    upsert_profile_async,
    fetch_provider_state_async,
    update_provider_state_async,
)
from ..config import CONFIG
from ..personas import PERSONAS
from ..groq_client import GroqClient
from ..providers.openrouter import OpenRouterProvider
from ..providers import configure_provider
from ..observability import BUDGET_COUNTER, snapshot_request_totals
from ..prometheus_client import query_prometheus
from ..constants import EYE_TOOL_VERSIONS, ToolName, TOOL_BRANCH_MAP, TOOL_TO_EYE, PersonaKey
from ..core.settings import DEFAULT_PROFILES, normalize_settings, current_provider_state
from ..schemas.admin import (
    APIKeyCreateRequest,
    APIKeyEntry,
    APIKeyListResponse,
    APIKeyRotateResponse,
    APIKeyUpdateRequest,
    AuditExportResponse,
    AdminOption,
    AdminOptionSetResponse,
    ToolModelMapping,
    ToolModelUpdateRequest,
    ProviderModelsRequest,
    ProviderModelsResponse,
    PersonaPromptStageRequest,
    PersonaPromptPublishRequest,
    PersonaCatalogResponse,
    PersonaSummary,
    PersonaPromptDetail,
    PersonaPromptVersion,
    EnvironmentSettingsResponse,
    EnvironmentSettingsUpdateRequest,
    TenantEntry,
    TenantListResponse,
    TenantCreateRequest,
    TenantUpdateRequest,
    ProfileEntry,
    ProfilesResponse,
    ProfilesUpdateRequest,
    ProviderStateResponse,
    ProviderUpdateRequest,
)

router = APIRouter()


def _require_admin(request: Request) -> None:
    role = getattr(request.state, "role", "")
    if role.lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


def _current_actor(request: Request) -> Optional[str]:
    record = getattr(request.state, "api_key", None)
    if isinstance(record, dict):
        return record.get("id")
    return None


_SUPPORTED_PROVIDERS = ("groq", "openrouter")
_TOOL_CHOICES = [tool.value for tool in ToolName]


def _format_branch_label(branch: str) -> str:
    branch_map = {
        "code": "Code",
        "text": "Text",
        "shared": "Shared",
    }
    return branch_map.get(branch, branch.capitalize())


def _branch_description(branch: str) -> str:
    descriptions = {
        "code": "Code branch (Rinnegan → Mangekyō gatekeepers)",
        "text": "Text branch (Tenseigan + Byakugan fact checking)",
        "shared": "Shared eyes before branching (Navigator, Sharingan, Prompt Helper, Jōgan)",
    }
    return descriptions.get(branch, "")


def _format_tool_label(tool: str) -> str:
    return " / ".join(part.replace("_", " ").title() for part in tool.split("/"))


def _format_eye_descriptor(tool: str) -> str:
    eye_tag = TOOL_TO_EYE.get(tool)
    if not eye_tag:
        return ""
    raw = eye_tag.value.strip("[]")
    parts = [segment for segment in raw.split("/") if segment and segment.upper() != "EYE"]
    friendly = " ".join(part.replace("_", " ").title() for part in parts)
    version = EYE_TOOL_VERSIONS.get(eye_tag)
    if version:
        return f"{friendly} · v{version}"
    return friendly


def _build_role_options() -> list[AdminOption]:
    roles = [
        ("consumer", "Consumer", "Read-only session playback and portal access."),
        ("operator", "Operator", "Manage sessions, budgets, and observability widgets."),
        ("admin", "Admin", "Full control-plane access including key lifecycle and tenant policy."),
    ]
    return [AdminOption(value=value, label=label, description=desc) for value, label, desc in roles]


def _build_branch_options() -> list[AdminOption]:
    branches = sorted({branch for branch in TOOL_BRANCH_MAP.values()})
    options: list[AdminOption] = []
    for branch in branches:
        options.append(
            AdminOption(
                value=branch,
                label=_format_branch_label(branch),
                description=_branch_description(branch),
                group="Branch",
            )
        )
    return options


def _build_tool_options() -> list[AdminOption]:
    options: list[AdminOption] = []
    for tool in sorted((tool.value for tool in ToolName), key=lambda item: item):
        branch = TOOL_BRANCH_MAP.get(tool, "shared")
        descriptor = _format_eye_descriptor(tool)
        description = descriptor or _branch_description(branch)
        if description:
            description = f"{description} • {_format_branch_label(branch)} branch"
        else:
            description = f"{_format_branch_label(branch)} branch"
        options.append(
            AdminOption(
                value=tool,
                label=_format_tool_label(tool),
                description=description,
                group=_format_branch_label(branch),
            )
    )
    return options


def _default_model_mapping(tool: str) -> ToolModelMapping:
    try:
        mapping = CONFIG.groq.models.get(tool)
    except KeyError as exc:  # pragma: no cover - configuration error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"No default model mapping for {tool}") from exc
    fallback_provider = "groq" if mapping.fallback else None
    return ToolModelMapping(
        tool=tool,
        primary_provider="groq",
        primary_model=mapping.primary,
        fallback_provider=fallback_provider,
        fallback_model=mapping.fallback,
        updated_by=None,
        updated_at=None,
    )


def _resolve_persona_key(raw: str) -> PersonaKey:
    try:
        return PersonaKey(raw.lower())
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown persona '{raw}'") from exc


def _persona_label(key: PersonaKey) -> str:
    return key.name.replace("_", " ").title()


def _profiles_response(rows: list[dict[str, Any]]) -> ProfilesResponse:
    by_name = {row["name"]: row for row in rows}
    items: list[ProfileEntry] = []

    for name, defaults in DEFAULT_PROFILES.items():
        record = by_name.pop(name, None)
        data = record.get("data") if record else defaults
        sanitized = normalize_settings(data or {})
        items.append(
            ProfileEntry(
                name=name,
                data=sanitized,
                created_at=record.get("created_at") if record else None,
                updated_at=record.get("updated_at") if record else None,
            )
        )

    for record in by_name.values():
        sanitized = normalize_settings(record.get("data") or {})
        items.append(
            ProfileEntry(
                name=record["name"],
                data=sanitized,
                created_at=record.get("created_at"),
                updated_at=record.get("updated_at"),
            )
        )

    items.sort(key=lambda entry: entry.name)
    return ProfilesResponse(items=items, total=len(items))


def _ts(value: Any) -> float | None:
    if value is None:
        return None
    if hasattr(value, "timestamp"):
        return float(value.timestamp())
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _normalize_limits_payload(raw: Dict[str, Any] | None) -> Dict[str, Any]:
    """Ensure limit payloads share a consistent shape across CRUD paths."""
    if not raw:
        return {}
    result: Dict[str, Any] = {}
    extras: Dict[str, Any] = {}
    for key, value in raw.items():
        if key in {"rate", "budget"} and isinstance(value, dict):
            filtered = {sub_key: sub_val for sub_key, sub_val in value.items() if sub_val is not None}
            if filtered:
                result[key] = filtered
            continue
        if key in {"branches", "tools", "tenants"} and isinstance(value, (list, tuple, set)):
            seen: set[str] = set()
            cleaned: list[str] = []
            for item in value:
                if not isinstance(item, str):
                    continue
                item_norm = item.strip()
                if not item_norm or item_norm in seen:
                    continue
                seen.add(item_norm)
                cleaned.append(item_norm)
            if cleaned:
                result[key] = cleaned
            continue
        if key == "max_budget_tokens" and value is not None:
            try:
                max_tokens = int(value)
            except (TypeError, ValueError):
                continue
            if max_tokens >= 0:
                result[key] = max_tokens
            continue
        if value is not None:
            extras[key] = value
    if extras:
        result.update(extras)
    return result


def _serialize_tenant(record: dict[str, Any]) -> TenantEntry:
    return TenantEntry(
        id=record["id"],
        display_name=record.get("display_name") or record["id"],
        description=record.get("description"),
        metadata=record.get("metadata") or {},
        tags=list(record.get("tags") or []),
        created_at=_ts(record.get("created_at")),
        updated_at=_ts(record.get("updated_at")),
        archived_at=_ts(record.get("archived_at")),
        total_keys=int(record.get("total_keys", 0) or 0),
        active_keys=int(record.get("active_keys", 0) or 0),
        last_key_rotated_at=_ts(record.get("last_key_rotated_at")),
        last_key_used_at=_ts(record.get("last_key_used_at")),
    )


def _clean_tags(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in raw:
        if not isinstance(item, str):
            continue
        tag = item.strip()
        if not tag:
            continue
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(tag)
    cleaned.sort(key=lambda value: value.lower())
    return cleaned


def _serialize_prompt(record: dict[str, Any] | None) -> PersonaPromptDetail | None:
    if not record:
        return None
    return PersonaPromptDetail(
        id=record["id"],
        persona=record["persona"],
        version=record["version"],
        content_md=record["content_md"],
        checksum=record["checksum"],
        metadata=record.get("metadata") or {},
        created_by=record.get("created_by"),
        notes=record.get("notes"),
        created_at=_ts(record.get("created_at")),
        approved_at=_ts(record.get("approved_at")),
        supersedes_id=record.get("supersedes_id"),
        rollback_of=record.get("rollback_of"),
    )


def _serialize_version(record: dict[str, Any]) -> PersonaPromptVersion:
    return PersonaPromptVersion(
        id=record["id"],
        version=record["version"],
        active=bool(record.get("active")),
        staged=bool(record.get("staged")),
        created_at=_ts(record.get("created_at")),
        approved_at=_ts(record.get("approved_at")),
    )


async def _build_persona_summary_async(persona_key: PersonaKey) -> PersonaSummary:
    active_raw = await asyncio.to_thread(get_active_persona_prompt, persona_key.value)
    versions_raw = await asyncio.to_thread(list_persona_versions, persona_key.value, limit=20)
    active = _serialize_prompt(active_raw)
    versions = [_serialize_version(row) for row in versions_raw]

    seed_persona = PERSONAS.get(persona_key.value)
    seed_detail: PersonaPromptDetail | None = None
    seed_version: PersonaPromptVersion | None = None
    if seed_persona:
        checksum = hashlib.sha256(seed_persona.system_prompt.encode("utf-8")).hexdigest()
        seed_detail = PersonaPromptDetail(
            id=f"seed-{persona_key.value}",
            persona=persona_key.value,
            version="seed",
            content_md=seed_persona.system_prompt,
            checksum=checksum,
            metadata={"seed": "default"},
            created_by="bootstrap",
            notes="Seed prompt from persona registry",
            created_at=None,
            approved_at=None,
            supersedes_id=None,
            rollback_of=None,
        )
        seed_version = PersonaPromptVersion(
            id=seed_detail.id,
            version=seed_detail.version,
            active=True,
            staged=False,
            created_at=None,
            approved_at=None,
        )

    if active is None and seed_detail is not None:
        active = seed_detail

    if seed_version is not None:
        has_active = any(entry.active for entry in versions)
        if not versions or not has_active:
            versions = [seed_version, *versions]

    return PersonaSummary(
        persona=persona_key.value,
        label=_persona_label(persona_key),
        active=active,
        versions=versions,
    )


async def _fetch_provider_models(provider: str, payload: ProviderModelsRequest) -> list[str]:
    provider = provider.lower()
    if provider == "groq":
        try:
            client = GroqClient(api_key=payload.api_key, base_url=payload.base_url)
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        try:
            models = await client.list_models()
        finally:
            await client.close()
        return sorted(models)
    if provider == "openrouter":
        try:
            client = OpenRouterProvider(
                api_key=payload.api_key,
                base_url=payload.base_url,
                referer=payload.referer,
                app_title=payload.app_title,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        models = await client.list_models()
        return sorted(models)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unsupported provider '{provider}'")

@router.get("/api-keys", response_model=APIKeyListResponse)
async def list_keys(
    request: Request,
    include_revoked: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> APIKeyListResponse:
    _require_admin(request)
    items = await list_api_keys_async(include_revoked=include_revoked, limit=limit, offset=offset)
    normalized_items = []
    for item in items:
        item = dict(item)
        item["limits"] = _normalize_limits_payload(item.get("limits"))
        normalized_items.append(APIKeyEntry(**item))
    return APIKeyListResponse(items=normalized_items, total=len(normalized_items))


@router.get("/api-keys/options", response_model=AdminOptionSetResponse)
async def api_key_options(request: Request) -> AdminOptionSetResponse:
    _require_admin(request)
    tenant_records = await list_tenants_async(limit=500)
    tenant_options = [
        AdminOption(
            value=record["id"],
            label=(record.get("display_name") or record["id"]),
            description=record.get("description"),
        )
        for record in tenant_records
        if record.get("id")
    ]
    if not tenant_options:
        fallback = await list_known_tenants_async(limit=200)
        tenant_options = [
            AdminOption(value=tenant, label=tenant) for tenant in fallback if tenant
        ]
    tenant_options.sort(key=lambda option: option.label.lower())
    return AdminOptionSetResponse(
        roles=_build_role_options(),
        branches=_build_branch_options(),
        tools=_build_tool_options(),
        tenants=tenant_options,
    )


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants_endpoint(
    request: Request,
    include_archived: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> TenantListResponse:
    _require_admin(request)
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    search_term = search.strip() if isinstance(search, str) else None
    records = await list_tenants_async(
        include_archived=include_archived,
        search=search_term,
        limit=limit,
        offset=offset,
    )
    items = [_serialize_tenant(record) for record in records]
    return TenantListResponse(items=items, total=len(items))


@router.post("/tenants", response_model=TenantEntry, status_code=status.HTTP_201_CREATED)
async def create_tenant_endpoint(request: Request, payload: TenantCreateRequest) -> TenantEntry:
    _require_admin(request)
    tags = _clean_tags(payload.tags)
    description = payload.description.strip() if payload.description else None
    metadata = payload.metadata or {}
    try:
        await create_tenant_async(
            tenant_id=payload.id,
            display_name=payload.display_name.strip(),
            description=description,
            metadata=metadata,
            tags=tags,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    record = await fetch_tenant_async(tenant_id=payload.id) or {
        "id": payload.id,
        "display_name": payload.display_name.strip(),
        "description": description,
        "metadata": metadata,
        "tags": tags,
        "total_keys": 0,
        "active_keys": 0,
    }
    await record_audit_event_async(
        actor=_current_actor(request),
        action="tenant.create",
        target=payload.id,
        metadata={
            "display_name": payload.display_name,
            "tags": tags,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return _serialize_tenant(record)


@router.patch("/tenants/{tenant_id}", response_model=TenantEntry)
async def update_tenant_endpoint(
    request: Request,
    tenant_id: str,
    payload: TenantUpdateRequest,
) -> TenantEntry:
    _require_admin(request)
    tags = _clean_tags(payload.tags)
    description = payload.description.strip() if isinstance(payload.description, str) else payload.description
    try:
        await update_tenant_async(
            tenant_id=tenant_id,
            display_name=payload.display_name.strip() if payload.display_name else None,
            description=description,
            metadata=payload.metadata,
            tags=tags if payload.tags is not None else None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    record = await fetch_tenant_async(tenant_id=tenant_id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    await record_audit_event_async(
        actor=_current_actor(request),
        action="tenant.update",
        target=tenant_id,
        metadata={
            "display_name": payload.display_name,
            "tags": tags if payload.tags is not None else None,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=tenant_id,
    )
    return _serialize_tenant(record)


@router.post("/tenants/{tenant_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_tenant_endpoint(request: Request, tenant_id: str) -> None:
    _require_admin(request)
    try:
        await archive_tenant_async(tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await record_audit_event_async(
        actor=_current_actor(request),
        action="tenant.archive",
        target=tenant_id,
        metadata={},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=tenant_id,
    )


@router.post("/tenants/{tenant_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_tenant_endpoint(request: Request, tenant_id: str) -> None:
    _require_admin(request)
    try:
        await restore_tenant_async(tenant_id=tenant_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    await record_audit_event_async(
        actor=_current_actor(request),
        action="tenant.restore",
        target=tenant_id,
        metadata={},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=tenant_id,
    )


@router.get("/models/mappings", response_model=list[ToolModelMapping])
async def list_model_mappings(request: Request) -> list[ToolModelMapping]:
    _require_admin(request)
    rows = {row["tool"]: row for row in await list_tool_model_mappings_async()}
    result: list[ToolModelMapping] = []
    for tool_name in _TOOL_CHOICES:
        record = rows.get(tool_name)
        if record:
            result.append(ToolModelMapping(**record))
        else:
            result.append(_default_model_mapping(tool_name))
    return result


@router.put("/models/mappings/{tool}", response_model=ToolModelMapping)
async def update_model_mapping(
    request: Request,
    tool: str,
    payload: ToolModelUpdateRequest,
) -> ToolModelMapping:
    _require_admin(request)
    tool_value = tool.lower()
    if tool_value not in _TOOL_CHOICES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown tool '{tool}'")
    primary_provider = payload.primary_provider.lower()
    if primary_provider not in _SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported primary provider")
    fallback_provider = payload.fallback_provider.lower() if payload.fallback_provider else None
    if fallback_provider and fallback_provider not in _SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported fallback provider")

    actor = _current_actor(request)
    await upsert_tool_model_mapping_async(
        tool=tool_value,
        primary_provider=primary_provider,
        primary_model=payload.primary_model,
        fallback_provider=fallback_provider,
        fallback_model=payload.fallback_model,
        actor=actor,
    )
    await record_audit_event_async(
        actor=actor,
        action="model_mapping.update",
        target=tool_value,
        metadata={
            "primary_provider": primary_provider,
            "primary_model": payload.primary_model,
            "fallback_provider": fallback_provider,
            "fallback_model": payload.fallback_model,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )

    record = await get_tool_model_mapping_async(tool_value)
    if not record:
        record = _default_model_mapping(tool_value).model_dump()
    return ToolModelMapping(**record)


@router.get("/providers", response_model=list[str])
async def list_providers(request: Request) -> list[str]:
    _require_admin(request)
    return list(_SUPPORTED_PROVIDERS)


@router.post("/providers/{provider}/models", response_model=ProviderModelsResponse)
async def provider_models(
    request: Request,
    provider: str,
    payload: ProviderModelsRequest,
) -> ProviderModelsResponse:
    _require_admin(request)
    models = await _fetch_provider_models(provider, payload)
    if not models:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Provider returned no models")
    return ProviderModelsResponse(provider=provider.lower(), models=models)


@router.post("/api-keys", response_model=APIKeyRotateResponse, status_code=status.HTTP_201_CREATED)
async def create_key(request: Request, payload: APIKeyCreateRequest) -> APIKeyRotateResponse:
    _require_admin(request)
    secret = generate_api_key()
    key_id = payload.key_id or generate_key_id(prefix="ak")
    limits_dict = _normalize_limits_payload(
        payload.limits.model_dump(exclude_none=True) if payload.limits else {}
    )
    await create_api_key_async(
        key_id=key_id,
        raw_secret=secret,
        role=payload.role,
        limits=limits_dict,
        tenant=payload.tenant,
        ttl_seconds=payload.ttl_seconds,
        display_name=payload.display_name,
    )
    await record_audit_event_async(
        actor=_current_actor(request),
        action="api_key.create",
        target=key_id,
        metadata={
            "role": payload.role,
            "tenant": payload.tenant,
            "limits": limits_dict,
            "display_name": payload.display_name,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=payload.tenant,
    )
    expires_at = time.time() + payload.ttl_seconds if payload.ttl_seconds else None
    return APIKeyRotateResponse(id=key_id, secret=secret, expires_at=expires_at)


@router.post("/api-keys/{key_id}/rotate", response_model=APIKeyRotateResponse)
async def rotate_key(request: Request, key_id: str) -> APIKeyRotateResponse:
    _require_admin(request)
    existing = await fetch_api_key_by_id_async(key_id=key_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    secret = generate_api_key()
    ttl_seconds: Optional[int] = None
    if existing.get("expires_at"):
        ttl_seconds = max(int(existing["expires_at"] - time.time()), 0)
    limits = _normalize_limits_payload(existing.get("limits"))
    existing["limits"] = limits
    await create_api_key_async(
        key_id=key_id,
        raw_secret=secret,
        role=existing.get("role"),
        limits=limits,
        tenant=existing.get("tenant"),
        ttl_seconds=ttl_seconds,
        display_name=existing.get("display_name"),
    )
    await record_audit_event_async(
        actor=_current_actor(request),
        action="api_key.rotate",
        target=key_id,
        metadata={"ttl_seconds": ttl_seconds},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=existing.get("tenant"),
    )
    expires_at = existing.get("expires_at") if ttl_seconds is None else time.time() + ttl_seconds
    return APIKeyRotateResponse(id=key_id, secret=secret, expires_at=expires_at)


@router.patch("/api-keys/{key_id}", response_model=APIKeyEntry)
async def update_key(request: Request, key_id: str, payload: APIKeyUpdateRequest) -> APIKeyEntry:
    _require_admin(request)
    existing = await fetch_api_key_by_id_async(key_id=key_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    if payload.limits:
        limits = _normalize_limits_payload(payload.limits.model_dump(exclude_none=True))
    else:
        limits = _normalize_limits_payload(existing.get("limits"))
    expires_at = payload.expires_at.timestamp() if payload.expires_at else existing.get("expires_at")
    update_kwargs: Dict[str, Any] = {
        "key_id": key_id,
        "limits": limits,
        "expires_at": expires_at,
    }
    if "display_name" in payload.model_fields_set:
        update_kwargs["display_name"] = payload.display_name
    await update_api_key_limits_async(**update_kwargs)
    await record_audit_event_async(
        actor=_current_actor(request),
        action="api_key.update",
        target=key_id,
        metadata={
            "limits": limits,
            "expires_at": expires_at,
            "display_name": payload.display_name if "display_name" in payload.model_fields_set else None,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=existing.get("tenant"),
    )
    refreshed = await fetch_api_key_by_id_async(key_id=key_id)
    refreshed["limits"] = _normalize_limits_payload(refreshed.get("limits"))
    return APIKeyEntry(**refreshed)


class _ReasonPayload(BaseModel):
    reason: Optional[str] = None


@router.post("/api-keys/{key_id}/revoke", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_key(request: Request, key_id: str, payload: _ReasonPayload | None = None) -> None:
    _require_admin(request)
    existing = await fetch_api_key_by_id_async(key_id=key_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    await revoke_api_key_async(key_id=key_id, revoked_at=time.time())
    await record_audit_event_async(
        actor=_current_actor(request),
        action="api_key.revoke",
        target=key_id,
        metadata={"reason": payload.reason if payload else None},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=existing.get("tenant"),
    )


@router.post("/api-keys/{key_id}/restore", status_code=status.HTTP_204_NO_CONTENT)
async def restore_key(request: Request, key_id: str) -> None:
    _require_admin(request)
    existing = await fetch_api_key_by_id_async(key_id=key_id)
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="API key not found")
    await restore_api_key_async(key_id=key_id)
    await record_audit_event_async(
        actor=_current_actor(request),
        action="api_key.restore",
        target=key_id,
        metadata={},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=existing.get("tenant"),
    )


@router.get("/audit", response_model=AuditExportResponse)
async def export_audit(
    request: Request,
    since: float | None = None,
    until: float | None = None,
    tenant: str | None = None,
    limit: int = 500,
) -> AuditExportResponse:
    _require_admin(request)
    entries = await list_audit_events_async(
        since=since,
        until=until,
        tenant=tenant,
        limit=limit,
    )
    return AuditExportResponse(items=entries, count=len(entries))


@router.get("/settings", response_model=EnvironmentSettingsResponse)
async def get_environment_settings_endpoint(request: Request) -> EnvironmentSettingsResponse:
    _require_admin(request)
    record = await get_environment_settings_async()
    return EnvironmentSettingsResponse(**record)


@router.put("/settings", response_model=EnvironmentSettingsResponse)
async def update_environment_settings_endpoint(
    payload: EnvironmentSettingsUpdateRequest,
    request: Request,
) -> EnvironmentSettingsResponse:
    _require_admin(request)
    actor = _current_actor(request)
    defaults_payload = [item.model_dump() for item in payload.defaults]
    guardrails_payload = payload.guardrails.model_dump()
    observability_payload = (
        payload.observability.model_dump(exclude_none=True)
        if payload.observability
        else {}
    )
    record = await update_environment_settings_async(
        defaults=defaults_payload,
        guardrails=guardrails_payload,
        observability=observability_payload,
        actor=actor,
    )
    await record_audit_event_async(
        actor=actor,
        action="environment_settings.update",
        target="environment",
        metadata={
            "defaults": defaults_payload,
            "guardrails": guardrails_payload,
            "observability": observability_payload,
        },
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )
    return EnvironmentSettingsResponse(**record)


@router.get("/profiles", response_model=ProfilesResponse)
async def list_profiles_endpoint(request: Request) -> ProfilesResponse:
    _require_admin(request)
    rows = await list_profiles_async()
    return _profiles_response(rows)


@router.put("/profiles", response_model=ProfilesResponse)
async def update_profiles_endpoint(
    payload: ProfilesUpdateRequest,
    request: Request,
) -> ProfilesResponse:
    _require_admin(request)
    actor = _current_actor(request)
    updates = payload.profiles or {}
    normalized: Dict[str, Dict[str, Any]] = {}
    for name, data in updates.items():
        if not isinstance(name, str):
            continue
        sanitized = normalize_settings(data or {})
        if not sanitized:
            continue
        normalized[name.strip().lower()] = sanitized

    for profile_name, body in normalized.items():
        await upsert_profile_async(name=profile_name, data=body, actor=actor)

    if normalized:
        await record_audit_event_async(
            actor=actor,
            action="profile.upsert",
            target="profiles",
            metadata={"profiles": sorted(normalized.keys())},
            ip=request.client.host if request.client else None,
            session_id=None,
            tenant_id=None,
        )

    rows = await list_profiles_async()
    return _profiles_response(rows)


@router.get("/provider", response_model=ProviderStateResponse)
async def get_provider_state_endpoint(request: Request) -> ProviderStateResponse:
    _require_admin(request)
    state = await current_provider_state()
    return ProviderStateResponse(mode=state.get("mode", "api"), engine=state.get("engine", {}))


@router.put("/provider", response_model=ProviderStateResponse)
async def update_provider_state_endpoint(
    payload: ProviderUpdateRequest,
    request: Request,
) -> ProviderStateResponse:
    _require_admin(request)
    actor = _current_actor(request)
    engine_payload = payload.engine or {}
    await update_provider_state_async(mode=payload.mode, engine=engine_payload, actor=actor)

    await record_audit_event_async(
        actor=actor,
        action="provider.update",
        target="llm_provider",
        metadata={"mode": payload.mode, "engine": engine_payload},
        ip=request.client.host if request.client else None,
        session_id=None,
        tenant_id=None,
    )

    os.environ["THIRD_EYE_PROVIDER"] = payload.mode
    try:
        configure_provider()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to configure provider: {exc}") from exc

    state = await current_provider_state()
    return ProviderStateResponse(mode=state.get("mode", "api"), engine=state.get("engine", {}))


async def _prometheus_metrics_overview() -> tuple[Dict[str, Any] | None, Dict[str, Any]]:
    settings = await get_environment_settings_async()
    observability = (settings.get("observability") or {}) if isinstance(settings, dict) else {}
    configured_url = observability.get("prometheus_base_url")
    if isinstance(configured_url, str):
        configured_url = configured_url.strip() or None
    if not configured_url:
        configured_url = getattr(getattr(CONFIG, "observability", None), "prometheus_base_url", None)
        if isinstance(configured_url, str):
            configured_url = configured_url.strip() or None

    prom_status = {
        "status": "disabled" if not configured_url else "degraded",
        "baseUrl": configured_url,
        "lastScrape": None,
        "mode": "local" if not configured_url else "fallback",
    }

    if not configured_url:
        return None, prom_status

    window = "1h"
    queries = {
        "requests": f"sum by (tool,status,branch)(increase(third_eye_requests_total[{window}]))",
        "latency_counts": f"sum by (provider,tool)(increase(third_eye_provider_latency_seconds_count[{window}]))",
        "latency_sums": f"sum by (provider,tool)(increase(third_eye_provider_latency_seconds_sum[{window}]))",
        "failure_counts": f"sum by (provider,tool)(increase(third_eye_provider_failures_total[{window}]))",
        "budgets": f"sum by (key_id)(increase(third_eye_budget_tokens_total[{window}]))",
    }

    results: dict[str, dict[str, Any]] = {}
    for key, query in queries.items():
        data = await query_prometheus(query, base_url=configured_url)
        if data is None:
            return None, prom_status
        results[key] = data

    requests_data = results["requests"]
    result = requests_data.get("result") or []
    request_entries: list[dict[str, Any]] = []
    total_requests = 0
    last_scrape: float | None = None
    for sample in result:
        metric = sample.get("metric") or {}
        value = sample.get("value") or [None, 0]
        try:
            count = float(value[1])
        except (TypeError, ValueError):
            count = 0.0
        if count <= 0:
            continue
        timestamp = value[0]
        try:
            ts_float = float(timestamp)
        except (TypeError, ValueError):
            ts_float = None
        if ts_float is not None:
            last_scrape = max(last_scrape or ts_float, ts_float)
        total_requests += count
        request_entries.append(
            {
                "tool": metric.get("tool", "unknown"),
                "status": metric.get("status", ""),
                "branch": metric.get("branch", "shared"),
                "count": int(count),
            }
        )
    request_entries.sort(key=lambda entry: entry["count"], reverse=True)

    # Provider metrics
    latency_counts = results.get("latency_counts")
    latency_sums = results.get("latency_sums")
    failure_counts = results.get("failure_counts")

    provider_entries: list[dict[str, Any]] = []
    providers_seen: set[str] = set()

    def _index_samples(data: Dict[str, Any] | None) -> dict[str, float]:
        if not data:
            return {}
        mapping: dict[str, float] = {}
        for sample in data.get("result", []):
            metric = sample.get("metric") or {}
            provider = metric.get("provider", "unknown")
            tool = metric.get("tool", "unknown")
            key = f"{provider}:{tool}"
            value = sample.get("value") or [None, 0]
            try:
                mapping[key] = float(value[1])
            except (TypeError, ValueError):
                continue
        return mapping

    count_map = _index_samples(latency_counts)
    sum_map = _index_samples(latency_sums)
    failure_map = _index_samples(failure_counts)

    for key, count in count_map.items():
        if count <= 0:
            continue
        provider, tool = key.split(":", 1) if ":" in key else (key, "unknown")
        total_latency = sum_map.get(key, 0.0)
        failures = failure_map.get(key, 0.0)
        providers_seen.add(provider)
        average_ms = (total_latency / count) * 1000 if count > 0 else 0.0
        provider_entries.append(
            {
                "provider": provider,
                "tool": tool,
                "count": int(count),
                "average_latency_ms": max(average_ms, 0.0),
                "failures": int(max(failures, 0.0)),
            }
        )
    provider_entries.sort(key=lambda entry: entry["count"], reverse=True)

    # Budget usage
    budget_data = results.get("budgets")
    budget_entries: list[dict[str, Any]] = []
    if budget_data:
        for sample in budget_data.get("result", []):
            metric = sample.get("metric") or {}
            value = sample.get("value") or [None, 0]
            try:
                tokens = float(value[1])
            except (TypeError, ValueError):
                continue
            if tokens <= 0:
                continue
            budget_entries.append(
                {
                    "key_id": metric.get("key_id", "unknown"),
                    "tokens": int(tokens),
                }
            )
    budget_entries.sort(key=lambda entry: entry["tokens"], reverse=True)

    prom_status = {
        "status": "connected",
        "baseUrl": configured_url,
        "lastScrape": last_scrape,
        "mode": "prometheus",
    }

    payload = {
        "requests": {"total": int(total_requests), "byTool": request_entries},
        "providers": {"total": len(providers_seen), "byProvider": provider_entries},
        "budgets": {"total": len(budget_entries), "byKey": budget_entries},
    }

    return payload, prom_status


@router.get("/metrics/overview")
async def metrics_overview(request: Request) -> Dict[str, Any]:
    _require_admin(request)

    prom_payload, prom_info = await _prometheus_metrics_overview()
    if prom_payload is not None:
        prom_payload["prometheus"] = prom_info
        return prom_payload

    # Fallback to in-process counters when Prometheus is unavailable.
    requests_summary = snapshot_request_totals()
    requests_payload = {
        "total": int(requests_summary.get("total", 0) or 0),
        "byTool": requests_summary.get("by_tool", []),
    }
    provider_snapshot = provider_metrics.snapshot()
    provider_entries: list[dict[str, Any]] = []
    providers_seen: set[str] = set()
    for key, stats in provider_snapshot.items():
        provider, tool = key.split(":", 1) if ":" in key else (key, "unknown")
        count = int(stats.get("count", 0) or 0)
        failures = int(stats.get("failures", 0) or 0)
        total_latency = float(stats.get("sum", 0.0) or 0.0)
        if count <= 0 and failures <= 0:
            continue
        average_ms = total_latency / count * 1000 if count > 0 else 0.0
        providers_seen.add(provider)
        provider_entries.append(
            {
                "provider": provider,
                "tool": tool,
                "count": count,
                "average_latency_ms": average_ms,
                "failures": failures,
            }
        )
    provider_entries.sort(key=lambda item: item["count"], reverse=True)

    budget_collection = BUDGET_COUNTER.collect()
    budget_samples = budget_collection[0].samples if budget_collection else []
    budget_entries: list[dict[str, Any]] = []
    for sample in budget_samples:
        key = sample.labels.get("key_id", "unknown")
        tokens = int(sample.value)
        if tokens <= 0:
            continue
        budget_entries.append({"key_id": key, "tokens": tokens})
    budget_entries.sort(key=lambda item: item["tokens"], reverse=True)

    fallback_payload = {
        "requests": requests_payload,
        "providers": {"total": len(providers_seen), "byProvider": provider_entries},
        "budgets": {"total": len(budget_entries), "byKey": budget_entries},
    }
    fallback_payload["prometheus"] = prom_info
    return fallback_payload


@router.get("/personas", response_model=PersonaCatalogResponse)
async def list_personas_endpoint(request: Request) -> PersonaCatalogResponse:
    _require_admin(request)
    items: list[PersonaSummary] = []
    for persona_key in PersonaKey:
        items.append(await _build_persona_summary_async(persona_key))
    return PersonaCatalogResponse(items=items)


@router.post("/personas/{persona}/stage", response_model=PersonaSummary)
async def stage_persona_endpoint(persona: str, payload: PersonaPromptStageRequest, request: Request) -> PersonaSummary:
    _require_admin(request)
    persona_key = _resolve_persona_key(persona)
    actor = _current_actor(request)
    prompt_id = await asyncio.to_thread(
        stage_persona_prompt,
        persona=persona_key.value,
        content_md=payload.content_md,
        version=payload.version,
        metadata=payload.metadata,
        author=actor,
        notes=payload.notes,
        rollback_of=None,
    )
    detail = await asyncio.to_thread(get_persona_prompt_by_id, prompt_id) or {}
    await record_audit_event_async(
        actor=actor,
        action="persona.stage",
        scope="persona_prompt",
        record_id=prompt_id,
        metadata={
            "persona": persona_key.value,
            "version": detail.get("version") or payload.version,
        },
    )
    return await _build_persona_summary_async(persona_key)


@router.post("/personas/{persona}/{prompt_id}/publish", response_model=PersonaSummary)
async def publish_persona_endpoint(
    persona: str,
    prompt_id: str,
    payload: PersonaPromptPublishRequest,
    request: Request,
) -> PersonaSummary:
    _require_admin(request)
    persona_key = _resolve_persona_key(persona)
    prompt_record = await asyncio.to_thread(get_persona_prompt_by_id, prompt_id)
    if not prompt_record or prompt_record.get("persona") != persona_key.value:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona prompt not found")
    actor = _current_actor(request)
    await asyncio.to_thread(publish_persona_prompt, prompt_id=prompt_id, actor=actor, notes=payload.notes)
    await record_audit_event_async(
        actor=actor,
        action="persona.publish",
        scope="persona_prompt",
        record_id=prompt_id,
        metadata={
            "persona": persona_key.value,
            "version": prompt_record.get("version"),
        },
    )
    return await _build_persona_summary_async(persona_key)


__all__ = ["router"]
