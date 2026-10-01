"""Demo queries on the imported household series (1-minute predicted readings)."""
import uuid
from datetime import datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Device, DeviceKind
from app.services.readings import BUCKETS


async def household_id(session: AsyncSession, name: str) -> uuid.UUID | None:
    return await session.scalar(
        select(Device.id).where(Device.name == name, Device.kind == DeviceKind.aggregate,
                                Device.parent_id.is_(None)))


async def series(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime,
                 bucket: str):
    """Per device and bucket. Energy counts only the minutes present (no gap filling)."""
    q = text(
        """
        SELECT d.name, d.kind::text AS kind,
               time_bucket(CAST(:bucket AS interval), r.time) AS time,
               avg(r.power_w) AS avg_power_w, max(r.power_w) AS max_power_w,
               sum(r.power_w) / 60.0 AS energy_wh,
               count(*) / (extract(epoch FROM CAST(:bucket AS interval)) / 60) AS coverage
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE (d.id = :hid OR d.parent_id = :hid) AND r.time >= :start AND r.time < :end
        GROUP BY 1, 2, 3 ORDER BY 2, 1, 3
        """
    )
    res = await session.execute(q, {"bucket": BUCKETS[bucket], "hid": hid, "start": start,
                                    "end": end})
    return res.mappings().all()


async def energy(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime):
    """Energy (Wh) per device over the window."""
    q = text(
        """
        SELECT d.name, d.kind::text AS kind, sum(r.power_w) / 60.0 AS energy_wh
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE (d.id = :hid OR d.parent_id = :hid) AND r.time >= :start AND r.time < :end
        GROUP BY 1, 2
        """
    )
    res = await session.execute(q, {"hid": hid, "start": start, "end": end})
    return res.mappings().all()
