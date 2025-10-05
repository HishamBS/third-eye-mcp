#!/usr/bin/env python3
"""Retention enforcement script for Third Eye MCP."""
from __future__ import annotations

import time
from pathlib import Path
from typing import Iterable

import typer

from third_eye import db
from third_eye.config import CONFIG


app = typer.Typer(add_completion=False, help="Run data retention tasks")


def _human(count: int, label: str) -> str:
    return f"{count} {label}{'s' if count != 1 else ''}"


def _remove_files(entries: Iterable[tuple[str, str, str]]) -> list[str]:
    removed_ids: list[str] = []
    for doc_id, _bucket, raw_path in entries:
        path = Path(raw_path)
        if path.is_file():
            try:
                path.unlink()
            except OSError:
                continue
        removed_ids.append(doc_id)
    return removed_ids


@app.command()
def run(dry_run: bool = typer.Option(False, help="Report without deleting")) -> None:
    """Enforce configured retention windows."""

    now = time.time()
    retention = CONFIG.retention

    runs_cutoff = now - retention.runs_days * 86400
    audit_cutoff = now - retention.audit_days * 86400
    tmp_cutoff = now - retention.tmp_hours * 3600
    retained_cutoff = now - retention.retained_days * 86400

    runs_removed = db.purge_runs(runs_cutoff, dry_run=dry_run)
    audit_removed = db.purge_audit(audit_cutoff, dry_run=dry_run)

    expired_docs = db.fetch_expired_documents(
        tmp_cutoff=tmp_cutoff,
        retained_cutoff=retained_cutoff,
        now_ts=now,
    )
    doc_ids: list[str] = []
    if not dry_run and expired_docs:
        doc_ids = _remove_files(expired_docs)
        if doc_ids:
            db.delete_documents(doc_ids)

    typer.echo(
        "Retention summary: "
        f"{_human(runs_removed, 'run')}, "
        f"{_human(audit_removed, 'audit log')}, "
        f"{_human(len(expired_docs), 'document')} marked"
    )
    if not dry_run and doc_ids:
        typer.echo(f"Removed {_human(len(doc_ids), 'document')} from storage")


if __name__ == "__main__":  # pragma: no cover - CLI entrypoint
    app()
