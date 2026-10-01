"""Usage of a day, week or month: bucketed energy with its cost, and the same per appliance.

A *period* is a calendar day, a Monday-to-Sunday week or a calendar month, `offset` periods back
from the one that contains `asof`. The current one is cut at `asof`; earlier ones are whole. Its
buckets are 3 hours (day) or 1 day (week, month). Everything reads the half-hour energy of the
imported series, so the figures agree with `/demo/breakdown` and `/demo/billing`.

Cost of a bucket follows the customer's scheme: on 6 tiers a bucket sits in the bands the month
had reached when it began; on time of use each half hour is priced by its period. Bucket costs
are shared out of the window's bill (`billing.window_cost`) so they add up to it exactly.
"""
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.billing import engine
from app.billing.tariffs import PERIODS, Plan
from app.services import billing as billing_svc
from app.services import demo as demo_svc
from app.services import insights as insights_svc

Range = Literal["day", "week", "month"]
DAY = timedelta(days=1)
PERIOD_NAMES = {"offpeak": "Thấp điểm", "normal": "Bình thường", "peak": "Cao điểm"}
MODELLED = ("AC", "WaterHeater", "Fridge", "WashingMachine")
CHANGE_PCT = 5  # below this a period counts as unchanged


@dataclass(frozen=True)
class Period:
    range: Range
    start: datetime
    end: datetime  # exclusive, the whole period
    until: datetime  # exclusive, what has happened so far (== end for a past period)

    @property
    def step(self) -> timedelta:
        return timedelta(hours=3) if self.range == "day" else DAY

    @property
    def n_buckets(self) -> int:
        return round((self.end - self.start) / self.step)

    @property
    def complete(self) -> bool:
        return self.until >= self.end

    @property
    def elapsed(self) -> timedelta:
        return self.until - self.start


