"""Seed strictness profiles table."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_seed_profiles"
down_revision = "0002_pipeline_events"
branch_labels = None
depends_on = None

PROFILES = {
    "casual": {
        "ambiguity_threshold": 0.45,
        "citation_cutoff": 0.7,
        "consistency_tolerance": 0.8,
        "require_rollback": False,
        "mangekyo": "lenient",
    },
    "enterprise": {
        "ambiguity_threshold": 0.35,
        "citation_cutoff": 0.85,
        "consistency_tolerance": 0.85,
        "require_rollback": True,
        "mangekyo": "normal",
    },
    "security": {
        "ambiguity_threshold": 0.25,
        "citation_cutoff": 0.95,
        "consistency_tolerance": 0.92,
        "require_rollback": True,
        "mangekyo": "strict",
    },
}


def upgrade() -> None:
    op.create_table(
        "profiles",
        sa.Column("name", sa.Text, primary_key=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    connection = op.get_bind()
    for name, data in PROFILES.items():
        connection.execute(
            sa.text("INSERT INTO profiles (name, data) VALUES (:name, :data) ON CONFLICT (name) DO NOTHING"),
            {"name": name, "data": data},
        )


def downgrade() -> None:
    op.drop_table("profiles")
