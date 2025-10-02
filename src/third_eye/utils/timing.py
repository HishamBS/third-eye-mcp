"""Timing utilities."""
from __future__ import annotations

import contextlib
import time
from typing import Dict, Iterator


@contextlib.contextmanager
def timed(registry: Dict[str, float], key: str) -> Iterator[None]:
    start = time.perf_counter()
    try:
        yield
    finally:
        registry[key] = (time.perf_counter() - start) * 1000


__all__ = ["timed"]
