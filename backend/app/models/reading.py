import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PowerReading(Base):
    """Time-series table; converted to a TimescaleDB hypertable by migration 0001."""

    __tablename__ = "power_readings"

    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), primary_key=True
    )
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    power_w: Mapped[float] = mapped_column(Float)
