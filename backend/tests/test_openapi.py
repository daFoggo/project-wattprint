import json
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app

# official schema: https://spec.openapis.org/oas/3.2/schema/2025-09-17
OAS32 = Path(__file__).parent / "schemas" / "oas-3.2-2025-09-17.json"


async def _spec() -> dict:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/v1/openapi.json")
    assert r.status_code == 200
    return r.json()


async def test_valid_openapi_3_2():
    jsonschema = pytest.importorskip("jsonschema")
    spec = await _spec()
    assert spec["openapi"] == "3.2.0"
    jsonschema.Draft202012Validator(json.loads(OAS32.read_text())).validate(spec)


async def test_3_2_features_and_problem_details():
    spec = await _spec()
    tags = {t["name"]: t for t in spec["tags"]}
    ops = [op for item in spec["paths"].values() for op in item.values()]
    used = {t for op in ops for t in op.get("tags", [])}
    assert used <= set(tags), used - set(tags)
    assert all(tags[t].get("parent") in (None, *tags) for t in tags)
    assert spec["servers"][0]["name"]
    ops = {op["operationId"]: op for item in spec["paths"].values() for op in item.values()}
    assert len(ops) == sum(len(item) for item in spec["paths"].values()), "operationId not unique"
    demo = [o for o in ops.values() if any(t.startswith("demo") for t in o["tags"])]
    assert len(demo) == 17
    for op in demo:
        assert op["responses"]["200"]["summary"]
        assert "application/problem+json" in op["responses"]["404"]["content"]
    for op in ops.values():
        if "422" in op["responses"]:
            assert list(op["responses"]["422"]["content"]) == ["application/problem+json"]
    assert "HTTPValidationError" not in spec["components"]["schemas"]
    ex = ops["getDemoEvaluation"]["responses"]["200"]["content"]["application/json"]["examples"]
    assert "dataValue" in next(iter(ex.values()))


async def test_errors_are_problem_details():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.get("/api/v1/demo/evaluation/daily", params={"start": "not-a-date"})
        assert r.status_code == 422
        assert r.headers["content-type"] == "application/problem+json"
        body = r.json()
        assert body["status"] == 422 and body["title"] and body["errors"][0]["loc"]
        r = await c.get("/api/v1/devices/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404 and r.json()["instance"].endswith("0000")
