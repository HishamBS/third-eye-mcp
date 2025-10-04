"""Pydantic models for admin APIs."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, Field, field_validator


class APIKeyLimits(BaseModel):
    rate: Dict[str, Any] | None = None
    budget: Dict[str, Any] | None = None
    branches: list[str] | None = None
    tools: list[str] | None = None
    tenants: list[str] | None = None
    max_budget_tokens: int | None = Field(default=None, ge=0)

    model_config = {"extra": "allow"}


class APIKeyCreateRequest(BaseModel):
    key_id: str | None = Field(default=None, min_length=3, max_length=64)
    role: str = Field(default="consumer", min_length=3, max_length=32)
    tenant: str | None = Field(default=None, max_length=128)
    limits: APIKeyLimits | None = None
    ttl_seconds: int | None = Field(default=None, gt=0)
    display_name: str | None = Field(default=None, min_length=1, max_length=128)


class APIKeyRotateResponse(BaseModel):
    id: str
    secret: str
    expires_at: Optional[float] = None


class APIKeyEntry(BaseModel):
    id: str
    role: str
    tenant: str | None
    created_at: float | None
    expires_at: float | None
    revoked_at: float | None
    last_used_at: float | None
    rotated_at: float | None
    account_id: str | None = None
    limits: Dict[str, Any] = Field(default_factory=dict)
    display_name: str | None = None


class APIKeyListResponse(BaseModel):
    items: list[APIKeyEntry]
    total: int


class APIKeyUpdateRequest(BaseModel):
    limits: APIKeyLimits | None = None
    expires_at: datetime | None = None
    display_name: str | None = Field(default=None, min_length=1, max_length=128)

    @field_validator("expires_at")
    @classmethod
    def _validate_future(cls, value: datetime | None) -> datetime | None:
        if value and value.timestamp() <= 0:
            raise ValueError("expires_at must be a valid timestamp")
        return value


class TenantEntry(BaseModel):
    id: str
    display_name: str
    description: str | None = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    created_at: float | None = None
    updated_at: float | None = None
    archived_at: float | None = None
    total_keys: int = 0
    active_keys: int = 0
    last_key_rotated_at: float | None = None
    last_key_used_at: float | None = None


class TenantListResponse(BaseModel):
    items: list[TenantEntry]
    total: int


class TenantCreateRequest(BaseModel):
    id: str = Field(..., min_length=2, max_length=128)
    display_name: str = Field(..., min_length=2, max_length=128)
    description: str | None = Field(default=None, max_length=512)
    metadata: Dict[str, Any] | None = None
    tags: list[str] | None = None


class TenantUpdateRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=2, max_length=128)
    description: str | None = Field(default=None, max_length=512)
    metadata: Dict[str, Any] | None = None
    tags: list[str] | None = None


class AuditExportResponse(BaseModel):
    items: list[Dict[str, Any]]
    count: int


class AdminOption(BaseModel):
    value: str
    label: str
    description: str | None = None
    group: str | None = None


class AdminOptionSetResponse(BaseModel):
    roles: list[AdminOption]
    branches: list[AdminOption]
    tools: list[AdminOption]
    tenants: list[AdminOption]


class ProfileEntry(BaseModel):
    name: str
    data: Dict[str, Any]
    created_at: float | None = None
    updated_at: float | None = None


class ProfilesResponse(BaseModel):
    items: list[ProfileEntry]
    total: int


class ProfilesUpdateRequest(BaseModel):
    profiles: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class ProviderStateResponse(BaseModel):
    mode: str
    engine: Dict[str, Any] = Field(default_factory=dict)


class ProviderUpdateRequest(BaseModel):
    mode: str
    engine: Dict[str, Any] | None = None

    @field_validator("mode", mode="before")
    @classmethod
    def _normalize_mode(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("mode must be a string")
        lowered = value.strip().lower()
        if lowered not in {"api", "offline"}:
            raise ValueError("mode must be either 'api' or 'offline'")
        return lowered


def _normalize_email(value: str) -> str:
    try:
        result = validate_email(value, allow_smtputf8=True, check_deliverability=False)
    except EmailNotValidError as exc:  # pragma: no cover - error surfaced to client
        message = str(exc)
        if isinstance(value, str) and "@" in value and "special-use or reserved" in message.lower():
            local, domain = value.split("@", 1)
            local = local.strip()
            domain = domain.strip()
            if local and domain:
                return f"{local.lower()}@{domain.lower()}"
        raise ValueError(message) from exc
    return result.normalized


class AdminAccountResponse(BaseModel):
    id: str
    email: str
    display_name: str | None = None
    require_password_reset: bool
    created_at: float | None = None
    updated_at: float | None = None
    last_login_at: float | None = None

    _validate_email = field_validator("email", mode="before")(_normalize_email)


class AdminLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)

    _validate_email = field_validator("email", mode="before")(_normalize_email)


class AdminLoginResponse(BaseModel):
    key_id: str
    api_key: str
    account: AdminAccountResponse
    force_password_reset: bool


class AdminPasswordChangeRequest(BaseModel):
    old_password: str = Field(min_length=8)
    new_password: str = Field(min_length=12)


class AdminProfileUpdateRequest(BaseModel):
    email: str | None = None
    display_name: str | None = Field(default=None, min_length=3)

    @field_validator("email", mode="before")
    @classmethod
    def _validate_optional_email(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_email(value)


class ToolModelMapping(BaseModel):
    tool: str
    primary_provider: str
    primary_model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None
    updated_by: str | None = None
    updated_at: float | None = None


class ToolModelUpdateRequest(BaseModel):
    primary_provider: str
    primary_model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None


class ProviderModelsRequest(BaseModel):
    api_key: str | None = None
    base_url: str | None = None
    referer: str | None = None
    app_title: str | None = None


class ProviderModelsResponse(BaseModel):
    provider: str
    models: list[str]


class PersonaPromptVersion(BaseModel):
    id: str
    version: str
    active: bool
    staged: bool
    created_at: float | None = None
    approved_at: float | None = None


class PersonaPromptDetail(BaseModel):
    id: str
    persona: str
    version: str
    content_md: str
    checksum: str
    metadata: Dict[str, Any]
    created_by: str | None = None
    notes: str | None = None
    created_at: float | None = None
    approved_at: float | None = None
    supersedes_id: str | None = None
    rollback_of: str | None = None


class PersonaPromptStageRequest(BaseModel):
    content_md: str
    version: str | None = None
    metadata: Dict[str, Any] | None = None
    notes: str | None = None


class PersonaPromptPublishRequest(BaseModel):
    notes: str | None = None


class PersonaSummary(BaseModel):
    persona: str
    label: str
    active: PersonaPromptDetail | None = None
    versions: list[PersonaPromptVersion] = Field(default_factory=list)


class PersonaCatalogResponse(BaseModel):
    items: list[PersonaSummary]


class EnvironmentModelMapping(BaseModel):
    tool: str
    default_provider: str
    default_model: str
    fallback_provider: str | None = None
    fallback_model: str | None = None


class EnvironmentGuardrails(BaseModel):
    requests_per_minute: int | None = Field(default=None, ge=1)
    max_tokens_per_request: int | None = Field(default=None, ge=1)


class EnvironmentObservability(BaseModel):
    prometheus_base_url: str | None = Field(default=None, max_length=512)


class EnvironmentSettingsResponse(BaseModel):
    defaults: list[EnvironmentModelMapping]
    guardrails: EnvironmentGuardrails
    observability: EnvironmentObservability | None = None
    updated_at: float | None = None
    updated_by: str | None = None


class EnvironmentSettingsUpdateRequest(BaseModel):
    defaults: list[EnvironmentModelMapping]
    guardrails: EnvironmentGuardrails
    observability: EnvironmentObservability | None = None


__all__ = [
    "APIKeyCreateRequest",
    "APIKeyRotateResponse",
    "APIKeyEntry",
    "APIKeyListResponse",
    "APIKeyLimits",
    "APIKeyUpdateRequest",
    "AuditExportResponse",
    "AdminAccountResponse",
    "AdminLoginRequest",
    "AdminLoginResponse",
    "AdminPasswordChangeRequest",
    "AdminProfileUpdateRequest",
    "AdminOption",
    "AdminOptionSetResponse",
    "ToolModelMapping",
    "ToolModelUpdateRequest",
    "ProviderModelsRequest",
    "ProviderModelsResponse",
    "PersonaPromptVersion",
    "PersonaPromptDetail",
    "PersonaPromptStageRequest",
    "PersonaPromptPublishRequest",
    "PersonaSummary",
    "PersonaCatalogResponse",
]
