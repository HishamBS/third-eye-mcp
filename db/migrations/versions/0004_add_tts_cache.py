"""Add TTS cache table."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0004_add_tts_cache"
down_revision = "0003_seed_profiles"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tts_cache",
        sa.Column("id", sa.BigInteger, primary_key=True),
        sa.Column("sha256", sa.Text, nullable=False, unique=True),
        sa.Column("eye", sa.Text, nullable=False),
        sa.Column("lang", sa.Text, nullable=False),
        sa.Column("voice", sa.Text, nullable=False),
        sa.Column("path", sa.Text, nullable=False),
        sa.Column("bytes", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tts_cache")
