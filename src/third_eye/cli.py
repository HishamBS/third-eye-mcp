"""Typer CLI exposing Overseer Eye tools."""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
import urllib.parse
import webbrowser
from pathlib import Path
from typing import Any, Dict, Optional

import typer

from . import auth
from .config import CONFIG
from .admin_accounts import (
    AuthenticationError,
    authenticate_admin,
    ensure_bootstrap_admin,
    get_admin_account,
    hash_password,
    issue_admin_api_key,
    reset_admin_password,
    sanitize_admin_record,
)
from .db import (
    admin_account_count,
    create_admin_account,
    delete_documents,
    fetch_api_key,
    fetch_api_key_by_id,
    fetch_admin_by_email,
    fetch_admin_by_id,
    fetch_expired_documents,
    list_documents,
    purge_documents_for_session,
    revoke_api_keys_for_account,
    update_document_bucket,
    init_db,
)
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
keys_app = typer.Typer(help="Manage API keys")
docs_app = typer.Typer(help="Manage document catalog entries")
admin_app = typer.Typer(help="Manage admin accounts")
app.add_typer(keys_app, name="keys")
app.add_typer(docs_app, name="docs")
app.add_typer(admin_app, name="admin")


LOG = logging.getLogger(__name__)


try:
    asyncio.run(init_db())
except RuntimeError:
    pass
except Exception as exc:  # pragma: no cover - defensive for CLI import contexts
    LOG.warning("CLI DB bootstrap skipped: %s", exc)


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


@app.command("portal")
def portal_open(
    session_id: Optional[str] = typer.Option(None, "--session-id", "-s", help="Session to highlight"),
    base_url: str = typer.Option("http://localhost:5173", "--base-url", help="Portal base URL"),
    auto_close: bool = typer.Option(True, "--auto/--no-auto", help="Close this tab if another portal window is active"),
) -> None:
    """Open the Overseer portal in the default browser."""

    url = base_url.rstrip("/")
    params: Dict[str, str] = {}
    if session_id:
        params["session"] = session_id
    if auto_close:
        params["auto"] = "1"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"

    typer.echo(url)
    try:
        opened = webbrowser.open(url)
        if not opened:
            typer.echo("Browser refused to open URL. Copy the link above and paste it manually.", err=True)
    except Exception as exc:  # pragma: no cover - depends on OS/browser
        typer.echo(f"Failed to launch browser: {exc}", err=True)
        raise typer.Exit(code=1) from exc


@admin_app.command("bootstrap")
def admin_bootstrap() -> None:
    """Ensure bootstrap admin exists; requires env bootstrap password."""

    before = admin_account_count()
    ensure_bootstrap_admin()
    account = fetch_admin_by_email(CONFIG.admin.email)
    status = "created" if admin_account_count() > before else "skipped"
    output: Dict[str, Any] = {"status": status}
    if account:
        output["account"] = sanitize_admin_record(account)
    _echo(output)


@admin_app.command("create")
def admin_create(
    email: str = typer.Argument(..., help="Admin email"),
    display_name: str = typer.Option("Administrator", "--display-name", "-n", help="Display name"),
    password: str = typer.Option(
        ..., prompt=True, confirmation_prompt=True, hide_input=True, help="Initial password"
    ),
    require_reset: bool = typer.Option(False, help="Force password reset on first login"),
) -> None:
    if fetch_admin_by_email(email):
        typer.echo(f"Admin with email {email} already exists", err=True)
        raise typer.Exit(code=1)

    admin_id = str(uuid.uuid4())
    create_admin_account(
        admin_id=admin_id,
        email=email,
        display_name=display_name,
        password_hash=hash_password(password),
        require_password_reset=require_reset,
    )
    account = get_admin_account(admin_id)
    key_id, api_key = issue_admin_api_key(admin_id, rotate_existing=True)
    _echo(
        {
            "account": sanitize_admin_record(account),
            "api_key": api_key,
            "key_id": key_id,
        }
    )


@admin_app.command("issue-key")
def admin_issue_key(
    email: str = typer.Argument(..., help="Admin email"),
    rotate_existing: bool = typer.Option(True, help="Revoke existing keys before issuing"),
) -> None:
    account = fetch_admin_by_email(email)
    if not account:
        typer.echo(f"Admin with email {email} not found", err=True)
        raise typer.Exit(code=1)
    key_id, api_key = issue_admin_api_key(account["id"], rotate_existing=rotate_existing)
    _echo(
        {
            "account": sanitize_admin_record(account),
            "api_key": api_key,
            "key_id": key_id,
        }
    )


@admin_app.command("reset-password")
def admin_reset_password_cmd(
    email: str = typer.Argument(..., help="Admin email"),
    new_password: str = typer.Option(
        ..., prompt=True, confirmation_prompt=True, hide_input=True, help="Replacement password"
    ),
    force_reset: bool = typer.Option(True, help="Require password reset on next login"),
) -> None:
    account = fetch_admin_by_email(email)
    if not account:
        typer.echo(f"Admin with email {email} not found", err=True)
        raise typer.Exit(code=1)
    reset_admin_password(account["id"], new_password, force_reset=force_reset)
    revoke_api_keys_for_account(account_id=account["id"], exclude_key_id=None)
    _echo({"status": "password_reset", "account": sanitize_admin_record(account)})


