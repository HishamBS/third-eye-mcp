"""FastAPI application exposing Overseer Eye endpoints."""
from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI

from ..db import init_db
from ..groq_client import shutdown_groq_client
from ..model_guard import ensure_models_available
from ..eyes import (
    navigate,
    clarify,
    confirm_intent,
    consistency_check,
    final_approval,
    plan_requirements,
    plan_review,
    review_docs,
    review_impl,
    review_scaffold,
    review_tests,
    rewrite_prompt,
    validate_claims,
)

app = FastAPI(title="Third Eye MCP", version="2.0.0")


@app.on_event("startup")
async def startup() -> None:
    await ensure_models_available()
    init_db()


@app.on_event("shutdown")
async def shutdown() -> None:
    await shutdown_groq_client()


@app.post("/eyes/overseer/navigator")
async def api_navigator(payload: Dict[str, Any]):
    return navigate(payload)


@app.post("/eyes/sharingan/clarify")
async def api_sharingan(payload: Dict[str, Any]):
    return clarify(payload)


@app.post("/eyes/helper/rewrite_prompt")
async def api_helper(payload: Dict[str, Any]):
    return rewrite_prompt(payload)


@app.post("/eyes/jogan/confirm_intent")
async def api_jogan(payload: Dict[str, Any]):
    return confirm_intent(payload)


@app.post("/eyes/rinnegan/plan_requirements")
async def api_plan_requirements(payload: Dict[str, Any]):
    return plan_requirements(payload)


@app.post("/eyes/rinnegan/plan_review")
async def api_plan_review(payload: Dict[str, Any]):
    return plan_review(payload)


@app.post("/eyes/mangekyo/review_scaffold")
async def api_review_scaffold(payload: Dict[str, Any]):
    return review_scaffold(payload)


@app.post("/eyes/mangekyo/review_impl")
async def api_review_impl(payload: Dict[str, Any]):
    return review_impl(payload)


@app.post("/eyes/mangekyo/review_tests")
async def api_review_tests(payload: Dict[str, Any]):
    return review_tests(payload)


@app.post("/eyes/mangekyo/review_docs")
async def api_review_docs(payload: Dict[str, Any]):
    return review_docs(payload)


@app.post("/eyes/tenseigan/validate_claims")
async def api_validate_claims(payload: Dict[str, Any]):
    return validate_claims(payload)


@app.post("/eyes/byakugan/consistency_check")
async def api_consistency(payload: Dict[str, Any]):
    return consistency_check(payload)


@app.post("/eyes/rinnegan/final_approval")
async def api_final(payload: Dict[str, Any]):
    return final_approval(payload)


__all__ = ["app"]
