"""Provider factory and configuration helpers."""
from __future__ import annotations

import os

from ..config import CONFIG

from .base import REGISTRY
from .groq import GroqProvider
from .openrouter import OpenRouterProvider
from .offline import OfflineProvider
from .embeddings import GroqEmbeddingsDriver, MockEmbeddingsDriver, set_embeddings_driver


def configure_provider() -> None:
    """Configure provider clients based on env vars."""

    default_provider = os.getenv("THIRD_EYE_PROVIDER", "groq").strip().lower()
    if default_provider not in {"groq", "openrouter", "offline"}:
        raise ValueError(f"Unsupported provider '{default_provider}'")
    registered_default = False
    embeddings_configured = False
    set_embeddings_driver(MockEmbeddingsDriver())

    try:
        groq_client = GroqProvider()
        REGISTRY.set(groq_client, name="groq", default=default_provider == "groq")
        registered_default = registered_default or default_provider == "groq"
        model_name = getattr(CONFIG.groq.models, "embeddings", None)
        if model_name:
            set_embeddings_driver(GroqEmbeddingsDriver(model=model_name))
            embeddings_configured = True
    except Exception:  # noqa: BLE001
        if default_provider == "groq":
            raise

    try:
        openrouter_client = OpenRouterProvider()
        REGISTRY.set(openrouter_client, name="openrouter", default=default_provider == "openrouter")
        if default_provider == "openrouter":
            registered_default = True
    except Exception:  # noqa: BLE001
        if default_provider == "openrouter":
            raise

    try:
        offline_client = OfflineProvider()
        REGISTRY.set(offline_client, name="offline", default=default_provider == "offline")
        if default_provider == "offline":
            registered_default = True
    except Exception:  # noqa: BLE001
        if default_provider == "offline":
            raise

    if not registered_default:
        # ensure we have a default provider name even if preference unavailable
        available = REGISTRY.names()
        if available:
            REGISTRY.set(REGISTRY.get(available[0]), name=available[0], default=True)
        else:
            raise ValueError("No LLM providers could be configured; check API keys")

    if not embeddings_configured:
        set_embeddings_driver(MockEmbeddingsDriver())



__all__ = ["configure_provider"]
