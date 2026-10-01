"""Billing endpoints against the real demo household (skipped when it is not imported)."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.demo import snapshot
from app.main import app

pytestmark = pytest.mark.skipif(snapshot() is None, reason="demo snapshot missing")
AUG = {"month": "2023-08", "asof": "2023-08-20T23:59:00Z"}


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def get(client, path, **params):
    r = await client.get(f"/api/v1/demo/{path}", params=params)
    if r.status_code == 404:
        pytest.skip("demo household not imported in this database")
    return r


async def test_household_is_billed_on_six_tiers(client):
    r = await get(client, "billing", **AUG)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["customer"] == "household" and j["scheme"] == "tier" and j["tou"] is None
    assert j["tariff"]["id"] == "residential_6_tier" and j["tariff"]["vat_rate"] == 0.08
    bands = j["tier"]["bands"]
    assert [b["price_vnd"] for b in bands] == [1984, 2050, 2380, 2998, 3350, 3460]
    assert sum(b["kwh"] for b in bands) == pytest.approx(j["kwh_to_date"], abs=0.01)
    bill = j["bill_to_date"]
    assert abs(sum(b["cost_vnd"] for b in bands) - bill["subtotal_vnd"]) <= 3
    assert bill["vat_vnd"] == round(bill["subtotal_vnd"] * 0.08)
    assert bill["total_vnd"] == bill["subtotal_vnd"] + bill["vat_vnd"]
    # the days stack the bands the way the month fills them
    days = j["tier"]["daily"]
    assert sum(d["kwh"] for d in days) == pytest.approx(j["kwh_to_date"], abs=0.05)
    assert all(abs(sum(sg["kwh"] for sg in d["segments"]) - d["kwh"]) < 0.01 for d in days)
    assert j["forecast"]["bill"]["total_vnd"] > bill["total_vnd"]
    assert j["tier"]["status"]["band_name"].startswith("Bậc")


async def test_business_is_billed_by_time_of_use(client):
    r = await get(client, "billing", customer="business", **AUG)
    j = r.json()
    assert j["scheme"] == "tou" and j["tier"] is None
    periods = {p["key"]: p for p in j["tou"]["periods"]}
    assert [periods[k]["price_vnd"] for k in ("offpeak", "normal", "peak")] == [1918, 3152, 5422]
    assert sum(p["share_pct"] for p in periods.values()) == pytest.approx(100, abs=0.1)
    assert sum(p["kwh"] for p in periods.values()) == pytest.approx(j["kwh_to_date"], abs=0.01)
    assert abs(sum(p["cost_vnd"] for p in periods.values()) - j["bill_to_date"]["subtotal_vnd"]) <= 3
    assert j["tou"]["flat_price_vnd"] == 3152
    # same consumption, other schedule: peak moves
    j963 = (await get(client, "billing", customer="business", hours="qd963", **AUG)).json()
    assert j963["tou"]["schedule"]["id"] == "qd_963"
    assert j963["kwh_to_date"] == j["kwh_to_date"]
    assert j963["tou"]["periods"][2]["kwh"] != periods["peak"]["kwh"]
    prod = (await get(client, "billing", customer="production", voltage="ge_110kv", **AUG)).json()
    assert prod["tariff"]["id"] == "production_ge_110kv"


async def test_breakdown_shares_the_bill_among_appliances(client):
    for customer in ("household", "business"):
        r = await get(client, "breakdown", customer=customer, start="2023-08-14T00:00:00Z",
                      end="2023-08-21T00:00:00Z")
        j = r.json()
        assert j["billing"]["customer"] == customer
        assert sum(t["cost_vnd"] for t in j["totals"]) == j["billing"]["bill"]["total_vnd"] > 0


async def test_a_window_is_priced_after_what_its_month_already_used(client):
    # the first week of the month sits in cheaper bands than the same energy later on
    early = (await get(client, "breakdown", start="2023-08-01T00:00:00Z",
                       end="2023-08-08T00:00:00Z")).json()
    late = (await get(client, "breakdown", start="2023-08-14T00:00:00Z",
                      end="2023-08-21T00:00:00Z")).json()
    def rate(j):
        return j["billing"]["bill"]["total_vnd"] / j["aggregate_energy_kwh"]

    assert rate(late) > rate(early)


async def test_default_window_still_works_and_is_priced(client):
    j = (await get(client, "breakdown")).json()
    assert j["billing"]["scheme"] == "tier" and j["billing"]["bill"]["total_vnd"] > 0


async def test_billing_validation(client):
    r = await get(client, "billing", month="2023-08", asof="2023-09-05T00:00:00Z")
    assert r.status_code == 422 and "asof" in r.json()["errors"][0]["loc"]
    assert (await get(client, "billing", month="2023-8")).status_code == 422
    assert (await get(client, "billing", customer="school")).status_code == 422
    assert (await get(client, "billing", month="2023-08", asof="2023-07-31T00:00:00Z")
            ).status_code == 422


async def test_default_month_is_the_suggested_window(client):
    j = (await get(client, "billing")).json()
    assert j["month"] == "2023-07" and j["kwh_to_date"] > 0
