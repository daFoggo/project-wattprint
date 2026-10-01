"""Billing engine: pure functions over kWh, no database, no I/O.

Money is whole VND. A bill is `subtotal` (before VAT), `vat` and `total`; the subtotal and the VAT
are each rounded to the dồng, as on an EVN invoice.
"""
import math
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, datetime

from app.billing.tariffs import PERIODS, Band, Period, TierTariff, TouSchedule, TouTariff


@dataclass(frozen=True)
class Money:
    subtotal: int
    vat: int
    total: int


def round_vnd(x: float) -> int:
    return math.floor(x + 0.5)


def money(subtotal: float, vat_rate: float) -> Money:
    sub = round_vnd(subtotal)
    vat = round_vnd(sub * vat_rate)
    return Money(sub, vat, sub + vat)


def add(a: Money, b: Money) -> Money:
    return Money(a.subtotal + b.subtotal, a.vat + b.vat, a.total + b.total)


# --------------------------------------------------------------------------------- 6-tier
@dataclass(frozen=True)
class BandUse:
    band: Band
    index: int
    lower: float
    kwh: float

    @property
    def cost(self) -> float:
        return self.kwh * self.band.price


def band_uses(kwh_before: float, kwh: float, t: TierTariff) -> list[BandUse]:
    """Split `kwh` consumed after `kwh_before` kWh of the same billing month across the bands."""
    end = kwh_before + kwh
    uses, lower = [], 0.0
    for i, b in enumerate(t.bands):
        upper = math.inf if b.upto is None else b.upto
        uses.append(BandUse(b, i, lower, max(0.0, min(end, upper) - max(kwh_before, lower))))
        lower = upper
    return uses


@dataclass(frozen=True)
class TierBill:
    uses: list[BandUse]
    money: Money


def tier_bill(kwh_before: float, kwh: float, t: TierTariff) -> TierBill:
    """Cost of `kwh` consumed after `kwh_before` kWh already used in the same month."""
    uses = band_uses(kwh_before, kwh, t)
    return TierBill(uses, money(sum(u.cost for u in uses), t.vat_rate))


@dataclass(frozen=True)
class TierDay:
    day: date
    kwh: float
    uses: list[BandUse]  # bands this day's kWh falls in (marginal, given the days before)

    @property
    def cost(self) -> float:
        return sum(u.cost for u in self.uses)


def tier_days(days: Iterable[tuple[date, float]], t: TierTariff, kwh_before: float = 0.0
              ) -> list[TierDay]:
    out, cum = [], kwh_before
    for d, kwh in days:
        out.append(TierDay(d, kwh, [u for u in band_uses(cum, kwh, t) if u.kwh > 0]))
        cum += kwh
    return out


@dataclass(frozen=True)
class TierStatus:
    band_index: int
    headroom_kwh: float | None  # kWh left in the current band; None in the last band
    next_index: int | None
    step_pct: int | None  # price of the next band over the current one
    cross_day: int | None  # day of the month the next band is reached at the current pace


def tier_status(kwh_to_date: float, days_elapsed: float, days_in_month: int, t: TierTariff
                ) -> TierStatus:
    cur = next((i for i, b in enumerate(t.bands) if b.upto is None or kwh_to_date < b.upto),
               len(t.bands) - 1)
    band = t.bands[cur]
    if band.upto is None:
        return TierStatus(cur, None, None, None, None)
    nxt = t.bands[cur + 1]
    headroom = band.upto - kwh_to_date
    pace = kwh_to_date / days_elapsed if days_elapsed > 0 else 0.0
    cross = math.ceil(days_elapsed + headroom / pace) if pace > 0 else None
    return TierStatus(cur, headroom, cur + 1, round_vnd((nxt.price / band.price - 1) * 100),
                      cross if cross is not None and cross <= days_in_month else None)


def pace_forecast(kwh_to_date: float, days_elapsed: float, days_in_month: int) -> float:
    """kWh of the whole month if consumption continues at the average pace so far."""
    return kwh_to_date / days_elapsed * days_in_month if days_elapsed > 0 else 0.0


# ------------------------------------------------------------------------------------ TOU
def classify(at: datetime, s: TouSchedule) -> Period:
    """Period of a local wall-clock time. Sunday has no peak."""
    m = at.hour * 60 + at.minute
    if any(a <= m < b for a, b in s.offpeak):
        return "offpeak"
    if at.weekday() != 6 and any(a <= m < b for a, b in s.peak):
        return "peak"
    return "normal"


def minutes_in_day(s: TouSchedule, sunday: bool, period: Period) -> int:
    """Length of a period over a day; used to show the hours and to test the schedule."""
    ranges = {"offpeak": s.offpeak, "peak": () if sunday else s.peak}
    if period == "normal":
        return 1440 - minutes_in_day(s, sunday, "offpeak") - minutes_in_day(s, sunday, "peak")
    return sum(b - a for a, b in ranges[period])


def _hhmm(minute: int) -> str:
    return f"{minute // 60 % 24:02d}:{minute % 60:02d}"


def describe_hours(s: TouSchedule, period: Period) -> str:
    """Human-readable hours of a period, e.g. `22:00–04:00` or `T2–T7 09:30–11:30 · 17:00–20:00`."""
    if period == "normal":
        return "Các giờ còn lại"
    ranges = sorted(s.offpeak if period == "offpeak" else s.peak)
    if len(ranges) > 1 and ranges[0][0] == 0 and ranges[-1][1] == 1440:  # wraps over midnight
        ranges = ranges[1:-1] + [(ranges[-1][0], ranges[0][1])]
    text = " · ".join(f"{_hhmm(a)}–{_hhmm(b)}" for a, b in ranges)
    return text if period == "offpeak" else f"T2–T7 {text}"


@dataclass(frozen=True)
class TouBill:
    kwh: dict[Period, float]
    cost: dict[Period, float]  # before VAT
    money: Money


def tou_kwh(slots: Iterable[tuple[datetime, float]], s: TouSchedule) -> dict[Period, float]:
    """kWh per period. Slots must not straddle a period change (use 30-minute slots)."""
    kwh: dict[Period, float] = dict.fromkeys(PERIODS, 0.0)
    for at, k in slots:
        kwh[classify(at, s)] += k
    return kwh


def tou_bill_from_kwh(kwh: dict[Period, float], t: TouTariff) -> TouBill:
    cost = {p: kwh[p] * t.prices[p] for p in PERIODS}
    return TouBill(kwh, cost, money(sum(cost.values()), t.vat_rate))


def tou_bill(slots: Iterable[tuple[datetime, float]], t: TouTariff, s: TouSchedule) -> TouBill:
    return tou_bill_from_kwh(tou_kwh(slots, s), t)


# -------------------------------------------------------------------------------- sharing
def allocate(total: int, weights: dict[str, float]) -> dict[str, int]:
    """Split `total` VND in proportion to `weights`; parts add up to exactly `total`
    (largest remainder), so a bill shared among appliances never gains or loses a dồng."""
    w = sum(weights.values())
    if w <= 0:
        return dict.fromkeys(weights, 0)
    raw = {k: total * v / w for k, v in weights.items()}
    out = {k: math.floor(v) for k, v in raw.items()}
    for k in sorted(raw, key=lambda k: raw[k] - out[k], reverse=True)[: total - sum(out.values())]:
        out[k] += 1
    return out
