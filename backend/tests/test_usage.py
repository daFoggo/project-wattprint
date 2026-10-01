"""Usage endpoints: period arithmetic (pure), then the real demo household."""
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.demo import snapshot
from app.main import app
from app.services.usage import period_of, previous_of


def at(*a):
    return datetime(*a, tzinfo=UTC)


# ------------------------------------------------------------------------------- periods
def test_periods_are_calendar_aligned_and_cut_at_asof():
    now = at(2023, 8, 31, 23, 59)  # a Thursday
    day, week, month = (period_of(r, now) for r in ("day", "week", "month"))
    assert (day.start, day.end, day.until) == (at(2023, 8, 31), at(2023, 9, 1), now)
    assert (week.start, week.end) == (at(2023, 8, 28), at(2023, 9, 4)) and not week.complete
    assert (month.start, month.end, month.n_buckets) == (at(2023, 8, 1), at(2023, 9, 1), 31)
    assert (day.n_buckets, week.n_buckets) == (8, 7)


def test_past_periods_are_whole_and_previous_is_cut_alike():
    wk = period_of("week", at(2023, 8, 31, 12), -1)
    assert wk.complete and wk.start == at(2023, 8, 21)
    cur = period_of("week", at(2023, 8, 31, 12))
    prev = previous_of(cur)
    assert prev.start == at(2023, 8, 21) and prev.end == cur.start
    assert prev.until - prev.start == cur.until - cur.start
    jan = period_of("month", at(2023, 1, 15))
    assert previous_of(jan).start == at(2022, 12, 1)
    assert period_of("month", at(2023, 3, 5), -3).start == at(2022, 12, 1)


# -------------------------------------------------------------------------------- endpoints
pytestmark_db = pytest.mark.skipif(snapshot() is None, reason="demo snapshot missing")
NOW = "2023-08-31T23:59:00Z"


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def get(client, path, **params):
    r = await client.get(f"/api/v1/demo/{path}", params=params)
    if r.status_code == 404:
        pytest.skip("demo household not imported in this database")
    return r


@pytestmark_db
@pytest.mark.parametrize("range_,n", [("day", 8), ("week", 7), ("month", 31)])
async def test_costs_add_up(client, range_, n):
    j = (await get(client, "usage", range=range_, asof=NOW)).json()
    assert len(j["buckets"]) == n
    assert sum(b["cost_vnd"] for b in j["buckets"]) == j["cost_vnd"]
    assert sum(d["cost_vnd"] for d in j["devices"]) == j["cost_vnd"]
    for b in j["buckets"]:
        assert sum(sg["cost_vnd"] for sg in b["segments"]) == b["cost_vnd"]
        assert sum(sg["kwh"] for sg in b["segments"]) == pytest.approx(b["kwh"], abs=0.01)
    assert sum(b["kwh"] for b in j["buckets"]) == pytest.approx(j["kwh"], abs=0.01)
    assert j["insight"]["question"] and j["insight"]["text"]


@pytestmark_db
async def test_month_agrees_with_the_billing_endpoint(client):
    u = (await get(client, "usage", range="month", asof=NOW)).json()
    b = (await get(client, "billing", month="2023-08", asof=NOW)).json()
    assert u["cost_vnd"] == b["bill_to_date"]["total_vnd"]
    assert u["kwh"] == pytest.approx(b["kwh_to_date"], abs=0.01)
    assert u["forecast"]["kwh"] == pytest.approx(b["forecast"]["kwh"], abs=0.5)


@pytestmark_db
async def test_a_past_period_is_whole_and_has_no_forecast(client):
    j = (await get(client, "usage", range="week", asof=NOW, offset=-1)).json()
    assert j["period"]["complete"] and j["forecast"] is None
    assert j["period"]["start"].startswith("2023-08-21")
    assert all(b["kwh"] > 0 for b in j["buckets"])


@pytestmark_db
async def test_time_of_use_stacks_by_period(client):
    j = (await get(client, "usage", range="week", asof=NOW, customer="business")).json()
    keys = {sg["key"] for b in j["buckets"] for sg in b["segments"]}
    assert keys <= {"offpeak", "normal", "peak"} and j["scheme"] == "tou"
    assert sum(b["cost_vnd"] for b in j["buckets"]) == j["cost_vnd"]


@pytestmark_db
async def test_device_usage(client):
    j = (await get(client, "usage/devices/AC", range="week", asof=NOW)).json()
    week = (await get(client, "usage", range="week", asof=NOW)).json()
    ac = next(d for d in week["devices"] if d["key"] == "AC")
    assert j["name"] == "Điều hoà" and j["cost_vnd"] == ac["cost_vnd"]
    assert j["kwh"] == pytest.approx(ac["energy_kwh"], abs=0.01)
    assert sum(b["cost_vnd"] for b in j["buckets"]) == j["cost_vnd"]
    assert j["runs"]["count"] > 0 and j["runs"]["avg_power_w"] > 0 and j["note"]
    assert 0 < len(j["recent_runs"]) <= 5
    starts = [r["start"] for r in j["recent_runs"]]
    assert starts == sorted(starts, reverse=True)
    hours = (datetime.fromisoformat(j["period"]["until"])
             - datetime.fromisoformat(j["period"]["start"])).total_seconds() / 3600
    assert j["average_power_w"] == pytest.approx(j["kwh"] * 1000 / hours, abs=1)
    other = (await get(client, "usage/devices/Other", range="day", asof=NOW)).json()
    assert other["runs"] is None and other["recent_runs"] == [] and other["average_power_w"] > 0


@pytestmark_db
async def test_usage_validation(client):
    assert (await get(client, "usage")).status_code == 422
    assert (await get(client, "usage", range="year")).status_code == 422
    assert (await get(client, "usage", range="day", offset=1)).status_code == 422
    assert (await get(client, "usage/devices/Toaster", range="day")).status_code == 422


@pytestmark_db
async def test_previous_month_costs_add_up_to_its_bill(client):
    cur = (await get(client, "usage", range="month", asof=NOW)).json()
    june_july = (await get(client, "usage", range="month", asof=NOW, offset=-1)).json()
    # the previous month's buckets, priced as a whole month, equal the bill of that month
    assert sum(b["previous_cost_vnd"] for b in cur["buckets"][:31]) == june_july["cost_vnd"]
    assert all(b["previous_cost_vnd"] is not None for b in cur["buckets"][:31])
