"""Embedding utilities."""
from __future__ import annotations

import math
from typing import Iterable, Sequence


def cosine_similarity(a: Sequence[float], b: Sequence[float]) -> float:
    if len(a) != len(b):  # pragma: no cover - defensive
        raise ValueError("Embedding vectors must be the same length")
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def average_embeddings(vectors: Iterable[Sequence[float]]) -> list[float]:
    vectors = list(vectors)
    if not vectors:
        return []
    length = len(vectors[0])
    accumulator = [0.0] * length
    for vec in vectors:
        for idx, value in enumerate(vec):
            accumulator[idx] += value
    return [value / len(vectors) for value in accumulator]


__all__ = ["cosine_similarity", "average_embeddings"]
