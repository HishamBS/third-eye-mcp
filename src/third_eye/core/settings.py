"""Session and profile settings utilities."""
from __future__ import annotations

from typing import Any, Dict

from .. import db

SYSTEM_DEFAULT_SETTINGS: Dict[str, Any] = {
    "ambiguity_threshold": 0.35,
    "citation_cutoff": 0.80,
    "consistency_tolerance": 0.85,
    "require_rollback": True,
    "mangekyo": "normal",
}

DEFAULT_PROFILES: Dict[str, Dict[str, Any]] = {
    "casual": {
        "ambiguity_threshold": 0.45,
        "citation_cutoff": 0.70,
        "consistency_tolerance": 0.80,
        "require_rollback": False,
        "mangekyo": "lenient",
    },
    "enterprise": {
        "ambiguity_threshold": 0.35,
        "citation_cutoff": 0.85,
        "consistency_tolerance": 0.85,
        "require_rollback": True,
        "mangekyo": "normal",
    },
    "security": {
        "ambiguity_threshold": 0.25,
        "citation_cutoff": 0.95,
        "consistency_tolerance": 0.92,
        "require_rollback": True,
        "mangekyo": "strict",
    },
}

DEFAULT_PROFILE_NAME = "enterprise"
_ALLOWED_MANGEKYO = {"lenient", "normal", "strict"}
_DEFAULT_PROVIDER_STATE = {"mode": "api", "engine": {}}
_SETTING_KEYS = {
    "ambiguity_threshold": (0.0, 1.0),
    "citation_cutoff": (0.0, 1.0),
    "consistency_tolerance": (0.0, 1.0),
}


def _clamp(value: float, bounds: tuple[float, float]) -> float:
    lower, upper = bounds
    return max(lower, min(upper, value))


def _normalize_numeric(value: Any, bounds: tuple[float, float]) -> float | None:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return round(_clamp(numeric, bounds), 4)


def _normalize_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if value in {"true", "True", "1", 1}:  # type: ignore[truthy-bool]
        return True
    if value in {"false", "False", "0", 0}:  # type: ignore[truthy-bool]
        return False
    return None


def _normalize_mangekyo(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    lowered = value.strip().lower()
    if lowered in _ALLOWED_MANGEKYO:
        return lowered
    return None


def normalize_settings(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Return a sanitized subset of settings supported by the system."""

    normalized: Dict[str, Any] = {}
    for key, bounds in _SETTING_KEYS.items():
        if key in raw:
            candidate = _normalize_numeric(raw.get(key), bounds)
            if candidate is not None:
                normalized[key] = candidate
    if "require_rollback" in raw:
        boolean = _normalize_bool(raw.get("require_rollback"))
        if boolean is not None:
            normalized["require_rollback"] = boolean
    if "mangekyo" in raw:
        strictness = _normalize_mangekyo(raw.get("mangekyo"))
        if strictness is not None:
            normalized["mangekyo"] = strictness
    return normalized


def merge_settings(
    *,
    system: Dict[str, Any],
    profile: Dict[str, Any],
    overrides: Dict[str, Any],
) -> Dict[str, Any]:
    merged = dict(system)
    merged.update(profile)
    merged.update(overrides)
    return merged


def _normalize_profile(profile_name: str) -> str:
    return profile_name.strip().lower() if profile_name else DEFAULT_PROFILE_NAME


def _default_profile(profile_name: str) -> Dict[str, Any]:
    baseline = DEFAULT_PROFILES.get(profile_name)
    if baseline is None:
        return {}
    return normalize_settings(baseline)


async def _resolve_profile(profile_name: str) -> Dict[str, Any]:
    normalized_name = _normalize_profile(profile_name)
    record = await db.fetch_profile_async(normalized_name)
    if record and isinstance(record.get("data"), dict):
        return normalize_settings(record["data"])
    default_payload = _default_profile(normalized_name)
    if default_payload:
        # Best-effort persistence so subsequent lookups are cached at the DB layer.
        try:
            await db.upsert_profile_async(name=normalized_name, data=default_payload, actor="system")
        except Exception:  # pragma: no cover - persistence errors should not block resolution
            pass
    return default_payload


async def current_provider_state() -> Dict[str, Any]:
    record = await db.fetch_provider_state_async()
    if not record:
        return dict(_DEFAULT_PROVIDER_STATE)
    mode = record.get("mode") or _DEFAULT_PROVIDER_STATE["mode"]
    engine = record.get("engine") if isinstance(record.get("engine"), dict) else {}
    state = dict(_DEFAULT_PROVIDER_STATE)
    state.update({"mode": str(mode).lower(), "engine": engine})
    return state


async def effective_settings(session_id: str) -> Dict[str, Any]:
    stored = await db.get_session_settings_async(session_id) or {}
    profile_name = stored.get("profile") or DEFAULT_PROFILE_NAME
    overrides = normalize_settings(stored.get("overrides") or {})
    profile_settings = await _resolve_profile(profile_name)
    return merge_settings(
        system=SYSTEM_DEFAULT_SETTINGS,
        profile=profile_settings,
        overrides=overrides,
    )


async def build_session_settings(
    *,
    profile: str | None = None,
    overrides: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    profile_name = _normalize_profile(profile or DEFAULT_PROFILE_NAME)
    overrides_payload = normalize_settings(overrides or {})
    profile_settings = await _resolve_profile(profile_name)
    effective = merge_settings(
        system=SYSTEM_DEFAULT_SETTINGS,
        profile=profile_settings,
        overrides=overrides_payload,
    )
    provider = await current_provider_state()
    return {
        "profile": profile_name,
        "overrides": overrides_payload,
        "effective": effective,
        "provider": provider,
    }


async def snapshot_for_session(session_id: str) -> Dict[str, Any]:
    stored = await db.get_session_settings_async(session_id)
    if stored is None:
        return await build_session_settings(profile=DEFAULT_PROFILE_NAME, overrides={})

    profile_name = stored.get("profile") or DEFAULT_PROFILE_NAME
    overrides = normalize_settings(stored.get("overrides") or {})
    rebuilt = await build_session_settings(profile=profile_name, overrides=overrides)

    snapshot = dict(stored)
    snapshot.update(rebuilt)
    return snapshot


__all__ = [
    "SYSTEM_DEFAULT_SETTINGS",
    "DEFAULT_PROFILES",
    "DEFAULT_PROFILE_NAME",
    "normalize_settings",
    "merge_settings",
    "effective_settings",
    "build_session_settings",
    "snapshot_for_session",
    "current_provider_state",
]
