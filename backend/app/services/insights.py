"""Appliance runs and plain-language alerts derived from the predicted 1-minute series.

A *run* is a stretch where an appliance draws more than `ON_W`; gaps up to `MAX_GAP_MIN` minutes
do not end it (a compressor or heater element switching inside one cycle) and runs shorter than
`MIN_RUN_MIN` are dropped as noise. Alerts are rules over the same series and the billing engine;
every sentence is built from numbers computed here, so it can be checked against the other
endpoints.
"""
import uuid
from collections import defaultdict
from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.billing.tariffs import Plan
from app.services import billing as billing_svc

ON_W = 50.0
MAX_GAP_MIN = 5
MIN_RUN_MIN = 3
LONG_RUN_MIN = 120  # an air conditioner running this long without a break is worth a mention
DAY_DELTA_PCT = 10
SHARE_PCT = 30
PEAK_SHARE_PCT = 30
MAX_ALERTS = 3  # more than this is noise on a dashboard card

SCOPES = {"long_run": "event", "day_vs_yesterday": "day", "big_share": "day"}  # others: month
# How much a sentence deserves the customer's attention: warnings first, then what happened
# today, then the month outlook.
PRIORITY = {("tier_approaching", "warning"): 100, ("tou_peak_share", "warning"): 100,
            ("day_vs_yesterday", "warning"): 90, ("long_run", "info"): 70,
            ("day_vs_yesterday", "good"): 60, ("tier_headroom", "info"): 50,
            ("big_share", "info"): 40, ("month_forecast", "info"): 30,
            ("tou_peak_share", "good"): 30}


@dataclass(frozen=True)
class Run:
    start: datetime
    end: datetime  # exclusive: the minute after the last one ON
    energy_wh: float
    peak_w: float

    @property
    def minutes(self) -> int:
        return round((self.end - self.start) / timedelta(minutes=1))


def find_runs(points: list[tuple[datetime, float]]) -> list[Run]:
    """Runs of one appliance from `(minute, watts)` points sorted by time."""
    runs: list[Run] = []
    cur: list[tuple[datetime, float]] = []

    def close() -> None:
        if cur:
            start, last = cur[0][0], cur[-1][0]
            minutes = round((last - start) / timedelta(minutes=1)) + 1
            if minutes >= MIN_RUN_MIN:
                runs.append(Run(start, last + timedelta(minutes=1),
                                sum(w for _, w in cur) / 60.0, max(w for _, w in cur)))
        cur.clear()

    for at, w in points:
        if w <= ON_W:
            continue
        if cur and at - cur[-1][0] > timedelta(minutes=MAX_GAP_MIN + 1):
            close()
        cur.append((at, w))
    close()
    return runs


async def minute_power(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime):
    """Per appliance, `(minute, watts)` of the window; the whole-house series is not included."""
    q = text(
        """
        SELECT d.name, r.time, r.power_w
        FROM power_readings r JOIN devices d ON d.id = r.device_id
        WHERE d.parent_id = :hid AND d.kind::text = 'appliance' AND d.name <> 'Other'
          AND r.time >= :start AND r.time < :end
        ORDER BY d.name, r.time
        """
    )
    out: dict[str, list[tuple[datetime, float]]] = defaultdict(list)
    for r in (await session.execute(q, {"hid": hid, "start": start, "end": end})).mappings():
        out[r["name"]].append((r["time"], float(r["power_w"])))
    return out


async def runs(session: AsyncSession, hid: uuid.UUID, start: datetime, end: datetime,
               split_days: bool = False) -> dict[str, list[Run]]:
    """Runs of every appliance in the window, found in SQL so only the runs leave the database.

    Same rule as `find_runs`: minutes above `ON_W`, a gap of more than `MAX_GAP_MIN` minutes
    starts a new run, runs shorter than `MIN_RUN_MIN` are dropped. `split_days` also ends a run at
    midnight (per-day figures).
    """
    day = "date_trunc('day', r.time)" if split_days else "0"
    q = text(
        f"""
        WITH on_pts AS (
            SELECT d.name AS name, r.time AS t, r.power_w AS w, {day} AS day
            FROM power_readings r JOIN devices d ON d.id = r.device_id
            WHERE d.parent_id = :hid AND d.kind::text = 'appliance' AND d.name <> 'Other'
              AND r.time >= :start AND r.time < :end AND r.power_w > :on_w
        ), marked AS (
            SELECT *, CASE WHEN t - lag(t) OVER (PARTITION BY name, day ORDER BY t)
                                > make_interval(mins => CAST(:gap AS int)) THEN 1 ELSE 0 END AS brk
            FROM on_pts
        ), grp AS (
            SELECT *, sum(brk) OVER (PARTITION BY name, day ORDER BY t) AS g FROM marked
        )
        SELECT name, min(t) AS first, max(t) AS last, sum(w) / 60.0 AS energy_wh, max(w) AS peak_w
        FROM grp GROUP BY name, day, g
        HAVING round(extract(epoch FROM max(t) - min(t)) / 60) + 1 >= :min_run
        ORDER BY name, min(t)
        """
    )
    params = {"hid": hid, "start": start, "end": end, "on_w": ON_W, "gap": MAX_GAP_MIN + 1,
              "min_run": MIN_RUN_MIN}
    out: dict[str, list[Run]] = defaultdict(list)
    for r in (await session.execute(q, params)).mappings():
        out[r["name"]].append(Run(r["first"], r["last"] + timedelta(minutes=1),
                                  float(r["energy_wh"]), float(r["peak_w"])))
    return out


