import csv
import io
import uuid
from collections import defaultdict
from datetime import datetime
from typing import BinaryIO

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Device, DeviceKind, PowerReading
from app.services.readings import BUCKETS

CHUNK = 8000  # rows per INSERT (3 bind params each, asyncpg limit is 32767)


async def _get_or_create(
    session: AsyncSession, name: str, kind: DeviceKind, parent_id: uuid.UUID | None
) -> Device:
    stmt = select(Device).where(Device.name == name, Device.kind == kind)
    stmt = stmt.where(Device.parent_id == parent_id if parent_id else Device.parent_id.is_(None))
    device = await session.scalar(stmt)
    if device is None:
        device = Device(name=name, kind=kind, parent_id=parent_id)
        session.add(device)
        await session.flush()
    return device


async def _upsert(session: AsyncSession, device_id: uuid.UUID, rows: list[tuple[datetime, float]]):
    values = [{"device_id": device_id, "time": t, "power_w": p} for t, p in rows]
    stmt = insert(PowerReading).values(values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["device_id", "time"], set_={"power_w": stmt.excluded.power_w}
    )
    await session.execute(stmt)


async def import_csv(session: AsyncSession, household: str, file: BinaryIO) -> tuple[Device, dict]:
    """CSV columns: time (ISO-8601), aggregate, then one column per appliance (incl. residual).

    `aggregate` is stored on the household device, every other column on a child appliance
    device. Re-importing the same file overwrites (upsert), so post-processing can be redone.
    """
    reader = csv.DictReader(io.TextIOWrapper(file, encoding="utf-8"))
    cols = reader.fieldnames or []
    if "time" not in cols or "aggregate" not in cols:
        raise ValueError("CSV needs 'time' and 'aggregate' columns")

    house = await _get_or_create(session, household, DeviceKind.aggregate, None)
    devices = {"aggregate": house}
    for c in cols:
        if c not in ("time", "aggregate"):
            devices[c] = await _get_or_create(session, c, DeviceKind.appliance, house.id)

    buf: dict[str, list] = defaultdict(list)
    counts: dict[str, int] = defaultdict(int)

    async def flush(col: str):
        if buf[col]:
            await _upsert(session, devices[col].id, buf[col])
            counts[col] += len(buf[col])
            buf[col] = []

    for row in reader:
        t = datetime.fromisoformat(row["time"].replace("Z", "+00:00"))
        for c, dev in devices.items():
            if row[c] not in ("", None):
                buf[c].append((t, float(row[c])))
                if len(buf[c]) >= CHUNK:
                    await flush(c)
    for c in devices:
        await flush(c)
    await session.commit()
    return house, dict(counts)


async def household_series(
    session: AsyncSession, household_id: uuid.UUID, start: datetime, end: datetime, bucket: str
):
    q = text(
        """
        SELECT d.id AS device_id, d.name, d.kind::text AS kind,
               time_bucket(CAST(:bucket AS interval), r.time) AS bucket,
               avg(r.power_w) AS avg_power_w, max(r.power_w) AS max_power_w,
               avg(r.power_w) * extract(epoch FROM CAST(:bucket AS interval)) / 3600 AS energy_wh
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE (d.id = :hid OR d.parent_id = :hid) AND r.time >= :start AND r.time < :end
        GROUP BY d.id, d.name, d.kind, 4 ORDER BY d.kind::text, d.name, 4
        """
    )
    res = await session.execute(
        q, {"bucket": BUCKETS[bucket], "hid": household_id, "start": start, "end": end}
    )
    series: dict[uuid.UUID, dict] = {}
    for r in res.mappings():
        s = series.setdefault(
            r["device_id"],
            {"device_id": r["device_id"], "name": r["name"], "kind": r["kind"], "points": []},
        )
        s["points"].append({k: r[k] for k in ("bucket", "avg_power_w", "max_power_w", "energy_wh")})
    out = list(series.values())

    energy = {s["name"]: sum(p["energy_wh"] for p in s["points"]) for s in out}
    agg = next((energy[s["name"]] for s in out if s["kind"] == "aggregate"), 0.0)
    totals = [
        {"name": s["name"], "energy_wh": energy[s["name"]],
         "share_pct": 100 * energy[s["name"]] / agg if agg else 0.0}
        for s in out if s["kind"] == "appliance"
    ]
    return out, totals

