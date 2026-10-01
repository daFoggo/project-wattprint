import io

from httpx import ASGITransport, AsyncClient

from app.main import app

CSV = "time,aggregate,Kettle,Other\n" + "".join(
    f"2026-01-01T00:{m:02d}:00Z,{100 + 2000 * (m < 30)},{2000 * (m < 30)},100\n" for m in range(60)
)


async def test_import_and_read():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/v1/households/import", params={"household": "test-house"},
                         files={"file": ("d.csv", io.BytesIO(CSV.encode()), "text/csv")})
        assert r.status_code == 201, r.text
        assert r.json()["rows_per_device"] == {"aggregate": 60, "Kettle": 60, "Other": 60}
        hid = r.json()["household_id"]

        # re-import is an upsert, not a duplicate
        r2 = await c.post("/api/v1/households/import", params={"household": "test-house"},
                          files={"file": ("d.csv", io.BytesIO(CSV.encode()), "text/csv")})
        assert r2.json()["household_id"] == hid

        r = await c.get(f"/api/v1/households/{hid}/disaggregation",
                        params={"start": "2026-01-01T00:00:00Z", "end": "2026-01-01T01:00:00Z",
                                "bucket": "1 hour"})
        assert r.status_code == 200, r.text
        j = r.json()
        kettle = next(t for t in j["totals"] if t["name"] == "Kettle")
        assert abs(kettle["energy_wh"] - 1000) < 1  # 2000 W for 30 of 60 min
        assert 0 < kettle["share_pct"] < 100
        assert {s["name"] for s in j["series"]} == {"test-house", "Kettle", "Other"}


async def test_bad_csv():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/v1/households/import", params={"household": "x"},
                         files={"file": ("d.csv", io.BytesIO(b"a,b\n1,2\n"), "text/csv")})
        assert r.status_code == 422
