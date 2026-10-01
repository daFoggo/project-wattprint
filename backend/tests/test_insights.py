"""Runs and alerts: pure run detection, then the endpoints on the real demo household."""
from datetime import datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.demo import snapshot
from app.main import app
from app.services.insights import find_runs

T0 = datetime(2023, 8, 20, 10, 0)


def series(*watts: float):
    return [(T0 + timedelta(minutes=i), w) for i, w in enumerate(watts)]


# ------------------------------------------------------------------------------- run detection
def test_a_run_spans_from_first_to_last_minute_on():
    runs = find_runs(series(0, 0, 100, 100, 100, 100, 0, 0))
    assert len(runs) == 1 and runs[0].start == T0 + timedelta(minutes=2)
    assert runs[0].minutes == 4 and runs[0].end == T0 + timedelta(minutes=6)
    assert runs[0].energy_wh == pytest.approx(400 / 60) and runs[0].peak_w == 100


def test_short_pauses_stay_inside_the_run_and_long_ones_split_it():
    assert len(find_runs(series(100, 100, 100, 0, 0, 0, 100, 100, 100))) == 1
    assert len(find_runs(series(100, 100, 100, *[0] * 6, 100, 100, 100))) == 2


def test_runs_that_are_too_short_or_too_weak_are_ignored():
    assert find_runs(series(0, 100, 100, 0)) == []
    assert find_runs(series(*[40] * 30)) == []


# -------------------------------------------------------------------------------- endpoints
pytestmark_db = pytest.mark.skipif(snapshot() is None, reason="demo snapshot missing")
NOW = "2023-08-20T23:59:00Z"


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
async def test_timeline_lists_runs_by_appliance(client):
    r = await get(client, "timeline", date="2023-08-20")
    assert r.status_code == 200, r.text
    j = r.json()
    keys = [i["key"] for i in j["items"]]
    assert "Other" not in keys and "WashingMachine" not in keys  # no run that day
    assert [i["first_start"] for i in j["items"]] == sorted(i["first_start"] for i in j["items"])
    for item in j["items"]:
        assert item["run_count"] == len(item["runs"]) > 0
        assert item["minutes"] == sum(x["minutes"] for x in item["runs"])
        assert item["energy_kwh"] == pytest.approx(sum(x["energy_kwh"] for x in item["runs"]),
                                                   abs=0.01)
        assert all(x["start"] < x["end"] for x in item["runs"])
    assert next(i for i in j["items"] if i["key"] == "AC")["name"] == "Điều hoà"


@pytestmark_db
async def test_timeline_until_cuts_the_day(client):
    full = (await get(client, "timeline", date="2023-08-20")).json()
    half = (await get(client, "timeline", date="2023-08-20", until="2023-08-20T12:00:00Z")).json()
    assert all(x["end"] <= "2023-08-20T12:00:00Z" for i in half["items"] for x in i["runs"])
    def total(j):
        return sum(i["energy_kwh"] for i in j["items"])

    assert total(half) < total(full)


@pytestmark_db
async def test_timeline_validation(client):
    assert (await get(client, "timeline")).status_code == 422
    r = await get(client, "timeline", date="2023-08-20", until="2023-08-22T00:00:00Z")
    assert r.status_code == 422 and "until" in r.json()["errors"][0]["loc"]


@pytestmark_db
async def test_household_alerts(client):
    r = await get(client, "alerts", asof=NOW)
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    codes = [a["code"] for a in items]
    assert "tier_approaching" in codes or "tier_headroom" in codes
    assert "month_forecast" in codes and "tou_peak_share" not in codes
    assert [a["at"] for a in items] == sorted((a["at"] for a in items), reverse=True)
    assert all(a["tone"] in ("warning", "info", "good") and a["text"] for a in items)


@pytestmark_db
async def test_business_alerts_talk_about_the_peak(client):
    items = (await get(client, "alerts", asof=NOW, customer="business")).json()["items"]
    codes = [a["code"] for a in items]
    assert "tou_peak_share" in codes and not {"tier_approaching", "tier_headroom"} & set(codes)


@pytestmark_db
async def test_alerts_default_to_the_end_of_the_period(client):
    r = await get(client, "alerts")
    assert r.status_code == 200 and r.json()["items"]
