"""initial schema + TimescaleDB hypertable

Revision ID: 0001
Revises:
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    device_kind = postgresql.ENUM("aggregate", "appliance", name="device_kind", create_type=False)
    device_kind.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("kind", device_kind, nullable=False),
        sa.Column(
            "parent_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_table(
        "power_readings",
        sa.Column(
            "device_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("devices.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("power_w", sa.Float, nullable=False),
        sa.PrimaryKeyConstraint("device_id", "time"),
    )
    op.execute(
        "SELECT create_hypertable('power_readings', 'time', chunk_time_interval => INTERVAL '7 days')"
    )


def downgrade() -> None:
    op.drop_table("power_readings")
    op.drop_table("devices")
    op.execute("DROP TYPE IF EXISTS device_kind")
