"""Prices the imported household series with the billing engine.

Queries return energy per device (kWh from 1-minute power readings); `app.billing.engine` does the
arithmetic. Timestamps are read as local wall-clock time (the dataset's own clock, served as UTC):
the tariff's hours and the billing month are applied to it as they are.
"""
import uuid
from calendar import monthrange
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing import engine
from app.billing.engine import Money
from app.billing.tariffs import PERIODS, Period, Plan

SLOT = timedelta(minutes=30)  # every tariff boundary falls on a half hour


def month_start(at: datetime) -> datetime:
    return datetime(at.year, at.month, 1, tzinfo=UTC)


def next_month(at: datetime) -> datetime:
    return datetime(at.year + at.month // 12, at.month % 12 + 1, 1, tzinfo=UTC)


# ------------------------------------------------------------------------------ queries
async def monthly_wh(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime):
    """Energy (Wh) per device and calendar month."""
    q = text(
        """
        SELECT d.name, d.kind::text AS kind,
               date_trunc('month', r.time AT TIME ZONE 'UTC') AS month,
               sum(r.power_w) / 60.0 AS wh
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE (d.id = :hid OR d.parent_id = :hid) AND r.time >= :start AND r.time < :end
        GROUP BY 1, 2, 3
        """
    )
    return (await session.execute(q, {"hid": hid, "start": start, "end": end})).mappings().all()


async def aggregate_wh(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime
                       ) -> float:
    q = text("SELECT coalesce(sum(power_w), 0) / 60.0 FROM power_readings "
             "WHERE device_id = :hid AND time >= :start AND time < :end")
    return float(await session.scalar(q, {"hid": hid, "start": start, "end": end}))


async def slot_wh(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime):
    """Energy (Wh) per device and half hour; `slot` is the local wall-clock start."""
    q = text(
        """
        SELECT d.name, d.kind::text AS kind,
               time_bucket(CAST(:slot AS interval), r.time) AT TIME ZONE 'UTC' AS slot,
               sum(r.power_w) / 60.0 AS wh
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE (d.id = :hid OR d.parent_id = :hid) AND r.time >= :start AND r.time < :end
        GROUP BY 1, 2, 3 ORDER BY 3
        """
    )
    return (await session.execute(q, {"slot": SLOT, "hid": hid, "start": start, "end": end})
            ).mappings().all()


# ----------------------------------------------------------------------------- a window
@dataclass(frozen=True)
class WindowCost:
    money: Money
    kwh: float
    per_device: dict[str, int]  # total VND (with VAT) per appliance; adds up to money.total


async def window_cost(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime,
                      plan: Plan, rows=None) -> WindowCost:
    """What the window costs the customer.

    6 tiers: the window's kWh are priced after whatever the same month already used (so a day in
    the middle of the month sits in its own band); the bill is shared among appliances in
    proportion to their kWh. TOU: each appliance's kWh are priced by when it ran, and the bill
    is shared in proportion to those costs, so a water heater that runs at peak costs more.

    `rows` (half-hour rows from `slot_wh`, starting at or before the first day of the window's
    month) save the database round trips when the caller already has them.
    """
    if rows is not None:
        return _window_cost_from_rows(rows, start, end, plan)
    if plan.scheme == "tier":
        rows = await monthly_wh(session, hid, start, end)
        by_month: dict[datetime, float] = defaultdict(float)
        device_kwh: dict[str, float] = defaultdict(float)
        for r in rows:
            if r["kind"] == "aggregate":
                by_month[r["month"].replace(tzinfo=UTC)] += r["wh"] / 1000
            else:
                device_kwh[r["name"]] += r["wh"] / 1000
        total, first = Money(0, 0, 0), month_start(start)
        for m in sorted(by_month):
            before = await aggregate_wh(session, hid, m, start) / 1000 if m == first else 0.0
            total = engine.add(total, engine.tier_bill(before, by_month[m], plan.tier).money)
        return WindowCost(total, sum(by_month.values()),
                          engine.allocate(total.total, device_kwh))

    rows = await slot_wh(session, hid, start, end)
    agg = [(r["slot"], r["wh"] / 1000) for r in rows if r["kind"] == "aggregate"]
    bill = engine.tou_bill(agg, plan.tou, plan.schedule)
    weight: dict[str, float] = {}
    for name in {r["name"] for r in rows if r["kind"] != "aggregate"}:
        own = [(r["slot"], r["wh"] / 1000) for r in rows if r["name"] == name]
        weight[name] = engine.tou_bill(own, plan.tou, plan.schedule).money.subtotal
    return WindowCost(bill.money, sum(bill.kwh.values()), engine.allocate(bill.money.total, weight))


def _window_cost_from_rows(rows, start: datetime, end: datetime, plan: Plan) -> WindowCost:
    """`window_cost` from half-hour rows that cover the month up to `end`; no queries."""
    inside = [r for r in rows if start <= r["slot"].replace(tzinfo=UTC) < end]
    if plan.scheme == "tier":
        by_month: dict[datetime, float] = defaultdict(float)
        device_kwh: dict[str, float] = defaultdict(float)
        for r in inside:
            if r["kind"] == "aggregate":
                by_month[datetime(r["slot"].year, r["slot"].month, 1, tzinfo=UTC)] += r["wh"] / 1000
            else:
                device_kwh[r["name"]] += r["wh"] / 1000
        first = month_start(start)
        before = sum(r["wh"] for r in rows if r["kind"] == "aggregate"
                     and first <= r["slot"].replace(tzinfo=UTC) < start) / 1000
        total = Money(0, 0, 0)
        for m in sorted(by_month):
            total = engine.add(total, engine.tier_bill(before if m == first else 0.0,
                                                       by_month[m], plan.tier).money)
        return WindowCost(total, sum(by_month.values()), engine.allocate(total.total, device_kwh))

    agg = [(r["slot"], r["wh"] / 1000) for r in inside if r["kind"] == "aggregate"]
    bill = engine.tou_bill(agg, plan.tou, plan.schedule)
    weight: dict[str, float] = {}
    for name in {r["name"] for r in inside if r["kind"] != "aggregate"}:
        own = [(r["slot"], r["wh"] / 1000) for r in inside if r["name"] == name]
        weight[name] = engine.tou_bill(own, plan.tou, plan.schedule).money.subtotal
    return WindowCost(bill.money, sum(bill.kwh.values()), engine.allocate(bill.money.total, weight))


# ------------------------------------------------------------------------- a billing month
@dataclass(frozen=True)
class MonthBill:
    days_elapsed: float
    days_in_month: int
    kwh_to_date: float
    pace: float  # kWh a day so far
    forecast_kwh: float
    to_date: Money
    forecast: Money
    daily: list[tuple[date, float]]  # kWh per day, days with data only
    # 6 tiers
    tier_uses: list[engine.BandUse] | None = None
    tier_days: list[engine.TierDay] | None = None
    status: engine.TierStatus | None = None
    # TOU
    tou_kwh: dict[Period, float] | None = None
    tou_forecast_kwh: dict[Period, float] | None = None
    tou_daily: dict[date, dict[Period, float]] | None = None


async def month_bill(session: AsyncSession, hid: uuid.UUID, month: datetime, asof: datetime,
                     plan: Plan) -> MonthBill:
    """Month to date (`month` .. `asof`) and its forecast at the average pace so far."""
    days_in_month = monthrange(month.year, month.month)[1]
    elapsed = min(max((asof - month) / timedelta(days=1), 1e-9), days_in_month)
    rows = await slot_wh(session, hid, month, asof)
    agg = [(r["slot"], r["wh"] / 1000) for r in rows if r["kind"] == "aggregate"]
    per_day: dict[date, float] = defaultdict(float)
    for at, kwh in agg:
        per_day[at.date()] += kwh
    daily = sorted(per_day.items())
    kwh = sum(per_day.values())
    forecast_kwh = engine.pace_forecast(kwh, elapsed, days_in_month)
    common = {"days_elapsed": elapsed, "days_in_month": days_in_month, "kwh_to_date": kwh,
              "pace": kwh / elapsed, "forecast_kwh": forecast_kwh, "daily": daily}

    if plan.scheme == "tier":
        now = engine.tier_bill(0, kwh, plan.tier)
        return MonthBill(
            to_date=now.money, forecast=engine.tier_bill(0, forecast_kwh, plan.tier).money,
            tier_uses=now.uses, tier_days=engine.tier_days(daily, plan.tier),
            status=engine.tier_status(kwh, elapsed, days_in_month, plan.tier), **common)

    used = engine.tou_kwh(agg, plan.schedule)
    scale = days_in_month / elapsed
    projected = {p: used[p] * scale for p in PERIODS}
    by_day: dict[date, dict[Period, float]] = defaultdict(lambda: dict.fromkeys(PERIODS, 0.0))
    for at, k in agg:
        by_day[at.date()][engine.classify(at, plan.schedule)] += k
    return MonthBill(
        to_date=engine.tou_bill_from_kwh(used, plan.tou).money,
        forecast=engine.tou_bill_from_kwh(projected, plan.tou).money,
        tou_kwh=used, tou_forecast_kwh=projected, tou_daily=dict(by_day), **common)