@admin_app.command("login")
def admin_login_cmd(
    email: str = typer.Argument(..., help="Admin email"),
    password: str = typer.Option(..., prompt=True, hide_input=True, help="Admin password"),
) -> None:
    try:
        account = authenticate_admin(email, password)
    except AuthenticationError as exc:
        typer.echo(str(exc), err=True)
        raise typer.Exit(code=1)
    key_id, api_key = issue_admin_api_key(account["id"], rotate_existing=True)
    _echo(
        {
            "account": sanitize_admin_record(account),
            "api_key": api_key,
            "key_id": key_id,
        }
    )
@keys_app.command("create")
def create_key(
    key_id: str = typer.Argument(..., help="Stable identifier for the API key"),
    role: str = typer.Option("consumer", help="Role assigned to the key"),
    tenant: Optional[str] = typer.Option(None, help="Tenant identifier"),
    ttl_seconds: Optional[int] = typer.Option(None, help="Expiry in seconds"),
    limits_json: Optional[str] = typer.Option(None, help="JSON object describing limit configuration"),
) -> None:
    """Create a new API key and print the secret."""

    try:
        limits: Dict[str, Any] = json.loads(limits_json) if limits_json else {}
    except json.JSONDecodeError as exc:  # pragma: no cover - CLI validation
        raise typer.BadParameter(f"Invalid limits JSON: {exc}") from exc

    secret = auth.generate_api_key()
    auth.create_api_key(
        key_id=key_id,
        raw_secret=secret,
        role=role,
        tenant=tenant,
        limits=limits,
        ttl_seconds=ttl_seconds,
    )
    typer.echo(json.dumps({
        "id": key_id,
        "secret": secret,
    }, indent=2))
@keys_app.command("rotate")
def rotate_key(
    key_id: str = typer.Argument(..., help="Identifier of the key to rotate"),
) -> None:
    """Rotate an API key and output the new secret."""

    record = fetch_api_key_by_id(key_id=key_id)
    if not record:
        raise typer.Exit(code=1)
    secret = auth.generate_api_key()
    ttl_seconds = None
    if record.get("expires_at"):
        ttl_seconds = max(int(record["expires_at"] - time.time()), 0)
    auth.create_api_key(
        key_id=key_id,
        raw_secret=secret,
        role=record.get("role"),
        limits=record.get("limits", {}),
        tenant=record.get("tenant"),
        ttl_seconds=ttl_seconds,
    )
    typer.echo(json.dumps({
        "id": key_id,
        "secret": secret,
    }, indent=2))


@docs_app.command("ls")
def docs_list(
    session_id: Optional[str] = typer.Option(None, help="Filter by session id"),
    bucket: Optional[str] = typer.Option(None, help="Filter by bucket (tmp|retained)"),
    limit: int = typer.Option(20, help="Maximum number of records"),
) -> None:
    """List tracked documents."""

    records = list_documents(session_id=session_id, bucket=bucket, limit=limit)
    _echo({"items": records, "count": len(records)})


@docs_app.command("promote")
def docs_promote(
    doc_id: str = typer.Argument(..., help="Document identifier"),
    hours: int = typer.Option(168, help="Retention window in hours"),
) -> None:
    """Promote a temporary document into the retained bucket."""

    retained_until = time.time() + max(hours, 1) * 3600
    update_document_bucket(doc_id=doc_id, bucket="retained", retained_until=retained_until)
    typer.echo(json.dumps({
        "id": doc_id,
        "bucket": "retained",
        "retained_until": retained_until,
    }, indent=2))


@docs_app.command("purge")
def docs_purge(
    session_id: str = typer.Argument(..., help="Session id whose documents will be deleted"),
) -> None:
    """Delete all documents associated with a session."""

    removed = purge_documents_for_session(session_id=session_id)
    typer.echo(json.dumps({"removed": removed, "session_id": session_id}, indent=2))


@app.command("gc")
def run_gc(dry_run: bool = typer.Option(False, help="Report without deleting")) -> None:
    """Run storage hygiene garbage collection."""

    now = time.time()
    retention = CONFIG.retention
    expired = fetch_expired_documents(
        tmp_cutoff=now - retention.tmp_hours * 3600,
        retained_cutoff=now - retention.retained_days * 86400,
        now_ts=now,
    )
    if dry_run:
        typer.echo(json.dumps({"marked": len(expired)}, indent=2))
        return
    ids = [doc_id for doc_id, _bucket, _path in expired]
    removed = delete_documents(ids)
    typer.echo(json.dumps({"removed": removed}, indent=2))


@keys_app.command("revoke")
def revoke_key(
    key_id: str = typer.Argument(..., help="Identifier of the key to revoke"),
) -> None:
    """Revoke an API key; removal is recorded via rotation metadata."""

    record = fetch_api_key_by_id(key_id=key_id)
    if not record:
        raise typer.Exit(code=1)
    secret = auth.generate_api_key()
    auth.create_api_key(
        key_id=key_id,
        raw_secret=secret,
        role=record.get("role"),
        limits=record.get("limits", {}),
        tenant=record.get("tenant"),
        ttl_seconds=0,
        revoked_at=time.time(),
    )
    typer.echo(json.dumps({"id": key_id, "revoked": True}, indent=2))


@keys_app.command("info")
def key_info(
    key_id: str = typer.Argument(..., help="Identifier of the key"),
    secret: Optional[str] = typer.Option(None, help="Raw secret to look up"),
) -> None:
    """Display metadata for an API key; secret lookup prefers raw secret when provided."""

    if secret:
        record = fetch_api_key(hashed_secret=auth.hash_api_key(secret))
    else:
        record = fetch_api_key_by_id(key_id=key_id)
    if not record:
        raise typer.Exit(code=1)
    typer.echo(json.dumps(record, indent=2, ensure_ascii=False))


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    app()
