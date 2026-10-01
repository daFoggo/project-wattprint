"""Experiments: what a habit change is worth for an appliance, and how it is going.

Both sides come from the appliance's own predicted series. The *baseline* is its typical day over
the weeks before `asof` (runs found like the timeline's). A template's saving is exact physics, not
a rule of thumb: minutes not run times the power the appliance draws while on, or runs not made
times the energy of a run. Progress compares each day since the start with that baseline.
"""
import uuid
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.tariffs import Plan
from app.schemas import experiments as s
from app.services import billing as billing_svc
from app.services import insights as insights_svc

DAY = timedelta(days=1)
MIN_BASELINE_MIN = 10  # below this minutes a day there is nothing worth cutting

SPEC = {
    "AC": dict(knob="minutes_per_day", unit_label="phút/ngày", lookback=7,
               title="Bớt giờ chạy điều hoà mỗi ngày",
               description="Tắt điều hoà sớm hơn hoặc bật muộn hơn, dùng quạt cho phần còn lại.",
               slider=(15, 180, 15, 60)),
    "WaterHeater": dict(knob="minutes_per_day", unit_label="phút/ngày", lookback=7,
                        title="Bớt thời gian bật bình nóng lạnh mỗi ngày",
                        description="Bật bình ngắn hơn hoặc chỉ bật trước khi dùng nước nóng.",
                        slider=(5, 60, 5, 15)),
    "WashingMachine": dict(knob="runs_per_week", unit_label="lần/tuần", lookback=28,
                           title="Gom đồ giặt thành ít lượt hơn",
                           description="Giặt đủ tải thay vì nhiều mẻ nhỏ.",
                           slider=(1, 3, 1, 1)),
}


async def _days(session: AsyncSession, hid: uuid.UUID, key: str, start: datetime, n: int,
                end: datetime | None = None) -> list[dict]:
    """kWh, minutes ON and runs of each of `n` days from `start` (up to `end`), computed in SQL."""
    end = min(end, start + n * DAY) if end else start + n * DAY
    q = text(
        """
        SELECT date_trunc('day', r.time) AS day, sum(r.power_w) / 60.0 / 1000 AS kwh
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE d.parent_id = :hid AND d.name = :key AND r.time >= :start AND r.time < :end
        GROUP BY 1
        """
    )
    kwh = {r["day"].date(): float(r["kwh"]) for r in (await session.execute(
        q, {"hid": hid, "key": key, "start": start, "end": end})).mappings()}
    by_day: dict[date, list[insights_svc.Run]] = defaultdict(list)
    for run in (await insights_svc.runs(session, hid, start, end, split_days=True)).get(key, []):
        by_day[run.start.date()].append(run)
    out = []
    for i in range(n):
        d = (start + i * DAY).date()
        runs = by_day.get(d, [])
        out.append(dict(date=d, kwh=kwh.get(d, 0.0), minutes=sum(r.minutes for r in runs),
                        runs=len(runs), on_wh=sum(r.energy_wh for r in runs)))
    return out


def _baseline(days: list[dict], lookback: int) -> s.Baseline:
    n = len(days) or 1
    minutes = sum(d["minutes"] for d in days)
    runs = sum(d["runs"] for d in days)
    on_kwh = sum(d["on_wh"] for d in days) / 1000
    return s.Baseline(
        lookback_days=lookback, kwh_per_day=round(sum(d["kwh"] for d in days) / n, 3),
        minutes_per_day=round(minutes / n, 1), runs_per_day=round(runs / n, 2),
        avg_power_w=round(on_kwh * 1000 / (minutes / 60)) if minutes else None,
        kwh_per_run=round(on_kwh / runs, 3) if runs else None)


def _price(plan: Plan, kwh_to_date: float) -> int:
    if plan.scheme == "tier":
        bands = plan.tier.bands
        band = next((b for b in bands if b.upto is None or kwh_to_date < b.upto), bands[-1])
        base = band.price
    else:
        base = plan.tou.prices["normal"]
    return round(base * (1 + plan.tariff.vat_rate))


async def _baseline_of(session: AsyncSession, hid: uuid.UUID, key: str, asof: datetime
                       ) -> s.Baseline:
    lookback = SPEC[key]["lookback"]
    end = datetime(asof.year, asof.month, asof.day, tzinfo=UTC)  # whole days before today
    start = end - lookback * DAY
    return _baseline(await _days(session, hid, key, start, lookback), lookback)


