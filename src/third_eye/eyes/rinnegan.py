"""Rinnegan aggregator exposing Overseer phase tools."""
from __future__ import annotations

from typing import Any, Dict

from .rinnegan import final_approval as _final
from .rinnegan import plan_requirements as _requirements
from .rinnegan import plan_review as _review


def plan_requirements(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _requirements.plan_requirements(raw)


def plan_review(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _review.plan_review(raw)


def final_approval(raw: Dict[str, Any]) -> Dict[str, Any]:
    return _final.final_approval(raw)


__all__ = ["plan_requirements", "plan_review", "final_approval"]
