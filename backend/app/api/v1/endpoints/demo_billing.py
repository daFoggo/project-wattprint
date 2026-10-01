"""Demo billing: what the demo household's consumption costs, computed by the billing engine.

A household is billed on the 6-tier residential tariff; a business or production customer on the
time-of-use tariff. The same consumption series is priced either way, so the app can show both.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.billing_params import bill, plan_params, tariff_info
from app.api.v1.endpoints.demo import INVALID, NOT_READY, _hid, _invalid, _snap, _utc
from app.billing import engine
from app.billing.tariffs import PERIODS, Plan
from app.core.database import get_session
from app.schemas import billing as s
from app.services import billing as svc

router = APIRouter(prefix="/demo")

PERIOD_NAMES = {"offpeak": "Thấp điểm", "normal": "Bình thường", "peak": "Cao điểm"}


def _tier_section(b: svc.MonthBill, plan: Plan) -> s.TierSection:
    t = plan.tier
    lowers = [0.0] + [x.upto for x in t.bands[:-1]]
    bands = [s.BandLine(index=u.index, name=u.band.name, from_kwh=lowers[u.index],
                        to_kwh=u.band.upto, price_vnd=u.band.price, kwh=round(u.kwh, 3),
                        cost_vnd=engine.round_vnd(u.cost)) for u in b.tier_uses]
    days = [s.TierDay(date=d.day, kwh=round(d.kwh, 3), cost_vnd=engine.round_vnd(d.cost),
                      segments=[s.DaySegment(band=u.index, kwh=round(u.kwh, 3)) for u in d.uses])
            for d in b.tier_days]
    st = b.status
    nxt = t.bands[st.next_index].name if st.next_index is not None else None
    return s.TierSection(
        bands=bands, daily=days,
        status=s.TierStatus(
            band_index=st.band_index, band_name=t.bands[st.band_index].name,
            headroom_kwh=None if st.headroom_kwh is None else round(st.headroom_kwh, 3),
            next_band_index=st.next_index, next_band_name=nxt, step_pct=st.step_pct,
            cross_day=st.cross_day))


def _tou_section(b: svc.MonthBill, plan: Plan) -> s.TouSection:
    total = sum(b.tou_kwh.values()) or 1.0
    periods = [s.PeriodLine(
        key=p, name=PERIOD_NAMES[p], hours=engine.describe_hours(plan.schedule, p),
        price_vnd=plan.tou.prices[p], kwh=round(b.tou_kwh[p], 3),
        share_pct=round(100 * b.tou_kwh[p] / total, 2),
        cost_vnd=engine.round_vnd(b.tou_kwh[p] * plan.tou.prices[p])) for p in PERIODS]
    sc = plan.schedule
    return s.TouSection(
        schedule=s.ScheduleInfo(id=sc.id, name=sc.name, source=sc.source,
                                effective_from=sc.effective_from),
        flat_price_vnd=plan.tou.flat_price, periods=periods,
        daily=[s.TouDay(date=d, kwh=round(sum(v.values()), 3),
                        by_period={p: round(x, 3) for p, x in v.items()})
               for d, v in sorted(b.tou_daily.items())])


@router.get(
    "/billing", response_model=s.BillingOut, operation_id="getDemoBilling",
    tags=["demo-billing"], summary="Bill of a month, to date and forecast",
    description="Prices one calendar month of the demo household up to `asof`, with the scheme "
                "that applies to the customer: **6 tiers** for a household (kWh and cost per "
                "band, bands per day, current band, headroom, day the next band is reached) or "
                "**time of use** for business/production (kWh, share and cost per period). "
                "Includes VAT and a forecast of the whole month at the average pace so far. "
                "Without parameters: the month of the suggested window, up to its end.",
    responses={200: {"summary": "Month bill"}, 404: NOT_READY, 422: INVALID},
)
async def get_billing(
    month: str | None = Query(None, pattern=r"^\d{4}-\d{2}$", description="`YYYY-MM`"),
    asof: datetime | None = Query(None, description=(
        "Price the month up to here, exclusive; inside the month. Default: the end of the "
        "month or of the recorded period, whichever is first")),
    plan: Plan = Depends(plan_params),
    session: AsyncSession = Depends(get_session),
):
    snap = _snap()["household"]
    first = _utc(datetime.fromisoformat(f"{month}-01" if month else snap["sample_window"]["start"]))
    start = svc.month_start(first)
    end_of_month = svc.next_month(start)
    period_end = _utc(datetime.fromisoformat(snap["period"]["end"])) + timedelta(minutes=1)
    asof = _utc(asof) if asof else min(end_of_month, period_end)
    if not start < asof <= end_of_month:
        raise _invalid(["query", "asof"], "`asof` must be inside the month")
    hid = await _hid(session)
    b = await svc.month_bill(session, hid, start, asof, plan)
    return s.BillingOut(
        household_id=hid, customer=plan.customer, scheme=plan.scheme, tariff=tariff_info(plan),
        month=f"{start.year}-{start.month:02d}", asof=asof, days_elapsed=round(b.days_elapsed, 3),
        days_in_month=b.days_in_month, kwh_to_date=round(b.kwh_to_date, 3),
        bill_to_date=bill(b.to_date),
        forecast=s.Forecast(kwh=round(b.forecast_kwh, 3), pace_kwh_per_day=round(b.pace, 3),
                            bill=bill(b.forecast)),
        tier=_tier_section(b, plan) if plan.scheme == "tier" else None,
        tou=_tou_section(b, plan) if plan.scheme == "tou" else None)
