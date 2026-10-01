"""Demo usage: a day, week or month of consumption with its cost, and one appliance of it.

Everything is derived from the imported series and the billing engine; nothing is stored.
"""
from datetime import UTC, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.billing_params import plan_params, tariff_info
from app.api.v1.endpoints.demo import INVALID, NOT_READY, _hid, _names, _snap, _totals, _utc
from app.billing import engine
from app.billing.tariffs import Plan
from app.core.database import get_session
from app.schemas import usage as s
from app.services import billing as billing_svc
from app.services import insights as insights_svc
from app.services import usage as svc

router = APIRouter(prefix="/demo")

RANGE = Query(..., description="`day`, `week` (Monday to Sunday) or `month` (calendar)")
ASOF = Query(None, description="\"Now\": the period containing it is cut here. Default: the end "
                               "of the recorded period")
OFFSET = Query(0, le=0, ge=-60, description="0 = the period of `asof`, -1 the one before, ...")
RECENT_RUNS = 5
ApplianceKey = Literal["AC", "WaterHeater", "Fridge", "WashingMachine", "Other"]


def _asof(asof: datetime | None) -> datetime:
    if asof:
        return _utc(asof)
    end = _snap()["household"]["period"]["end"]
    return _utc(datetime.fromisoformat(end)) + timedelta(minutes=1)


def _period(p: svc.Period) -> s.PeriodOut:
    return s.PeriodOut(start=p.start, end=p.end, until=p.until, complete=p.complete)


def _pct(now: float, before: float) -> float | None:
    return round(100 * (now - before) / before, 1) if before > 0 else None


@router.get(
    "/usage", response_model=s.UsageOut, operation_id="getDemoUsage", tags=["demo-usage"],
    summary="Consumption and cost of a day, week or month",
    description="The period of `asof` (or `offset` periods back) cut at `asof`: total kWh and "
                "cost, the same against the previous period over the same elapsed time, a "
                "forecast of the whole period, buckets for a bar chart (3 hours for a day, 1 day "
                "for a week or month; each with the previous period's bucket and how its kWh and "
                "cost fall in the tiers or time-of-use periods), the share and cost of every "
                "appliance, and a sentence about what changed. Bucket and appliance costs add up "
                "to the total.",
    responses={200: {"summary": "Usage of a period"}, 404: NOT_READY, 422: INVALID},
)
async def get_usage(
    range: svc.Range = RANGE, asof: datetime | None = ASOF, offset: int = OFFSET,
    plan: Plan = Depends(plan_params), session: AsyncSession = Depends(get_session),
):
    cur = svc.period_of(range, _asof(asof), offset)
    prev = svc.previous_of(cur)
    hid = await _hid(session)
    names = _names()
    now = await svc.priced(session, hid, cur, plan)

    # the previous period's buckets are shown whole, for the comparison line; the rows up to
    # the cut are the same rows, so one query serves both
    prev_whole = svc.Period(prev.range, prev.start, prev.end, prev.end)
    prev_rows = await svc.month_rows(session, hid, prev_whole)
    before = await svc.priced(
        session, hid, prev, plan,
        [r for r in prev_rows if r["slot"].replace(tzinfo=UTC) < prev.until])
    prev_full = svc.price_buckets(prev_rows, prev_whole, plan)

    costs = svc.share_out(now.cost.money.total, [b.subtotal for b in now.buckets])
    # the previous period, whole: its bill is the sum of its buckets' subtotals plus VAT
    prev_costs = svc.share_out(
        engine.money(sum(b.subtotal for b in prev_full), plan.tariff.vat_rate).total,
        [b.subtotal for b in prev_full])
    buckets = []
    for i, b in enumerate(now.buckets):
        seg_costs = svc.share_out(costs[i], [p.cost for p in b.parts.values()])
        buckets.append(s.Bucket(
            start=b.start, kwh=round(b.kwh, 3), cost_vnd=costs[i],
            previous_kwh=round(prev_full[i].kwh, 3) if i < len(prev_full) else None,
            previous_cost_vnd=prev_costs[i] if i < len(prev_full) else None,
            segments=[s.Segment(key=p.key, label=p.label, price_vnd=p.price, kwh=round(p.kwh, 3),
                                cost_vnd=c)
                      for p, c in zip(b.parts.values(), seg_costs, strict=True)]))

    t = _totals(svc.energy_rows(now.rows, cur), names)
    for item in t["items"]:
        item["cost_vnd"] = now.cost.per_device.get(item["key"], 0)

    fc = None
    if not cur.complete:
        month_before = (await billing_svc.aggregate_wh(
            session, hid, billing_svc.month_start(cur.start), cur.start)) / 1000 \
            if plan.scheme == "tier" else 0.0
        kwh_f, cost_f = svc.forecast(now, plan, month_before)
        fc = s.Forecast(kwh=round(kwh_f, 3), cost_vnd=cost_f)

    kwh, before_kwh = now.cost.kwh, before.cost.kwh
    return s.UsageOut(
        household_id=hid, range=range, offset=offset, period=_period(cur), previous=_period(prev),
        customer=plan.customer, scheme=plan.scheme, tariff=tariff_info(plan), kwh=round(kwh, 3),
        cost_vnd=now.cost.money.total, previous_kwh=round(before_kwh, 3),
        previous_cost_vnd=before.cost.money.total, delta_pct=_pct(kwh, before_kwh), forecast=fc,
        buckets=buckets, devices=t["items"],
        insight=s.Insight(**await svc.insight(session, hid, cur, prev, names, offset,
                                              now.rows, before.rows)))


