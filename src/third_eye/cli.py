"""Typer CLI exposing Overseer Eye tools."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

import typer

from .eyes import (
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

app = typer.Typer(add_completion=False, help="Third Eye Overseer CLI")


def _echo(data: Dict[str, Any]) -> None:
    typer.echo(json.dumps(data, indent=2, ensure_ascii=False))


def _load_request(request: Optional[str], request_file: Optional[Path]) -> Dict[str, Any]:
    if request_file is not None:
        content = request_file.read_text(encoding="utf-8")
    elif request is not None:
        content = request
    else:
        content = typer.get_text_stream("stdin").read()
    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:  # pragma: no cover - invalid input path
        raise typer.BadParameter(f"Invalid JSON: {exc}")


@app.command()
def sharingan(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Run Sharingan clarify gate."""

    payload = _load_request(request, request_file)
    _echo(clarify(payload))


@app.command("prompt-helper")
def prompt_helper(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Run Prompt Helper to rewrite prompt."""

    payload = _load_request(request, request_file)
    _echo(rewrite_prompt(payload))


@app.command()
def jogan(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Run Jōgan intent confirmation."""

    payload = _load_request(request, request_file)
    _echo(confirm_intent(payload))


@app.command("plan-requirements")
def plan_requirements_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Emit plan schema requirements."""

    payload = _load_request(request, request_file)
    _echo(plan_requirements(payload))


@app.command("plan-review")
def plan_review_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Review submitted plan."""

    payload = _load_request(request, request_file)
    _echo(plan_review(payload))


@app.command("review-scaffold")
def review_scaffold_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Review scaffold phase."""

    payload = _load_request(request, request_file)
    _echo(review_scaffold(payload))


@app.command("review-impl")
def review_impl_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Review implementation phase."""

    payload = _load_request(request, request_file)
    _echo(review_impl(payload))


@app.command("review-tests")
def review_tests_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Review tests phase."""

    payload = _load_request(request, request_file)
    _echo(review_tests(payload))


@app.command("review-docs")
def review_docs_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Review docs phase."""

    payload = _load_request(request, request_file)
    _echo(review_docs(payload))


@app.command("validate-claims")
def validate_claims_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Validate citations with Tenseigan."""

    payload = _load_request(request, request_file)
    _echo(validate_claims(payload))


@app.command("consistency-check")
def consistency_check_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Run Byakugan consistency check."""

    payload = _load_request(request, request_file)
    _echo(consistency_check(payload))


@app.command("final-approval")
def final_approval_cmd(
    request: Optional[str] = typer.Option(None, help="JSON request"),
    request_file: Optional[Path] = typer.Option(None, help="Path to JSON request file"),
) -> None:
    """Request final approval."""

    payload = _load_request(request, request_file)
    _echo(final_approval(payload))


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    app()
