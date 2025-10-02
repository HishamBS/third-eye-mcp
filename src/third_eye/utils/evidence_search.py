"""Evidence search utilities leveraging DuckDuckGo."""
from __future__ import annotations

import asyncio
import json
import re
import urllib.parse
from typing import Iterable, List, Tuple

import httpx

_USER_AGENT = "third-eye-mcp/1.0"


async def search_ddg(query: str, limit: int = 5) -> list[str]:
    encoded = urllib.parse.quote_plus(query)
    url = f"https://duckduckgo.com/html/?q={encoded}"  # HTML endpoint without JS
    async with httpx.AsyncClient(timeout=30, headers={"User-Agent": _USER_AGENT}) as client:
        response = await client.get(url)
        response.raise_for_status()
        html = response.text
    candidates = re.findall(r'href="(https?://[^"]+)"', html)
    results: list[str] = []
    seen: set[str] = set()
    for link in candidates:
        if "duckduckgo.com" in link:
            continue
        if link in seen:
            continue
        seen.add(link)
        results.append(link)
        if len(results) >= limit:
            break
    return results


async def rerank(claim: str, urls: Iterable[str]) -> list[tuple[str, float]]:
    # Placeholder scoring: weight URLs that contain more overlapping words with claim
    claim_terms = set(_normalize_token(tok) for tok in claim.split())
    scored: list[tuple[str, float]] = []
    for url in urls:
        tokens = set(_normalize_token(tok) for tok in re.split(r"\W+", url))
        overlap = len(claim_terms.intersection(tokens))
        score = min(0.99, 0.4 + overlap * 0.05)
        scored.append((url, score))
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored


def _normalize_token(token: str) -> str:
    return token.lower().strip()


__all__ = ["search_ddg", "rerank"]
