"""Add pipeline events, session settings, embeddings tables"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_pipeline_events"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "pipeline_events",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("session_id", sa.Text, nullable=False),
        sa.Column("eye", sa.Text, nullable=False),
        sa.Column("event_type", sa.Text, nullable=False, server_default="eye_update"),
        sa.Column("ok", sa.Boolean, nullable=True),
        sa.Column("code", sa.Text, nullable=True),
        sa.Column("tool_version", sa.Text, nullable=True),
        sa.Column("md", sa.Text, nullable=True),
        sa.Column("data", sa.JSON, nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_pipeline_events_session",
        "pipeline_events",
        ["session_id", "created_at"],
    )

    op.create_table(
        "session_settings",
        sa.Column("session_id", sa.Text, primary_key=True),
        sa.Column("data", sa.JSON, nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), server_onupdate=sa.func.now(), nullable=False),
    )

    op.create_table(
        "embeddings",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("session_id", sa.Text, nullable=False),
        sa.Column("topic", sa.Text, nullable=True),
        sa.Column("chunk_md", sa.Text, nullable=False),
        sa.Column("embedding", postgresql.VECTOR(1536), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_embeddings_session",
        "embeddings",
        ["session_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_embeddings_session", table_name="embeddings")
    op.drop_table("embeddings")
    op.drop_table("session_settings")
    op.drop_index("ix_pipeline_events_session", table_name="pipeline_events")
    op.drop_table("pipeline_events")
