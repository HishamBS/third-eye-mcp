"""Provider registry bootstrap."""
from __future__ import annotations

from .base import ProviderClient, ProviderRegistry, REGISTRY
from .factory import configure_provider
from .embeddings import EmbeddingsDriver, set_embeddings_driver, get_embeddings_driver
from .groq import GroqProvider
from .openrouter import OpenRouterProvider
from .offline import OfflineProvider

# Configure provider at import time based on environment; defaults to Groq.
configure_provider()

__all__ = [
    "ProviderClient",
    "ProviderRegistry",
    "REGISTRY",
    "GroqProvider",
    "OpenRouterProvider",
    "OfflineProvider",
    "configure_provider",
]