async def templates(session: AsyncSession, hid: uuid.UUID, asof: datetime, plan: Plan,
                    names: dict[str, str]) -> list[s.Template]:
    month = billing_svc.month_start(asof)
    kwh_to_date = await billing_svc.aggregate_wh(session, hid, month, asof) / 1000
    price = _price(plan, kwh_to_date)
    out = []
    for key, spec in SPEC.items():
        base = await _baseline_of(session, hid, key, asof)
        lo, hi, step, default = spec["slider"]
        if spec["knob"] == "minutes_per_day":
            hi = min(hi, int(base.minutes_per_day // step * step))
            per_unit = (base.avg_power_w or 0) / 1000 / 60
            ok = base.minutes_per_day >= MIN_BASELINE_MIN and hi >= lo
        else:
            weekly = base.runs_per_day * 7
            hi = min(hi, int(weekly))
            per_unit = (base.kwh_per_run or 0) / 7
            ok = weekly >= 1 and hi >= lo
        # a suggested cut is at most half of what the appliance does on a typical day
        half = int(((base.minutes_per_day if spec["knob"] == "minutes_per_day"
                     else base.runs_per_day * 7) / 2) // step * step)
        default = max(lo, min(default, hi, half)) if ok else lo
        out.append(s.Template(
            appliance=key, name=names.get(key, key), title=spec["title"],
            description=spec["description"], knob=spec["knob"], unit_label=spec["unit_label"],
            slider=s.Slider(min=lo, max=max(hi, lo), step=step, default=default),
            kwh_per_day_per_unit=round(per_unit, 5), vnd_per_kwh=price, baseline=base,
            available=ok))
    return out


async def progress(session: AsyncSession, hid: uuid.UUID, key: str, since: date, asof: datetime,
                   plan: Plan) -> s.ProgressOut:
    start = datetime(since.year, since.month, since.day, tzinfo=UTC)
    today = datetime(asof.year, asof.month, asof.day, tzinfo=UTC)
    n = max(int((today - start) / DAY) + 1, 1)
    base = await _baseline_of(session, hid, key, start)  # the days before the experiment began
    month = billing_svc.month_start(asof)
    price = _price(plan, await billing_svc.aggregate_wh(session, hid, month, asof) / 1000)
    days = await _days(session, hid, key, start, n, asof)
    out, saved = [], 0.0
    for d in days:
        complete = datetime(d["date"].year, d["date"].month, d["date"].day, tzinfo=UTC) + DAY <= asof
        if complete:
            saved += base.kwh_per_day - d["kwh"]
        out.append(s.Day(date=d["date"], kwh=round(d["kwh"], 3), minutes=d["minutes"],
                         runs=d["runs"], complete=complete))
    return s.ProgressOut(household_id=hid, appliance=key, since=since, asof=asof, baseline=base,
                         days=out, saved_kwh=round(saved, 3), saved_vnd=round(saved * price))


# ----------------------------------------------------------------------------- proposals
def _hm(minutes: float) -> str:
    h, m = divmod(round(minutes), 60)
    return f"{h} giờ {m:02d} phút" if h else f"{m} phút"


def _vn1(x: float) -> str:
    return f"{x:.1f}".replace(".", ",")


def _action(t: s.Template, amount: int) -> s.Action:
    return s.Action(appliance=t.appliance, name=t.name, knob=t.knob, unit_label=t.unit_label,
                    amount=amount, slider=t.slider, kwh_per_day_per_unit=t.kwh_per_day_per_unit,
                    saves_kwh_per_day=round(amount * t.kwh_per_day_per_unit, 3))


def _impact(actions: list[s.Action], price: int) -> s.Impact:
    per_day = sum(a.saves_kwh_per_day for a in actions)
    return s.Impact(kwh_per_day=round(per_day, 3), kwh_per_month=round(per_day * 30, 1),
                    vnd_per_month=round(per_day * 30 * price))


def _reason(t: s.Template) -> str:
    b = t.baseline
    if t.knob == "minutes_per_day":
        power = f", công suất {round(b.avg_power_w)} W khi bật" if b.avg_power_w else ""
        return (f"{t.name} chạy trung bình {_hm(b.minutes_per_day)} mỗi ngày trong "
                f"{b.lookback_days} ngày qua, dùng {_vn1(b.kwh_per_day)} kWh/ngày{power}.")
    return (f"{t.name} chạy {_vn1(b.runs_per_day * 7)} lượt mỗi tuần, mỗi lượt "
            f"{(b.kwh_per_run or 0):.2f} kWh.".replace(".", ","))


async def proposals(session: AsyncSession, hid: uuid.UUID, asof: datetime, plan: Plan,
                    names: dict[str, str]) -> s.ProposalsOut:
    """Single-appliance proposals plus scenarios that run several of them together."""
    items = [t for t in await templates(session, hid, asof, plan, names) if t.available]
    price = items[0].vnd_per_kwh if items else 0
    out: list[s.Proposal] = []
    for t in items:
        acts = [_action(t, t.slider.default)]
        out.append(s.Proposal(
            id=f"single-{t.appliance}", kind="single", title=t.title, summary=t.description,
            reason=_reason(t), appliances=[t.appliance], actions=acts,
            impact=_impact(acts, price)))
    if len(items) >= 2:
        label = " và ".join(t.name.lower() for t in items)
        for sid, title, pick, tail in (
                ("balanced", "Gói tiết kiệm cân bằng", lambda t: t.slider.default,
                 "ở mức vừa phải"),
                ("max", "Gói tiết kiệm tối đa", lambda t: t.slider.max, "hết mức có thể")):
            acts = [_action(t, pick(t)) for t in items]
            out.append(s.Proposal(
                id=f"scenario-{sid}", kind="scenario", title=title,
                summary=f"Giảm {label} cùng lúc, {tail}.",
                reason=f"Kết hợp {len(items)} thiết bị dùng nhiều điện nhất trong "
                       f"{SPEC['AC']['lookback']} ngày qua; mỗi mức đều tính từ công suất đo được.",
                appliances=[t.appliance for t in items], actions=acts,
                impact=_impact(acts, price)))
    out.sort(key=lambda p: p.impact.vnd_per_month, reverse=True)
    # the one to demo first: a realistic scenario beats the maximum one
    pick = next((p for p in out if p.id == "scenario-balanced"), out[0] if out else None)
    if pick:
        out.remove(pick)
        out.insert(0, pick.model_copy(update={"featured": True}))
    return s.ProposalsOut(household_id=hid, asof=asof, vnd_per_kwh=price,
                          baselines={t.appliance: t.baseline for t in items}, items=out)
