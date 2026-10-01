"""Demo API: ONE household (settings.DEMO_HOUSEHOLD), precomputed results only.

Nothing here runs a model. Series and energy come from the predicted 1-minute readings in the
database (`POST /households/import`); the evaluation against the sub-metered ground truth comes
from the snapshot generated offline (`app/demo/plegma_101.json`).
"""
import uuid
from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.problems import Problem, ValidationProblem
from app.demo import snapshot
from app.schemas import demo as s
from app.services import demo as svc
from app.services.readings import BUCKETS

router = APIRouter(prefix="/demo")
MAX_POINTS = 2000  # buckets per series and request
EPOCH = datetime(1970, 1, 1, tzinfo=UTC)

NOT_READY = {"model": Problem, "summary": "Demo data not available",
             "description": "The household series is not imported, or the snapshot is missing."}
INVALID = {"model": ValidationProblem, "summary": "Invalid parameters",
           "description": "Malformed value, `start` after `end`, or too many points."}


def _snap() -> dict:
    snap = snapshot()
    if snap is None:
        raise HTTPException(404, f"Demo snapshot {settings.DEMO_SNAPSHOT_PATH} is missing: run "
                                 "`make demo-snapshot` in nilmformer-experiment, then rebuild "
                                 "the backend.")
    return snap


async def _hid(session: AsyncSession) -> uuid.UUID:
    hid = await svc.household_id(session, settings.DEMO_HOUSEHOLD)
    if hid is None:
        raise HTTPException(404, f"Household '{settings.DEMO_HOUSEHOLD}' is not imported: "
                                 "POST /api/v1/households/import with its disaggregation CSV.")
    return hid


def _names() -> dict[str, str]:
    snap = snapshot() or {}
    return {a["key"]: a["name"] for a in snap.get("household", {}).get("appliances", [])}


def _utc(t: datetime) -> datetime:
    return t.replace(tzinfo=UTC) if t.tzinfo is None else t.astimezone(UTC)


def _window(start: datetime | None, end: datetime | None) -> tuple[datetime, datetime]:
    w = _snap()["household"]["sample_window"]
    start = _utc(start or datetime.fromisoformat(w["start"]))
    end = _utc(end or datetime.fromisoformat(w["end"]))
    if start >= end:
        raise _invalid(["query", "end"], "`end` must be after `start`")
    return start, end


def _invalid(loc: list[str], msg: str) -> RequestValidationError:
    return RequestValidationError([{"loc": loc, "msg": msg, "type": "value_error"}])


def _example(summary: str, value) -> dict:
    """Response example as an OpenAPI 3.2 Example Object (dataValue)."""
    return {"content": {"application/json": {"examples": {
        "plegma101": {"summary": summary, "dataValue": value}}}}}


def _snap_example(build, summary: str) -> dict:
    """Example built from the real snapshot by the same code as the endpoint."""
    snap = snapshot()
    return _example(summary, build(snap)) if snap else {}


def _household(snap: dict, hid: uuid.UUID | None) -> dict:
    h = dict(snap["household"])
    h["missing_pct"] = round(100 * h.pop("missing_share"), 2)
    h["metered_pct"] = round(100 * h.pop("metered_share"), 2)
    return {"household": {**h, "id": hid}, "model": snap["model"]}


START = Query(None, description="Window start, ISO 8601 (UTC if no offset). "
                                "Default: the sample window")
END = Query(None, description="Window end, exclusive. Default: the sample window")


# ---------------------------------------------------------------------------------- household
@router.get(
    "/household", response_model=s.HouseholdOut, operation_id="getDemoHousehold",
    tags=["demo-household"], summary="Household and model",
    description="Profile of the demo household (dataset, period, appliances, suggested window) and "
                "of the models that produced its results. Works without the database.",
    responses={200: {"summary": "Household profile",
                      **_snap_example(lambda x: _household(x, None), "Plegma House 101")},
               404: NOT_READY},
)
async def get_household(session: AsyncSession = Depends(get_session)):
    snap = _snap()
    try:
        hid = await svc.household_id(session, settings.DEMO_HOUSEHOLD)
    except (OSError, SQLAlchemyError):  # database down: the profile is still useful
        hid = None
    return _household(snap, hid)


