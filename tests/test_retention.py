import time
from pathlib import Path

import pytest

from third_eye import db

pytestmark = pytest.mark.skipif(db._USE_POSTGRES, reason="Retention tests run with SQLite fallback")


def _reset() -> None:
    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute("DELETE FROM runs")
        database.execute("DELETE FROM audit")
        database.execute("DELETE FROM docs")


def test_purge_runs_sqlite():
    _reset()
    now = time.time()
    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute(
            "INSERT INTO runs (id, tool, topic, input_json, output_json, ts) VALUES (?, ?, ?, ?, ?, ?)",
            ("old", "tool", None, "{}", "{}", now - 400),
        )
        database.execute(
            "INSERT INTO runs (id, tool, topic, input_json, output_json, ts) VALUES (?, ?, ?, ?, ?, ?)",
            ("new", "tool", None, "{}", "{}", now),
        )

    cutoff = now - 200
    dry = db.purge_runs(cutoff, dry_run=True)
    assert dry == 1

    removed = db.purge_runs(cutoff, dry_run=False)
    assert removed == 1

    with db.conn() as database:  # type: ignore[attr-defined]
        remaining = database.execute("SELECT COUNT(*) FROM runs").fetchone()[0]
    assert remaining == 1


def test_purge_audit_sqlite():
    _reset()
    now = time.time()
    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute(
            "INSERT INTO audit (id, actor, action, created_at) VALUES (?, ?, ?, ?)",
            ("old", "actor", "test", now - 1000),
        )
        database.execute(
            "INSERT INTO audit (id, actor, action, created_at) VALUES (?, ?, ?, ?)",
            ("new", "actor", "test", now),
        )

    cutoff = now - 500
    assert db.purge_audit(cutoff, dry_run=True) == 1
    assert db.purge_audit(cutoff, dry_run=False) == 1


def test_fetch_and_delete_documents(tmp_path):
    _reset()
    now = time.time()
    tmp_file = tmp_path / "tmp-doc.txt"
    tmp_file.write_text("tmp", encoding="utf-8")
    retained_file = tmp_path / "retained-doc.txt"
    retained_file.write_text("retained", encoding="utf-8")

    with db.conn() as database:  # type: ignore[attr-defined]
        database.execute(
            """
            INSERT INTO docs (id, session_id, bucket, path, bytes, created_at, retained_until)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            ("tmp-doc", "s", "tmp", str(tmp_file), 3, now - 1_000_000, None),
        )
        database.execute(
            """
            INSERT INTO docs (id, session_id, bucket, path, bytes, created_at, retained_until)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "ret-doc",
                "s",
                "retained",
                str(retained_file),
                8,
                now - 1_000_000,
                now - 100,
            ),
        )

    docs = db.fetch_expired_documents(
        tmp_cutoff=now - 100,
        retained_cutoff=now - 100,
        now_ts=now,
    )
    doc_ids = {doc[0] for doc in docs}
    assert doc_ids == {"tmp-doc", "ret-doc"}

    tmp_file.unlink(missing_ok=True)
    retained_file.unlink(missing_ok=True)

    removed = db.delete_documents([doc for doc, *_ in docs])
    assert removed == 2

    assert not tmp_file.exists()
    assert not retained_file.exists()