# ------------------------------------------------------------------------------------ alerts
@dataclass(frozen=True)
class Alert:
    code: str
    tone: str  # warning | info | good
    at: datetime
    text: str
    appliance: str | None = None
    scope: str = "day"  # event: happened at `at` | day: about today | month: about the month


def _vn(x: float, digits: int = 0) -> str:
    """1234.5 -> '1.235' (Vietnamese grouping)."""
    s = f"{x:,.{digits}f}".replace(",", "_").replace(".", ",").replace("_", ".")
    return s


def _hm(at: datetime) -> str:
    return f"{at:%H:%M}"


def _duration(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{h} giờ {m:02d} phút" if h else f"{m} phút"


def pick(found: list[Alert], limit: int) -> list[Alert]:
    """The few alerts worth showing: no two about the same appliance, most important first."""
    scoped = [replace(a, scope=SCOPES.get(a.code, "month")) for a in found]
    ranked = sorted(scoped, key=lambda a: (PRIORITY.get((a.code, a.tone), 0), a.at), reverse=True)
    out: list[Alert] = []
    seen: set[str] = set()
    for a in ranked:
        if a.appliance and a.appliance in seen:
            continue  # e.g. "AC ran 3 h" already says AC is the story: skip "AC is 32 % of today"
        if a.appliance:
            seen.add(a.appliance)
        out.append(a)
    return out[:limit]


async def alerts(session: AsyncSession, hid: uuid.UUID, asof: datetime, plan: Plan,
                 names: dict[str, str], limit: int = MAX_ALERTS,
                 mute: frozenset[str] = frozenset()) -> list[Alert]:
    day = datetime(asof.year, asof.month, asof.day, tzinfo=UTC)
    prev_day, prev_end = day - timedelta(days=1), asof - timedelta(days=1)
    out: list[Alert] = []

    # 1. today so far against the same hours yesterday
    today = await billing_svc.aggregate_wh(session, hid, day, asof) / 1000
    before = await billing_svc.aggregate_wh(session, hid, prev_day, prev_end) / 1000
    if before > 0:
        pct = round(100 * (today - before) / before)
        if abs(pct) >= DAY_DELTA_PCT:
            more = pct > 0
            out.append(Alert(
                "day_vs_yesterday", "warning" if more else "good", asof,
                f"Hôm nay bạn dùng {'nhiều' if more else 'ít'} hơn {abs(pct)}% so với cùng giờ "
                f"hôm qua ({_vn(today, 1)} kWh so với {_vn(before, 1)} kWh)."))

    # 2. the month's bill: tier headroom or time-of-use peak share
    month = billing_svc.month_start(asof)
    b = await billing_svc.month_bill(session, hid, month, asof, plan)
    if plan.scheme == "tier":
        st, bands = b.status, plan.tier.bands
        name = bands[st.band_index].name
        if st.headroom_kwh is not None and st.next_index is not None:
            nxt = bands[st.next_index].name
            if st.cross_day is not None:
                out.append(Alert(
                    "tier_approaching", "warning", asof,
                    f"Đang ở {name}, còn {_vn(st.headroom_kwh, 0)} kWh là sang {nxt} "
                    f"(đắt hơn {st.step_pct}%). Với mức {_vn(b.pace, 1)} kWh/ngày, bạn sẽ chạm "
                    f"{nxt} vào ngày {st.cross_day}/{month.month}."))
            else:
                out.append(Alert(
                    "tier_headroom", "info", asof,
                    f"Đang ở {name}, còn {_vn(st.headroom_kwh, 0)} kWh trước khi sang {nxt}; "
                    "với mức dùng hiện tại bạn sẽ không chạm trong tháng này."))
    else:
        total = sum(b.tou_kwh.values()) or 1.0
        share = round(100 * b.tou_kwh["peak"] / total)
        price = _vn(plan.tou.prices["peak"])
        if share >= PEAK_SHARE_PCT:
            out.append(Alert("tou_peak_share", "warning", asof,
                             f"Giờ cao điểm chiếm {share}% điện tháng này (giá {price} đ/kWh)."))
        else:
            out.append(Alert("tou_peak_share", "good", asof,
                             f"Giờ cao điểm chỉ chiếm {share}% điện tháng này."))
    out.append(Alert(
        "month_forecast", "info", asof,
        f"Dự báo cả tháng {_vn(b.forecast_kwh, 0)} kWh, khoảng {_vn(b.forecast.total)} đ "
        "(đã gồm VAT)."))

    # 3. what ran today
    power = await minute_power(session, hid, day, asof)
    for key, pts in power.items():
        runs = find_runs(pts)
        if key == "AC" and runs:
            longest = max(runs, key=lambda r: r.minutes)
            if longest.minutes >= LONG_RUN_MIN:
                out.append(Alert(
                    "long_run", "info", longest.end,
                    f"{names.get(key, key)} chạy liên tục {_duration(longest.minutes)} "
                    f"({_hm(longest.start)}–{_hm(longest.end)}), khoảng "
                    f"{_vn(longest.energy_wh / 1000, 1)} kWh.", key))
    if today > 0:
        wh = {k: sum(w for _, w in v) / 60 / 1000 for k, v in power.items()}
        for key in ("WaterHeater", "AC"):
            pct = round(100 * wh.get(key, 0) / today)
            if pct >= SHARE_PCT:
                out.append(Alert(
                    "big_share", "info", asof,
                    f"{names.get(key, key)} chiếm {pct}% điện hôm nay "
                    f"({_vn(wh[key], 1)} kWh).", key))
    return pick([a for a in out if a.code not in mute], limit)
