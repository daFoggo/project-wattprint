"""Copilot and experiments on the real demo household (skipped when it is not imported)."""
import pytest
from httpx import ASGITransport, AsyncClient

from app.demo import snapshot
from app.main import app
from app.services.copilot import classify

pytestmark = pytest.mark.skipif(snapshot() is None, reason="demo snapshot missing")
NOW = "2023-08-31T23:59:00Z"
BASE = "/api/v1/demo"


@pytest.fixture(autouse=True)
def no_pause(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "COPILOT_LATENCY_SCALE", 0.0)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        yield c


async def call(client, method, path, **kw):
    r = await client.request(method, f"{BASE}/{path}", **kw)
    if r.status_code == 404:
        pytest.skip("demo household not imported in this database")
    return r


# ---------------------------------------------------------------------- free text, no database
@pytest.mark.parametrize("question,intent", [
    ("Điều hòa chạy bao lâu hôm nay?", "ac_runtime"),
    ("Bình nóng lạnh bật khung giờ nào tiết kiệm?", "heater_timing"),
    ("Tủ lạnh có bị đóng ngắt nhiều không", "fridge_cycles"),
    ("Làm sao để giữ nguyên bậc điện?", "tier_budget"),
    ("Cuối tháng tôi phải trả bao nhiêu tiền", "forecast"),
    ("Vì sao hóa đơn tăng so với tháng trước", "bill_change"),
    ("Thiết bị nào tốn điện nhất", "top_appliance"),
    ("Tải chạy nền ban đêm", "standby"),
    ("Xây dựng kế hoạch tiết kiệm", "saving_plan"),
    ("So sánh tiêu thụ các tháng", "month_compare"),
    ("Thời tiết ngày mai thế nào", "unknown"),
])
def test_questions_are_matched_to_an_intent(question, intent):
    assert classify(question) == intent


# -------------------------------------------------------------------------------------- copilot
async def test_every_suggestion_can_be_answered(client):
    r = await call(client, "GET", "copilot/suggestions", params={"asof": NOW})
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert len(items) >= 6
    for item in items:
        a = await call(client, "POST", "copilot/ask", params={"asof": NOW},
                       json={"intent": item["intent"]})
        assert a.status_code == 200, (item, a.text)
        j = a.json()
        assert j["intent"] == item["intent"] and j["text"] and j["facts"]
        assert "°C" not in j["text"]  # no weather: the data has none


async def test_tier_budget_matches_the_billing_page(client):
    a = (await call(client, "POST", "copilot/ask", params={"asof": NOW},
                    json={"intent": "tier_budget"})).json()
    bill = (await call(client, "GET", "billing", params={"month": "2023-08", "asof": NOW})).json()
    kwh = bill["kwh_to_date"]
    assert any(f["label"] == "Đã dùng đến nay" and f["value"].startswith(f"{kwh:,.1f}"
               .replace(",", "_").replace(".", ",").replace("_", ".")) for f in a["facts"])


async def test_unknown_question_is_answered_honestly(client):
    a = (await call(client, "POST", "copilot/ask", json={"question": "Mai có mưa không?"})).json()
    assert a["intent"] == "unknown" and a["facts"] == [] and "số liệu" in a["text"]


async def test_free_text_keeps_the_customers_words(client):
    a = (await call(client, "POST", "copilot/ask", params={"asof": NOW},
                    json={"question": "Điều hòa chạy mấy tiếng?"})).json()
    assert a["intent"] == "ac_runtime" and a["question"] == "Điều hòa chạy mấy tiếng?"


# ---------------------------------------------------------------------------------- experiments
async def test_templates_price_a_unit_from_the_appliances_own_power(client):
    r = await call(client, "GET", "experiments/templates", params={"asof": NOW})
    assert r.status_code == 200, r.text
    items = {t["appliance"]: t for t in r.json()["items"]}
    ac = items["AC"]
    assert ac["available"] and ac["baseline"]["avg_power_w"] > 0
    assert ac["kwh_per_day_per_unit"] == pytest.approx(ac["baseline"]["avg_power_w"] / 60000,
                                                       rel=0.01)
    assert ac["slider"]["min"] <= ac["slider"]["default"] <= ac["slider"]["max"]
    assert ac["vnd_per_kwh"] > 0


async def test_progress_counts_complete_days_only(client):
    r = await call(client, "GET", "experiments/progress",
                   params={"appliance": "AC", "since": "2023-08-28", "asof": NOW})
    assert r.status_code == 200, r.text
    j = r.json()
    assert [d["date"] for d in j["days"]] == ["2023-08-28", "2023-08-29", "2023-08-30",
                                             "2023-08-31"]
    assert [d["complete"] for d in j["days"]] == [True, True, True, False]
    expect = sum(j["baseline"]["kwh_per_day"] - d["kwh"] for d in j["days"] if d["complete"])
    assert j["saved_kwh"] == pytest.approx(expect, abs=0.01)


