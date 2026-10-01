from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["timescaledb"]
