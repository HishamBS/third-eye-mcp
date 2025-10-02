"""Mangekyō aggregator exposing phase review tools."""
from __future__ import annotations

from typing import Any, Dict

from .mangekyo import review_docs as _review_docs
from .mangekyo import review_impl as _review_impl
from .mangekyo import review_scaffold as _review_scaffold
from .mangekyo import review_tests as _review_tests


def review_scaffold(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _review_scaffold.review_scaffold(raw)


def review_impl(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _review_impl.review_impl(raw)


def review_tests(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _review_tests.review_tests(raw)


def review_docs(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _review_docs.review_docs(raw)


__all__ = [
    "review_scaffold",
    "review_impl",
    "review_tests",
    "review_docs",
]
