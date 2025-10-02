"""Configuration loading and validation for Third Eye MCP."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, ClassVar

import yaml
from pydantic import BaseModel, Field, ValidationError, model_validator


class ModelMapping(BaseModel):
    primary: str
    fallback: str | None = None

    model_config = {"extra": "forbid"}


class GroqModels(BaseModel):
    tools: dict[str, ModelMapping]
    embeddings: str | None = None
    policy_filter: ModelMapping | None = None

    model_config = {"extra": "forbid"}

    REQUIRED_KEYS: ClassVar[set[str]] = {
        "sharingan/clarify",
        "helper/rewrite_prompt",
        "jogan/confirm_intent",
        "rinnegan/plan_requirements",
        "rinnegan/plan_review",
        "rinnegan/final_approval",
        "mangekyo/review_scaffold",
        "mangekyo/review_impl",
        "mangekyo/review_tests",
        "mangekyo/review_docs",
        "tenseigan/validate_claims",
        "byakugan/consistency_check",
    }

    @model_validator(mode="after")
    def _ensure_required_keys(cls, values: "GroqModels") -> "GroqModels":
        missing = cls.REQUIRED_KEYS - set(values.tools.keys())
        if missing:
            missing_keys = ", ".join(sorted(missing))
            raise ValueError(f"Missing Groq model mappings: {missing_keys}")
        return values

    def get(self, tool: str) -> ModelMapping:
        if tool not in self.tools:
            raise KeyError(f"No model mapping defined for '{tool}'")
        return self.tools[tool]

    def all_models(self) -> list[str]:
        models: list[str] = []
        for spec in self.tools.values():
            models.append(spec.primary)
            if spec.fallback:
                models.append(spec.fallback)
        if self.policy_filter:
            models.append(self.policy_filter.primary)
            if self.policy_filter.fallback:
                models.append(self.policy_filter.fallback)
        if self.embeddings:
            models.append(self.embeddings)
        return models


class InferenceDefaults(BaseModel):
    temperature: float = Field(ge=0.0, le=2.0)
    top_p: float = Field(gt=0.0, le=1.0)
    max_output_tokens: int = Field(ge=1, le=4000)
    json_mode: bool = True
    system_preamble_suffix: str = Field(min_length=1)

    model_config = {"extra": "forbid"}


class Timeouts(BaseModel):
    default_seconds: int = Field(ge=5, le=180)
    evidence_seconds: int = Field(ge=5, le=240)
    parallel_grace_seconds: int = Field(ge=1, le=120)
    retry_backoff_seconds: float = Field(ge=0.0, le=30.0)

    model_config = {"extra": "forbid"}


class RetriesCfg(BaseModel):
    max_attempts: int = Field(ge=1, le=5)

    model_config = {"extra": "forbid"}


class Thresholds(BaseModel):
    ambiguity_score_min: float = Field(ge=0.0, le=1.0)
    intent_confirmation_token_estimate: int = Field(ge=100, le=500_000)
    byakugan_similarity_alert: float = Field(ge=0.0, le=1.0)

    model_config = {"extra": "forbid"}


class RedisCfg(BaseModel):
    host: str
    port: int
    db: int = Field(ge=0)

    model_config = {"extra": "forbid"}


class SqliteCfg(BaseModel):
    path: str

    model_config = {"extra": "forbid"}


class LoggingCfg(BaseModel):
    level: str
    json: bool = True

    model_config = {"extra": "forbid"}


class McpCfg(BaseModel):
    host: str
    port: int

    model_config = {"extra": "forbid"}


class OrchestrationCfg(BaseModel):
    parallelize_consistency_and_evidence: bool = True

    model_config = {"extra": "forbid"}


class GroqCfg(BaseModel):
    base_url: str
    models: GroqModels
    inference_defaults: InferenceDefaults

    model_config = {"extra": "forbid"}


class AppConfig(BaseModel):
    version: int
    groq: GroqCfg
    timeouts: Timeouts
    retries: RetriesCfg
    thresholds: Thresholds
    redis: RedisCfg
    sqlite: SqliteCfg
    logging: LoggingCfg
    mcp: McpCfg
    orchestration: OrchestrationCfg

    model_config = {"extra": "forbid"}


_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[2] / "config.yaml"


def _resolve_path(path: str | None) -> Path:
    env_override = Path(path) if path else None
    candidate = env_override or _DEFAULT_CONFIG_PATH
    if not candidate.is_file():
        raise FileNotFoundError(f"Configuration file not found at {candidate}")
    return candidate


@lru_cache(maxsize=1)
def load_config(path: str | None = None) -> AppConfig:
    cfg_path = _resolve_path(path)
    with cfg_path.open("r", encoding="utf-8") as handle:
        raw: dict[str, Any] = yaml.safe_load(handle) or {}
    try:
        return AppConfig(**raw)
    except ValidationError as exc:  # pragma: no cover - exercised in unit tests
        raise ValueError(exc.json()) from exc


CONFIG = load_config()


__all__ = [
    "AppConfig",
    "CONFIG",
    "load_config",
]
