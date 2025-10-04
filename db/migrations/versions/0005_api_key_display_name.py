"""Add display_name to api_keys."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0005_api_key_display_name"
down_revision = "0004_add_tts_cache"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("display_name", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("api_keys", "display_name")
