"""Embedding provider implementations."""
from __future__ import annotations

from typing import Protocol

from ..config import CONFIG
from ..groq_client import GROQ, GroqClient


class EmbeddingsDriver(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Return embeddings (one vector per input text)."""


class MockEmbeddingsDriver:
    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.0 for _ in range(8)] for _ in texts]


class GroqEmbeddingsDriver:
    def __init__(self, client: GroqClient | None = None, model: str | None = None) -> None:
        self._client = client or GROQ
        self._model = model or CONFIG.groq.models.embeddings

    async def embed(self, texts: list[str]) -> list[list[float]]:
        if not self._model:
            raise RuntimeError('Groq embeddings model not configured')
        return await self._client.embeddings(self._model, texts)


EMBEDDINGS_REGISTRY: EmbeddingsDriver | None = None


def set_embeddings_driver(driver: EmbeddingsDriver) -> None:
    global EMBEDDINGS_REGISTRY
    EMBEDDINGS_REGISTRY = driver


def get_embeddings_driver() -> EmbeddingsDriver:
    if EMBEDDINGS_REGISTRY is None:
        raise RuntimeError('Embeddings driver not configured')
    return EMBEDDINGS_REGISTRY


__all__ = ['EmbeddingsDriver', 'set_embeddings_driver', 'get_embeddings_driver', 'MockEmbeddingsDriver', 'GroqEmbeddingsDriver']
