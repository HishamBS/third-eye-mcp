"""Embedding ingestion and retrieval helpers."""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from ..db import search_embeddings_async, store_embedding_async
from ..providers import get_embeddings_driver

LOG = logging.getLogger("third_eye.embeddings")


async def ingest_markdown(session_id: str, topic: str, markdown: str) -> None:
    text = (markdown or "").strip()
    if not text:
        return
    try:
        driver = get_embeddings_driver()
    except RuntimeError:
        LOG.debug("Embeddings driver not configured; skipping ingestion")
        return
    chunks = _split_markdown(text)
    try:
        vectors = await driver.embed(chunks)
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Failed to compute embeddings: %s", exc)
        return
    for chunk, vector in zip(chunks, vectors, strict=False):
        await store_embedding_async(
            session_id=session_id,
            topic=topic,
            chunk_md=chunk,
            embedding=vector,
        )


async def fetch_similar_chunks(
    *,
    session_id: str,
    markdown: str,
    topic: str | None = None,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    text = (markdown or "").strip()
    if not text:
        return []
    try:
        driver = get_embeddings_driver()
    except RuntimeError:
        return []
    try:
        vectors = await driver.embed([text])
    except Exception as exc:  # noqa: BLE001
        LOG.warning("Failed to create query embedding: %s", exc)
        return []
    if not vectors:
        return []
    results = await search_embeddings_async(
        session_id=session_id,
        query_vector=vectors[0],
        limit=limit,
        topic=topic,
        exclude_session_id=session_id,
    )
    formatted: List[Dict[str, Any]] = []
    for row in results:
        distance = row.get("distance")
        similarity = None
        if distance is not None:
            try:
                similarity = max(0.0, min(1.0, 1 - float(distance)))
            except (TypeError, ValueError):  # pragma: no cover - defensive
                similarity = None
        formatted.append(
            {
                "session_id": row.get("session_id"),
                "topic": row.get("topic"),
                "excerpt": row.get("chunk_md"),
                "ts": row.get("created_at"),
                "similarity": similarity,
            }
        )
    return formatted


def _split_markdown(markdown: str) -> List[str]:
    parts = [block.strip() for block in markdown.split("\n\n") if len(block.strip()) >= 60]
    if parts:
        return parts
    text = markdown.strip()
    if len(text) > 200:
        midpoint = len(text) // 2
        return [text[:midpoint].strip(), text[midpoint:].strip()]
    return [text]


__all__ = ["ingest_markdown", "fetch_similar_chunks"]
