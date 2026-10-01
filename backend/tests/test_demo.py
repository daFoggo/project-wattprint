"""Demo API against the real demo data (snapshot + the imported household); read-only."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.demo import snapshot
from app.main import app

pytestmark = pytest.mark.skipif(snapshot() is None, reason="demo snapshot missing")


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def test_household(client):
    r = await client.get("/api/v1/demo/household")
    assert r.status_code == 200, r.text
    h = r.json()["household"]
    assert h["name"] == settings.DEMO_HOUSEHOLD and h["held_out"]
    assert {a["key"] for a in h["appliances"]} == {"AC", "WaterHeater", "Fridge", "WashingMachine",
                                                   "Other"}
    assert 0 < h["metered_pct"] <= 100


async def test_evaluation(client):
    j = (await client.get("/api/v1/demo/evaluation")).json()
    assert len(j["appliances"]) == 4 and 0 < j["mean_f1"] < 1
    assert abs(sum(m["measured_share_pct"] for m in j["mix"]) - 100) < 0.1
    months = (await client.get("/api/v1/demo/evaluation/monthly")).json()["items"]
    assert months[0]["month"] < months[-1]["month"]
    days = (await client.get("/api/v1/demo/evaluation/daily",
                             params={"start": "2023-07-01", "end": "2023-07-31"})).json()["items"]
    assert days and all(d["date"].startswith("2023-07") for d in days)
    day = (await client.get("/api/v1/demo/evaluation/sample-day")).json()
    assert len(day["points"]) == 24 * 60 // day["interval_minutes"]


async def test_consumption_default_window(client):
    r = await client.get("/api/v1/demo/consumption")
    if r.status_code == 404:
        pytest.skip("demo household not imported in this database")
    j = r.json()
    assert r.status_code == 200, r.text
    assert len(j["aggregate"]) == 7 * 24  # one week by hour
    assert {s["key"] for s in j["appliances"]} >= {"AC", "Other"}
    # appliances + residual = the whole house
    assert abs(sum(t["share_pct"] for t in j["totals"]) - 100) < 0.5  # rounded to 0.01
    b = (await client.get("/api/v1/demo/breakdown",
                          params={"start": j["start"], "end": j["end"]})).json()
    assert b["aggregate_energy_kwh"] == j["aggregate_energy_kwh"]


async def test_consumption_limits(client):
    r = await client.get("/api/v1/demo/consumption",
                         params={"start": "2022-07-15T00:00:00Z", "end": "2023-09-30T00:00:00Z",
                                 "bucket": "1 minute"})
    assert r.status_code == 422 and "bucket" in r.json()["errors"][0]["loc"]
    r = await client.get("/api/v1/demo/consumption",
                         params={"start": "2023-07-10T00:00:00Z", "end": "2023-07-01T00:00:00Z"})
    assert r.status_code == 422


async def test_consumption_naive_time_and_partial_bucket(client):
    r = await client.get("/api/v1/demo/consumption",
                         params={"start": "2023-07-12T10:30:00", "end": "2023-07-12T13:00:00"})
    if r.status_code == 404:
        pytest.skip("demo household not imported in this database")
    assert r.status_code == 200, r.text
    times = [p["time"] for p in r.json()["aggregate"]]
    assert times == ["2023-07-12T10:00:00Z", "2023-07-12T11:00:00Z", "2023-07-12T12:00:00Z"]