async def test_progress_rejects_a_start_in_the_future(client):
    r = await call(client, "GET", "experiments/progress",
                   params={"appliance": "AC", "since": "2023-09-05", "asof": NOW})
    assert r.status_code == 422


async def test_saving_plan_prices_each_lever_and_adds_up(client):
    a = (await call(client, "POST", "copilot/ask", params={"asof": NOW},
                    json={"intent": "saving_plan"})).json()
    assert a["facts"][-1]["label"] == "Tổng có thể tiết kiệm" and a["action"]["kind"] == "experiment"
    assert "°C" not in a["text"]


async def test_month_compare_lists_the_months_newest_first(client):
    a = (await call(client, "POST", "copilot/ask", params={"asof": NOW},
                    json={"intent": "month_compare"})).json()
    labels = [f["label"] for f in a["facts"]]
    assert labels[0] == "Tháng 8/2023" and labels[1] == "Tháng 7/2023" and len(labels) >= 2


async def test_proposals_include_scenarios_over_several_appliances(client):
    r = await call(client, "GET", "experiments/proposals", params={"asof": NOW})
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    rest = items[1:]  # the featured one goes first, the others by saving
    assert [p["impact"]["vnd_per_month"] for p in rest] == sorted(
        (p["impact"]["vnd_per_month"] for p in rest), reverse=True)
    singles = [p for p in items if p["kind"] == "single"]
    scenarios = [p for p in items if p["kind"] == "scenario"]
    assert singles and all(len(p["actions"]) == 1 for p in singles)
    if len(singles) >= 2:
        assert scenarios and all(len(p["appliances"]) >= 2 for p in scenarios)
        balanced = next(p for p in scenarios if p["id"] == "scenario-balanced")
        # a scenario saves what its actions save, no more
        assert balanced["impact"]["kwh_per_day"] == pytest.approx(
            sum(a["saves_kwh_per_day"] for a in balanced["actions"]), abs=0.002)
    for p in items:
        for a in p["actions"]:
            assert a["slider"]["min"] <= a["amount"] <= a["slider"]["max"]
            assert a["saves_kwh_per_day"] == pytest.approx(
                a["amount"] * a["kwh_per_day_per_unit"], abs=0.002)


async def test_one_proposal_is_featured_and_first(client):
    items = (await call(client, "GET", "experiments/proposals", params={"asof": NOW})).json()["items"]
    assert items[0]["featured"] and not any(p["featured"] for p in items[1:])


def test_cache_key_ignores_parameter_order_and_instant_spelling():
    from app.core.cache import key_of

    a = key_of("/api/v1/demo/usage", [("range", "week"), ("asof", "2023-08-31T23:59:00.000Z"), ("offset", "0")])
    b = key_of("/api/v1/demo/usage", [("offset", "0"), ("asof", "2023-08-31T23:59:00Z"), ("range", "week")])
    assert a == b
    assert key_of("/x", [("asof", "2023-08-31T23:59:00Z")]) != key_of("/x", [("asof", "2023-08-31T23:58:00Z")])
    assert key_of("/x", [("customer", "household")]) == "/x?customer=household"  # text is left alone


def test_the_pause_grows_with_the_answer_and_is_capped():
    from app.api.v1.endpoints.demo_copilot import _pause
    from app.core.config import settings

    settings.COPILOT_LATENCY_SCALE = 1.0
    try:
        assert _pause("") == pytest.approx(1.2)
        assert _pause("x" * 200) == pytest.approx(2.2)
        assert _pause("x" * 5000) == pytest.approx(4.0)
        settings.COPILOT_LATENCY_SCALE = 0.0
        assert _pause("x" * 200) == 0.0
    finally:
        settings.COPILOT_LATENCY_SCALE = 1.0


async def test_follow_ups_depend_on_the_answer(client):
    seen = {}
    for intent in ("saving_plan", "top_appliance", "month_compare", "standby", "fridge_cycles"):
        a = (await call(client, "POST", "copilot/ask", params={"asof": NOW},
                        json={"intent": intent})).json()
        ups = a["follow_ups"]
        assert 1 <= len(ups) <= 3 and intent not in [u["intent"] for u in ups]
        seen[intent] = tuple(u["intent"] for u in ups)
    assert len(set(seen.values())) == len(seen), seen  # each answer leads somewhere different
    # the biggest consumer's own question comes first after "which appliance costs most"
    assert seen["top_appliance"][0] == "ac_runtime"


async def test_unknown_question_still_offers_a_way_forward(client):
    a = (await call(client, "POST", "copilot/ask", json={"question": "Mai co mua khong?"})).json()
    assert a["intent"] == "unknown" and len(a["follow_ups"]) == 3