# -------------------------------------------------------------------------------- consumption
@router.get(
    "/consumption", response_model=s.ConsumptionOut, operation_id="getDemoConsumption",
    tags=["demo-consumption"], summary="Power per appliance over a window",
    description="Whole-house power and the **predicted** power of every appliance, bucketed, with "
                "the energy and share of each appliance. Without parameters: one summer week "
                f"by hour. At most {MAX_POINTS} buckets per series.",
    responses={200: {"summary": "Bucketed series and totals"}, 404: NOT_READY, 422: INVALID},
)
async def get_consumption(
    start: datetime | None = START, end: datetime | None = END,
    bucket: s.Bucket = Query("1 hour", description="Bucket width"),
    session: AsyncSession = Depends(get_session),
):
    start, end = _window(start, end)
    n = (end - start) / BUCKETS[bucket]
    if n > MAX_POINTS:
        raise _invalid(["query", "bucket"],
                       f"{n:.0f} buckets of '{bucket}' exceed {MAX_POINTS}: use a larger bucket")
    hid = await _hid(session)
    names = _names()
    found: dict[tuple[str, str], dict] = {}
    for r in await svc.series(session, hid, start, end, bucket):
        found[(r["kind"], r["name"])] = found.get((r["kind"], r["name"]), {})
        found[(r["kind"], r["name"])][r["time"]] = {
            "time": r["time"], "avg_power_w": round(r["avg_power_w"], 1),
            "max_power_w": round(r["max_power_w"], 1), "energy_wh": round(r["energy_wh"], 2),
            "coverage": round(float(r["coverage"]), 3)}
    # every bucket of the window, also those without data (coverage 0), so charts keep their axis
    step = BUCKETS[bucket]
    t0 = EPOCH + (start - EPOCH) // step * step  # same alignment as time_bucket for these widths
    grid = [t0 + i * step for i in range(-(-(end - t0) // step))]

    def full(points: dict) -> list[dict]:
        return [points.get(t) or {"time": t, "avg_power_w": None, "max_power_w": None,
                                  "energy_wh": 0.0, "coverage": 0.0} for t in grid]

    agg = next((full(v) for (kind, _), v in found.items() if kind == "aggregate"), [])
    totals = _totals(await svc.energy(session, hid, start, end), names)
    return {
        "household_id": hid, "start": start, "end": end, "bucket": bucket, "aggregate": agg,
        "appliances": [{"key": n, "name": names.get(n, n), "points": full(v)}
                       for (kind, n), v in found.items() if kind == "appliance"],
        "totals": totals["items"], "aggregate_energy_kwh": totals["aggregate_kwh"],
    }


def _totals(rows, names: dict[str, str]) -> dict:
    agg = sum(r["energy_wh"] for r in rows if r["kind"] == "aggregate") / 1000
    items = sorted(({"key": r["name"], "name": names.get(r["name"], r["name"]),
                     "energy_kwh": round(r["energy_wh"] / 1000, 3),
                     "share_pct": round(100 * r["energy_wh"] / 1000 / agg, 2) if agg else 0.0}
                    for r in rows if r["kind"] == "appliance"), key=lambda x: -x["energy_kwh"])
    return {"aggregate_kwh": round(agg, 3), "items": items}


@router.get(
    "/breakdown", response_model=s.BreakdownOut, operation_id="getDemoBreakdown",
    tags=["demo-consumption"], summary="Energy share per appliance",
    description="Predicted energy and share of each appliance over a window (for a pie or bar "
                "chart). Without parameters: the whole recorded period.",
    responses={200: {"summary": "Energy per appliance"}, 404: NOT_READY, 422: INVALID},
)
async def get_breakdown(start: datetime | None = START, end: datetime | None = END,
                        session: AsyncSession = Depends(get_session)):
    p = _snap()["household"]["period"]
    start = _utc(start or datetime.fromisoformat(p["start"]))
    end = _utc(end or datetime.fromisoformat(p["end"]) + BUCKETS["1 minute"])
    if start >= end:
        raise _invalid(["query", "end"], "`end` must be after `start`")
    hid = await _hid(session)
    t = _totals(await svc.energy(session, hid, start, end), _names())
    return {"household_id": hid, "start": start, "end": end,
            "aggregate_energy_kwh": t["aggregate_kwh"], "totals": t["items"]}


# --------------------------------------------------------------------------------- evaluation
METHOD = ("Models never trained on this household. Thresholds and energy gains tuned on another "
          "household (Plegma 103). Compared minute by minute with the sub-metered ground truth.")


def _evaluation(snap: dict) -> dict:
    ev = snap["evaluation"]
    mix = [{"key": m["key"], "name": m["name"], "measured_kwh": m["measured_kwh"],
            "predicted_kwh": m["predicted_kwh"],
            "measured_share_pct": round(100 * m["measured_share"], 2),
            "predicted_share_pct": round(100 * m["predicted_share"], 2)} for m in ev["mix"]]
    return {"household": snap["household"]["name"], "method": METHOD, "mean_f1": ev["mean_f1"],
            "appliances": ev["appliances"], "mix": mix, "quarterly_f1": ev["quarterly_f1"],
            "findings": [{k: f[k] for k in ("appliance", "code", "text")} for f in ev["findings"]]}


@router.get(
    "/evaluation", response_model=s.EvaluationOut, operation_id="getDemoEvaluation",
    tags=["demo-evaluation"], summary="Accuracy against the ground truth",
    description="Per-appliance metrics (F1, MAE, SAE, ...), measured vs predicted energy mix, "
                "F1 per quarter and the main findings. Precomputed.",
    responses={200: {"summary": "Evaluation",
                      **_snap_example(_evaluation, "Plegma House 101")},
               404: NOT_READY},
)
async def get_evaluation():
    return _evaluation(_snap())


@router.get(
    "/evaluation/monthly", response_model=s.MonthlyOut, operation_id="listDemoMonthlyEnergy",
    tags=["demo-evaluation"], summary="Monthly energy, measured vs predicted",
    responses={200: {"summary": "One item per month"}, 404: NOT_READY},
)
async def get_monthly():
    snap = _snap()
    return {"household": snap["household"]["name"], "items": snap["monthly"]}


@router.get(
    "/evaluation/daily", response_model=s.DailyOut, operation_id="listDemoDailyEnergy",
    tags=["demo-evaluation"], summary="Daily energy, measured vs predicted",
    description="Days with at least 90 % of the minutes, optionally filtered by date.",
    responses={200: {"summary": "One item per day"}, 404: NOT_READY, 422: INVALID},
)
async def get_daily(
    start: date | None = Query(None, description="First day (inclusive)"),
    end: date | None = Query(None, description="Last day (inclusive)"),
):
    if start and end and start > end:
        raise _invalid(["query", "end"], "`end` must not be before `start`")
    snap = _snap()
    items = [d for d in snap["daily"]
             if (not start or d["date"] >= start.isoformat())
             and (not end or d["date"] <= end.isoformat())]
    return {"household": snap["household"]["name"], "items": items}


@router.get(
    "/evaluation/sample-day", response_model=s.SampleDayOut, operation_id="getDemoSampleDay",
    tags=["demo-evaluation"], summary="One day, measured vs predicted power",
    description="10-minute means of one summer day for every appliance. `null` marks an interval "
                "without data (the household has a 2-hour gap that day).",
    responses={200: {"summary": "144 ten-minute points"}, 404: NOT_READY},
)
async def get_sample_day():
    snap = _snap()
    return {"household": snap["household"]["name"], **snap["sample_day"]}
