import uuid
from datetime import datetime, timedelta

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.reading import PowerReading
from app.schemas.reading import ReadingIn


async def bulk_insert(session: AsyncSession, device_id: uuid.UUID, items: list[ReadingIn]) -> int:
    if not items:
        return 0
    rows = [{"device_id": device_id, "time": r.time, "power_w": r.power_w} for r in items]
    stmt = insert(PowerReading).values(rows).on_conflict_do_nothing()
    await session.execute(stmt)
    await session.commit()
    return len(rows)


BUCKETS = {
    "1 minute": timedelta(minutes=1),
    "10 minutes": timedelta(minutes=10),
    "1 hour": timedelta(hours=1),
    "1 day": timedelta(days=1),
}


async def bucketed(
    session: AsyncSession, device_id: uuid.UUID, start: datetime, end: datetime, bucket: str
):
    """Downsample with TimescaleDB time_bucket. Energy (Wh) = avg W * bucket hours."""
    q = text(
        """
        SELECT time_bucket(CAST(:bucket AS interval), time) AS bucket,
               avg(power_w) AS avg_power_w,
               max(power_w) AS max_power_w,
               avg(power_w) * extract(epoch FROM CAST(:bucket AS interval)) / 3600 AS energy_wh
        FROM power_readings
        WHERE device_id = :device_id AND time >= :start AND time < :end
        GROUP BY 1 ORDER BY 1
        """
    )
    res = await session.execute(
        q, {"bucket": BUCKETS[bucket], "device_id": device_id, "start": start, "end": end}
    )
    return res.mappings().all()
