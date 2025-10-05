"""Initial database schema."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "runs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("session_id", sa.Text(), nullable=True),
        sa.Column("tool", sa.Text(), nullable=False),
        sa.Column("eye", sa.Text(), nullable=True),
        sa.Column("code", sa.Text(), nullable=True),
        sa.Column("ok", sa.Boolean(), nullable=True),
        sa.Column("topic", sa.Text(), nullable=True),
        sa.Column("input_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("output_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "vectors",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("topic", sa.Text(), nullable=False),
        sa.Column("vector", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "claims",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("claim", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "api_keys",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("hashed_secret", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("limits_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("tenant", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_api_keys_tenant", "api_keys", ["tenant"])

    op.create_table(
        "docs",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("session_id", sa.Text(), nullable=False),
        sa.Column("bucket", sa.Text(), nullable=False),
        sa.Column("path", sa.Text(), nullable=False),
        sa.Column("bytes", sa.Integer(), nullable=False),
        sa.Column("tags", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("retained_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_docs_session", "docs", ["session_id"])

    op.create_table(
        "config_versions",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("author", sa.Text(), nullable=True),
        sa.Column("diff", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_config_versions_kind", "config_versions", ["kind"])

    op.create_table(
        "rate_counters",
        sa.Column("key", sa.Text(), primary_key=True),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "audit",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("actor", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("target", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("ip", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("audit")
    op.drop_table("rate_counters")
    op.drop_index("ix_config_versions_kind", table_name="config_versions")
    op.drop_table("config_versions")
    op.drop_index("ix_docs_session", table_name="docs")
    op.drop_table("docs")
    op.drop_index("ix_api_keys_tenant", table_name="api_keys")
    op.drop_table("api_keys")
    op.drop_table("claims")
    op.drop_table("vectors")
    op.drop_table("runs")
