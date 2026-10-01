"""Billing engine: pure functions, no database."""
from datetime import date, datetime, timedelta

import pytest

from app.billing import engine
from app.billing.tariffs import (
    BUSINESS,
    LEGACY_2019,
    PERIODS,
    PRODUCTION,
    QD_963,
    resolve,
)
from app.billing.tariffs import (
    RESIDENTIAL_6_TIER as T,
)

WED, SAT, SUN = date(2023, 7, 12), date(2023, 7, 15), date(2023, 7, 16)


def at(d: date, h: int, m: int = 0) -> datetime:
    return datetime(d.year, d.month, d.day, h, m)


# ------------------------------------------------------------------------------- 6 tiers
def test_608_kwh_matches_the_invoice_in_the_mockup():
    b = engine.tier_bill(0, 608, T)
    assert [round(u.kwh) for u in b.uses] == [50, 50, 100, 100, 100, 208]
    assert (b.money.subtotal, b.money.vat, b.money.total) == (1_794_180, 143_534, 1_937_714)


def test_zero_and_exact_band_edge():
    assert engine.tier_bill(0, 0, T).money.total == 0
    only_first = engine.tier_bill(0, 50, T)
    assert [u.kwh for u in only_first.uses if u.kwh] == [50] and only_first.money.subtotal == 99_200


def test_increment_continues_from_what_the_month_already_used():
    b = engine.tier_bill(40, 20, T)
    assert [(u.index, u.kwh) for u in b.uses if u.kwh] == [(0, 10), (1, 10)]
    assert b.money.subtotal == 10 * 1984 + 10 * 2050


def test_bills_of_consecutive_windows_add_up_to_the_month():
    whole = engine.tier_bill(0, 300, T).money.subtotal
    parts = engine.tier_bill(0, 120, T).money.subtotal + engine.tier_bill(120, 180, T).money.subtotal
    assert abs(whole - parts) <= 1  # each part is rounded to the dồng


def test_daily_segments_follow_the_cumulative_position():
    days = [(date(2023, 7, d), 30.0) for d in range(1, 5)]  # 30 kWh a day
    out = engine.tier_days(days, T)
    assert [[(u.index, u.kwh) for u in d.uses] for d in out] == [
        [(0, 30)], [(0, 20), (1, 10)], [(1, 30)], [(1, 10), (2, 20)]]
    assert sum(d.cost for d in out) == pytest.approx(engine.tier_bill(0, 120, T).uses[0].cost
                                                     + sum(u.cost for u in engine.tier_bill(0, 120, T).uses[1:]))


def test_status_in_the_middle_of_a_month():
    s = engine.tier_status(284, 14, 30, T)  # the figures of the billing mockup
    assert (s.band_index, s.next_index, s.step_pct) == (3, 4, 12)
    assert s.headroom_kwh == 16 and s.cross_day == 15
    assert engine.pace_forecast(284, 14, 30) == pytest.approx(608.57, abs=0.01)


def test_status_in_the_last_band_and_when_the_next_band_is_out_of_reach():
    last = engine.tier_status(450, 20, 30, T)
    assert last.band_index == 5 and last.headroom_kwh is None and last.next_index is None
    slow = engine.tier_status(10, 20, 30, T)  # 0.5 kWh a day: never leaves band 1 this month
    assert slow.band_index == 0 and slow.cross_day is None


# ---------------------------------------------------------------------------------- TOU
@pytest.mark.parametrize("when,expected", [
    (at(WED, 9, 29), "normal"), (at(WED, 9, 30), "peak"), (at(WED, 11, 29), "peak"),
    (at(WED, 11, 30), "normal"), (at(WED, 17), "peak"), (at(WED, 19, 59), "peak"),
    (at(WED, 20), "normal"), (at(WED, 22), "offpeak"), (at(WED, 23, 59), "offpeak"),
    (at(WED, 0), "offpeak"), (at(WED, 3, 59), "offpeak"), (at(WED, 4), "normal"),
    (at(SAT, 18), "peak"),
    (at(SUN, 10), "normal"), (at(SUN, 18), "normal"), (at(SUN, 23), "offpeak"),
])
def test_legacy_schedule(when, expected):
    assert engine.classify(when, LEGACY_2019) == expected


@pytest.mark.parametrize("when,expected", [
    (at(WED, 17, 29), "normal"), (at(WED, 17, 30), "peak"), (at(WED, 22, 29), "peak"),
    (at(WED, 22, 30), "normal"), (at(WED, 5, 59), "offpeak"), (at(WED, 6), "normal"),
    (at(SUN, 18), "normal"), (at(SUN, 2), "offpeak"),
])
def test_qd_963_schedule(when, expected):
    assert engine.classify(when, QD_963) == expected


def test_hours_per_day():
    assert [engine.minutes_in_day(LEGACY_2019, False, p) for p in ("offpeak", "peak", "normal")] \
        == [360, 300, 780]
    assert engine.minutes_in_day(LEGACY_2019, True, "peak") == 0
    assert engine.minutes_in_day(QD_963, False, "peak") == 300


def test_hours_are_described_for_display():
    d = engine.describe_hours
    assert d(LEGACY_2019, "offpeak") == "22:00–04:00"
    assert d(LEGACY_2019, "peak") == "T2–T7 09:30–11:30 · 17:00–20:00"
    assert d(QD_963, "peak") == "T2–T7 17:30–22:30" and d(QD_963, "offpeak") == "00:00–06:00"
    assert d(QD_963, "normal") == "Các giờ còn lại"


def test_a_weekday_of_flat_load_bills_each_period_at_its_price():
    slots = [(at(WED, 0) + timedelta(minutes=30 * i), 1.0) for i in range(48)]  # 1 kWh each
    plan = resolve("business", "lt_6kv")
    b = engine.tou_bill(slots, plan.tou, plan.schedule)
    assert b.kwh == {"offpeak": 12, "normal": 26, "peak": 10}
    assert b.money.subtotal == 12 * 1918 + 26 * 3152 + 10 * 5422
    assert (b.money.vat, b.money.total) == (12_735, 171_923)


def test_prices_are_ordered_and_the_flat_price_is_the_normal_one():
    for table in (BUSINESS, PRODUCTION):
        for t in table.values():
            assert t.prices["offpeak"] < t.prices["normal"] < t.prices["peak"]
    assert BUSINESS["lt_6kv"].flat_price == 3152
    assert [b.price for b in T.bands] == sorted(b.price for b in T.bands)


def test_customer_decides_the_scheme():
    assert resolve("household").scheme == "tier" and resolve("household").tou is None
    biz = resolve("business", "6_22kv", "qd963")
    assert (biz.scheme, biz.tou.id, biz.schedule.id) == ("tou", "business_6_22kv", "qd_963")
    assert resolve("production", "ge_110kv").tou.prices["peak"] == 3266
    assert set(PERIODS) == {"offpeak", "normal", "peak"}


# ----------------------------------------------------------------------------- sharing
def test_allocation_adds_up_to_the_bill_exactly():
    parts = engine.allocate(1_000_001, {"a": 1.0, "b": 1.0, "c": 1.0})
    assert sum(parts.values()) == 1_000_001 and max(parts.values()) - min(parts.values()) <= 1
    assert engine.allocate(100, {"a": 3.0, "b": 1.0}) == {"a": 75, "b": 25}
    assert engine.allocate(100, {"a": 0.0}) == {"a": 0}
