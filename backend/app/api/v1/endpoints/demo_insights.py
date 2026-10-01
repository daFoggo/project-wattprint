"""Demo insights: what ran today (timeline) and what deserves attention (alerts).

Both are derived on the fly from the predicted series in the database; nothing is stored.
"""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.billing_params import plan_params
from app.api.v1.endpoints.demo import (
    INVALID,
    NOT_READY,
    _hid,
    _invalid,
    _names,
    _snap,
    _utc,
)
from app.billing.tariffs import Plan
from app.core.database import get_session
from app.schemas import insights as s
from app.services import insights as svc

router = APIRouter(prefix="/demo")


def _period_end() -> datetime:
    return _utc(datetime.fromisoformat(_snap()["household"]["period"]["end"])) + timedelta(
        minutes=1)


@router.get(
    "/timeline", response_model=s.TimelineOut, operation_id="getDemoTimeline",
    tags=["demo-insights"], summary="When each appliance ran on a day",
    description="Runs of every modelled appliance on one day: start, end, minutes, energy. A run "
                f"is a stretch above {svc.ON_W:.0f} W; pauses up to {svc.MAX_GAP_MIN} minutes do "
                f"not end it and runs under {svc.MIN_RUN_MIN} minutes are ignored. Appliances "
                "that did not run are left out. `until` cuts the day short (default: end of day).",
    responses={200: {"summary": "Runs per appliance"}, 404: NOT_READY, 422: INVALID},
)
async def get_timeline(
    day: date = Query(..., alias="date", description="`YYYY-MM-DD`"),
    until: datetime | None = Query(None, description="Exclusive; inside the day"),
    session: AsyncSession = Depends(get_session),
):
    start = _utc(datetime(day.year, day.month, day.day))
    end = start + timedelta(days=1)
    until = _utc(until) if until else end
    if not start < until <= end:
        raise _invalid(["query", "until"], "`until` must be inside the day")
    hid = await _hid(session)
    names = _names()
    items = []
    for key, pts in (await svc.minute_power(session, hid, start, until)).items():
        runs = svc.find_runs(pts)
        if not runs:
            continue
        items.append(s.ApplianceRuns(
            key=key, name=names.get(key, key), first_start=runs[0].start, last_end=runs[-1].end,
            run_count=len(runs), minutes=sum(r.minutes for r in runs),
            energy_kwh=round(sum(r.energy_wh for r in runs) / 1000, 3),
            runs=[s.RunOut(start=r.start, end=r.end, minutes=r.minutes,
                           energy_kwh=round(r.energy_wh / 1000, 3), peak_power_w=round(r.peak_w))
                  for r in runs]))
    items.sort(key=lambda x: x.first_start)
    return s.TimelineOut(household_id=hid, date=day, until=until, on_threshold_w=svc.ON_W,
                         items=items)


@router.get(
    "/alerts", response_model=s.AlertsOut, operation_id="listDemoAlerts",
    tags=["demo-insights"], summary="Alerts for the day so far",
    description="Short Vietnamese sentences worth the customer's attention at `asof`: the day "
                "against the same hours yesterday, how close the month is to the next tier (or the "
                "peak share of a time-of-use customer), the month forecast, a long air-conditioner "
                "run and an appliance that takes a large share of the day. Newest first. "
                "Without `asof`: the end of the recorded period.",
    responses={200: {"summary": "Alerts"}, 404: NOT_READY, 422: INVALID},
)
async def list_alerts(
    asof: datetime | None = Query(None, description="Day so far is computed up to here"),
    plan: Plan = Depends(plan_params),
    session: AsyncSession = Depends(get_session),
):
    asof = _utc(asof) if asof else _period_end()
    hid = await _hid(session)
    found = await svc.alerts(session, hid, asof, plan, _names())
    return s.AlertsOut(household_id=hid, asof=asof, items=[
        s.AlertOut(code=a.code, tone=a.tone, at=a.at, text=a.text, appliance=a.appliance)
        for a in found])