def _month_shift(at: datetime, months: int) -> datetime:
    i = at.year * 12 + at.month - 1 + months
    return datetime(i // 12, i % 12 + 1, 1, tzinfo=UTC)


def period_of(range_: Range, asof: datetime, offset: int = 0) -> Period:
    day = datetime(asof.year, asof.month, asof.day, tzinfo=UTC)
    if range_ == "day":
        start = day + offset * DAY
        end = start + DAY
    elif range_ == "week":
        start = day - timedelta(days=day.weekday()) + offset * 7 * DAY
        end = start + 7 * DAY
    else:
        start = _month_shift(day.replace(day=1), offset)
        end = _month_shift(start, 1)
    until = min(max(asof, start + timedelta(minutes=1)), end) if offset == 0 else end
    return Period(range_, start, end, until)


def previous_of(p: Period) -> Period:
    """The period before, cut at the same elapsed time so the two compare like for like."""
    if p.range == "day":
        start = p.start - DAY
    elif p.range == "week":
        start = p.start - 7 * DAY
    else:
        start = _month_shift(p.start, -1)
    return Period(p.range, start, p.start, min(start + p.elapsed, p.start))


# ------------------------------------------------------------------------------- pricing
@dataclass
class Part:
    key: str
    label: str
    price: int
    kwh: float = 0.0
    cost: float = 0.0  # before VAT


@dataclass
class BucketData:
    start: datetime
    kwh: float = 0.0
    parts: dict[str, Part] = field(default_factory=dict)

    @property
    def subtotal(self) -> float:
        return sum(p.cost for p in self.parts.values())


def _bucket_index(p: Period, slot: datetime) -> int | None:
    if not p.start <= slot < p.until:
        return None
    i = int((slot - p.start) / p.step)
    return i if i < p.n_buckets else None


def price_buckets(rows, p: Period, plan: Plan) -> list[BucketData]:
    """Aggregate half-hour rows (from the first of the month on) into priced buckets."""
    out = [BucketData(p.start + i * p.step) for i in range(p.n_buckets)]
    agg = sorted((r["slot"].replace(tzinfo=UTC), r["wh"] / 1000)
                 for r in rows if r["kind"] == "aggregate")
    cum, month = 0.0, None
    for slot, kwh in agg:
        if month != (slot.year, slot.month):  # the tiers start over every month
            month, cum = (slot.year, slot.month), 0.0
        i = _bucket_index(p, slot)
        if i is not None:
            b = out[i]
            b.kwh += kwh
            if plan.scheme == "tier":
                for u in engine.band_uses(cum, kwh, plan.tier):
                    if u.kwh > 0:
                        part = b.parts.setdefault(
                            f"band-{u.index}", Part(f"band-{u.index}", u.band.name, u.band.price))
                        part.kwh += u.kwh
                        part.cost += u.cost
            else:
                key = engine.classify(slot.replace(tzinfo=None), plan.schedule)
                price = plan.tou.prices[key]
                part = b.parts.setdefault(key, Part(key, PERIOD_NAMES[key], price))
                part.kwh += kwh
                part.cost += kwh * price
        cum += kwh
    if plan.scheme == "tou":  # fixed order, so every bucket stacks the same way
        for b in out:
            b.parts = {k: b.parts[k] for k in PERIODS if k in b.parts}
    return out


async def month_rows(session: AsyncSession, hid: uuid.UUID, p: Period):
    return await billing_svc.slot_wh(session, hid, billing_svc.month_start(p.start), p.until)


@dataclass(frozen=True)
class Priced:
    period: Period
    buckets: list[BucketData]
    cost: billing_svc.WindowCost
    rows: list


async def priced(session: AsyncSession, hid: uuid.UUID, p: Period, plan: Plan,
                 rows=None) -> Priced:
    """`rows` (from `month_rows`) skip the query when the caller has them already."""
    if rows is None:
        rows = await month_rows(session, hid, p)
    return Priced(p, price_buckets(rows, p, plan),
                  await billing_svc.window_cost(session, hid, p.start, p.until, plan, rows), rows)


def energy_rows(rows, p: Period) -> list[dict]:
    """Energy (Wh) per device over `p` from half-hour rows: same shape as `demo_svc.energy`."""
    acc: dict[tuple[str, str], float] = {}
    for r in rows:
        if p.start <= r["slot"].replace(tzinfo=UTC) < p.until:
            key = (r["name"], r["kind"])
            acc[key] = acc.get(key, 0.0) + r["wh"]
    return [{"name": n, "kind": k, "energy_wh": wh} for (n, k), wh in acc.items()]


def share_out(total: int, weights: list[float]) -> list[int]:
    """`total` split in proportion to `weights`, adding up exactly."""
    parts = engine.allocate(total, {str(i): w for i, w in enumerate(weights)})
    return [parts[str(i)] for i in range(len(weights))]


# --------------------------------------------------------------------------- forecast
def forecast(pr: Priced, plan: Plan, before_kwh: float) -> tuple[float, int]:
    """Whole period at the pace so far: kWh and cost with VAT."""
    p = pr.period
    kwh = sum(b.kwh for b in pr.buckets)
    factor = (p.end - p.start) / p.elapsed
    if plan.scheme == "tier":
        total_kwh = kwh * factor
        return total_kwh, engine.tier_bill(before_kwh, total_kwh, plan.tier).money.total
    used = dict.fromkeys(PERIODS, 0.0)
    for b in pr.buckets:
        for k, part in b.parts.items():
            used[k] += part.kwh
    scaled = {k: v * factor for k, v in used.items()}
    return kwh * factor, engine.tou_bill_from_kwh(scaled, plan.tou).money.total


# ----------------------------------------------------------------------------- insight
def _label(range_: Range, offset: int, previous: bool) -> str:
    if previous:
        return {"day": "hôm qua", "week": "tuần trước", "month": "tháng trước"}[range_] \
            if offset == 0 else "kỳ trước"
    return {"day": "hôm nay", "week": "tuần này", "month": "tháng này"}[range_] \
        if offset == 0 else "kỳ này"


def _vn(x: float, digits: int = 1) -> str:
    return f"{x:,.{digits}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def _hm(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{h} giờ {m:02d} phút" if h else f"{m} phút"


async def insight(session: AsyncSession, hid: uuid.UUID, cur: Period, prev: Period,
                  names: dict[str, str], offset: int, rows_cur=None, rows_prev=None) -> dict:
    """One question and a sentence about what changed, from the appliances' own energy."""
    now_label, before_label = _label(cur.range, offset, False), _label(cur.range, offset, True)

    async def by_appliance(p: Period, have=None) -> dict[str, float]:
        rows = energy_rows(have, p) if have is not None \
            else await demo_svc.energy(session, hid, p.start, p.until)
        return {r["name"]: r["energy_wh"] / 1000 for r in rows if r["kind"] == "appliance"}

    now, before = await by_appliance(cur, rows_cur), await by_appliance(prev, rows_prev)
    total_now, total_before = sum(now.values()), sum(before.values())
    if not now or total_now <= 0:
        return {"question": f"{now_label.capitalize()} tôi dùng điện thế nào?",
                "text": "Chưa có dữ liệu tiêu thụ trong kỳ này.", "appliance": None}
    if total_before <= 0:
        top = max(MODELLED, key=lambda k: now.get(k, 0))
        return {"question": f"Thiết bị nào dùng nhiều điện nhất {now_label}?",
                "text": f"{names.get(top, top)} dùng nhiều nhất với {_vn(now.get(top, 0))} kWh; "
                        f"chưa có dữ liệu {before_label} để so sánh.", "appliance": top}

    delta = {k: now.get(k, 0) - before.get(k, 0) for k in MODELLED}
    change = total_now - total_before
    pct = round(100 * change / total_before)
    top = max(MODELLED, key=lambda k: abs(delta[k]))
    name, d = names.get(top, top), delta[top]
    word = "tăng" if d > 0 else "giảm"
    text = (f"{name} {word} {_vn(abs(d))} kWh so với {before_label} "
            f"({round(100 * d / before[top]):+d}%)" if before.get(top, 0) > 0
            else f"{name} dùng thêm {_vn(abs(d))} kWh so với {before_label}")
    # how long it ran, from its own minutes
    runs = {}
    for label, p in (("now", cur), ("before", prev)):
        found = (await insights_svc.runs(session, hid, p.start, p.until)).get(top, [])
        runs[label] = sum(r.minutes for r in found)
    if runs["before"] > 0 and runs["now"] > 0:
        text += f", thời gian chạy {_hm(runs['now'])} so với {_hm(runs['before'])}"
    text += "."
    if change != 0 and (d > 0) == (change > 0) and d / change <= 1:  # a share, not an excess
        text += f" Riêng {name} chiếm {round(100 * d / change)}% mức " \
                f"{'tăng' if change > 0 else 'giảm'} của cả nhà."
    if pct >= CHANGE_PCT:
        question = f"Vì sao {now_label} tôi dùng nhiều điện hơn {before_label}?"
    elif pct <= -CHANGE_PCT:
        question = f"Điều gì giúp {now_label} tôi dùng ít điện hơn {before_label}?"
    else:
        question = f"{now_label.capitalize()} tôi dùng điện khác {before_label} ở đâu?"
    return {"question": question, "text": text, "appliance": top}


# -------------------------------------------------------------------------- one appliance
def appliance_buckets(rows, p: Period, name: str, plan: Plan) -> tuple[list[float], list[float]]:
    """kWh and billing weight of one appliance per bucket (weight: kWh on 6 tiers, its own
    time-of-use cost on TOU, the same way `window_cost` shares the bill)."""
    kwh = [0.0] * p.n_buckets
    weight = [0.0] * p.n_buckets
    for r in rows:
        if r["name"] != name or r["kind"] == "aggregate":
            continue
        slot = r["slot"].replace(tzinfo=UTC)
        i = _bucket_index(p, slot)
        if i is None:
            continue
        k = r["wh"] / 1000
        kwh[i] += k
        weight[i] += k if plan.scheme == "tier" else k * plan.tou.prices[
            engine.classify(slot.replace(tzinfo=None), plan.schedule)]
    return kwh, weight