@router.get(
    "/usage/devices/{key}", response_model=s.DeviceUsageOut, operation_id="getDemoDeviceUsage",
    tags=["demo-usage"], summary="Consumption and cost of one appliance",
    description="One appliance over the same period as `/demo/usage`: kWh, its part of the bill, "
                "share of the house, change against the previous period, how often and how long "
                "it ran, one bucket per 3 hours (day) or 1 day (week, month) and a sentence about "
                "it. `runs` is `null` for `Other`.",
    responses={200: {"summary": "Usage of an appliance"}, 404: NOT_READY, 422: INVALID},
)
async def get_device_usage(
    key: ApplianceKey = Path(description="Appliance key as in `/demo/breakdown`"),
    range: svc.Range = RANGE, asof: datetime | None = ASOF, offset: int = OFFSET,
    plan: Plan = Depends(plan_params), session: AsyncSession = Depends(get_session),
):
    cur = svc.period_of(range, _asof(asof), offset)
    prev = svc.previous_of(cur)
    prev_whole = svc.Period(prev.range, prev.start, prev.end, prev.end)
    hid = await _hid(session)
    name = _names().get(key, key)
    now = await svc.priced(session, hid, cur, plan)
    before = await svc.priced(session, hid, prev, plan)
    prev_rows = await svc.month_rows(session, hid, prev_whole)

    kwh_b, weight = svc.appliance_buckets(now.rows, cur, key, plan)
    prev_kwh_b, _ = svc.appliance_buckets(prev_rows, prev_whole, key, plan)
    total_cost = now.cost.per_device.get(key, 0)
    costs = svc.share_out(total_cost, weight)

    kwh = sum(kwh_b)
    before_kwh = sum(svc.appliance_buckets(before.rows, prev, key, plan)[0])
    house = now.cost.kwh

    runs, recent = None, []
    if key != "Other":
        found = (await insights_svc.runs(session, hid, cur.start, cur.until)).get(key, [])
        minutes = sum(r.minutes for r in found)
        on_kwh = sum(r.energy_wh for r in found) / 1000
        runs = s.DeviceRuns(
            count=len(found), minutes=minutes,
            avg_power_w=round(on_kwh * 1000 / (minutes / 60)) if minutes else None,
            peak_power_w=round(max((r.peak_w for r in found), default=0)) or None)
        recent = [s.RunOut(start=r.start, end=r.end, minutes=r.minutes,
                           energy_kwh=round(r.energy_wh / 1000, 3), peak_power_w=round(r.peak_w))
                  for r in reversed(found[-RECENT_RUNS:])]

    note = _note(name, kwh, before_kwh, house, runs, plan, key, total_cost)
    return s.DeviceUsageOut(
        household_id=hid, key=key, name=name, range=range, offset=offset, period=_period(cur),
        kwh=round(kwh, 3), cost_vnd=total_cost,
        share_pct=round(100 * kwh / house, 2) if house else 0.0,
        previous_kwh=round(before_kwh, 3), delta_pct=_pct(kwh, before_kwh),
        average_power_w=round(kwh * 1000 / (cur.elapsed / timedelta(hours=1))), runs=runs,
        recent_runs=recent,
        buckets=[s.DeviceBucket(
            start=cur.start + i * cur.step, kwh=round(k, 3), cost_vnd=costs[i],
            previous_kwh=round(prev_kwh_b[i], 3) if i < len(prev_kwh_b) else None)
            for i, k in enumerate(kwh_b)],
        note=note)


def _note(name: str, kwh: float, before: float, house: float, runs: s.DeviceRuns | None,
          plan: Plan, key: str, cost: int) -> str:
    vn = svc._vn
    if kwh <= 0:
        return f"{name} không có điện tiêu thụ trong kỳ này."
    parts = [f"{name} dùng {vn(kwh)} kWh, chiếm {round(100 * kwh / house) if house else 0}% "
             f"điện cả nhà, tương ứng {vn(cost, 0)} đ"]
    if before > 0:
        d = round(100 * (kwh - before) / before)
        parts.append(f"{'tăng' if d > 0 else 'giảm'} {abs(d)}% so với kỳ trước" if d
                     else "tương đương kỳ trước")
    note = ", ".join(parts) + "."
    if runs and runs.count:
        note += f" Máy chạy {runs.count} lần, tổng {svc._hm(runs.minutes)}"
        if runs.avg_power_w:
            note += f", công suất trung bình khi chạy {vn(runs.avg_power_w, 0)} W"
        note += "."
    if plan.scheme == "tou" and key != "Other":
        note += " Dịch chuyển phụ tải khỏi giờ cao điểm sẽ giảm tiền điện của thiết bị này."
    return note

