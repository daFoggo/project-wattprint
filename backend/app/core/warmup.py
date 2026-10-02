"""Computes, in the background at start-up, the answers the mobile app asks for first.

The demo household never changes, so every answer is a pure function of its URL. Doing the work
once while the process starts means the app's first request is a cache hit instead of a few
hundred milliseconds of SQL and pricing. The URLs are the ones the app builds (see
`mobile-app/src/features/energy/api.ts`); the cache key ignores parameter order and the spelling
of instants, so only the parameters themselves must match.
"""
import asyncio
import logging

import httpx

from app.core.config import settings

log = logging.getLogger("warmup")

API = settings.API_V1_PREFIX
RANGES = ("day", "week", "month")
DEVICES = ("AC", "WaterHeater", "Fridge", "WashingMachine", "Other")
INTENTS = ("saving_plan", "month_compare", "top_appliance", "bill_change", "tier_budget",
           "standby", "ac_runtime", "heater_timing", "fridge_cycles", "forecast")


def urls(asof: str) -> list[str]:
    day, month = asof[:10], asof[:7]
    out = [
        "/demo/household",
        f"/demo/billing?month={month}&asof={asof}&customer=household",
        f"/demo/alerts?asof={asof}&customer=household",
        f"/demo/timeline?date={day}&until={asof}",
        f"/demo/copilot/suggestions?asof={asof}",
        f"/demo/experiments/templates?asof={asof}",
        f"/demo/experiments/proposals?asof={asof}",
    ]
    for r in RANGES:  # the screen, then one step back with the chevron
        out += [f"/demo/usage?range={r}&offset={o}&asof={asof}" for o in (0, -1)]
    out += [f"/demo/usage/devices/{k}?range=month&offset=0&asof={asof}" for k in DEVICES]
    out += [f"/demo/usage/devices/{k}?range={r}&offset=0&asof={asof}"
            for k in DEVICES for r in ("day", "week")]
    return out


async def warm(app) -> None:
    asof = settings.DEMO_WARM_ASOF
    if not asof:
        return
    await asyncio.sleep(1)  # let the server start answering first
    transport = httpx.ASGITransport(app=app)
    done = failed = 0
    async with httpx.AsyncClient(transport=transport, base_url="http://warmup") as client:
        calls = [client.get(API + u) for u in urls(asof)]
        for coro in calls:  # one at a time: real requests keep priority on the event loop
            try:
                r = await coro
                done += r.status_code == 200
                failed += r.status_code != 200
            except Exception:  # noqa: BLE001 - warm-up must never take the server down
                failed += 1
        for intent in INTENTS:
            try:
                r = await client.post(f"{API}/demo/copilot/ask", params={"asof": asof},
                                      json={"intent": intent}, headers={"x-warmup": "1"})
                done += r.status_code == 200
                failed += r.status_code != 200
            except Exception:  # noqa: BLE001
                failed += 1
    log.info("warm-up: %d answers cached, %d failed (asof %s)", done, failed, asof)
