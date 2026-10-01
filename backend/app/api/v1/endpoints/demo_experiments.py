"""Demo experiments: what a habit change is worth, and how a started one is going."""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.billing_params import plan_params
from app.api.v1.endpoints.demo import INVALID, NOT_READY, _hid, _invalid, _names, _snap, _utc
from app.billing.tariffs import Plan
from app.core.database import get_session
from app.schemas import experiments as s
from app.services import experiments as svc

router = APIRouter(prefix="/demo/experiments")

ASOF = Query(None, description="\"Now\". Default: the end of the recorded period")


def _asof(asof: datetime | None) -> datetime:
    if asof:
        return _utc(asof)
    end = _snap()["household"]["period"]["end"]
    return _utc(datetime.fromisoformat(end)) + timedelta(minutes=1)


@router.get(
    "/templates", response_model=s.TemplatesOut, operation_id="listDemoExperimentTemplates",
    tags=["demo-experiments"], summary="Habit changes worth trying",
    description="One template per appliance whose use can be cut: the appliance's typical day "
                "(7 days before `asof`, 28 for the washing machine), the slider range, and the kWh "
                "and VND a day each unit of the slider saves. The saving is the appliance's own "
                "measured power (or energy per run), not a percentage rule. `available: false` "
                "when it barely ran.",
    responses={200: {"summary": "Templates"}, 404: NOT_READY, 422: INVALID},
)
async def list_templates(asof: datetime | None = ASOF, plan: Plan = Depends(plan_params),
                         session: AsyncSession = Depends(get_session)):
    asof = _asof(asof)
    hid = await _hid(session)
    return s.TemplatesOut(household_id=hid, asof=asof,
                          items=await svc.templates(session, hid, asof, plan, _names()))


@router.get(
    "/progress", response_model=s.ProgressOut, operation_id="getDemoExperimentProgress",
    tags=["demo-experiments"], summary="How an experiment is going",
    description="Each day from `since` to the day of `asof`: kWh, minutes ON and runs of the "
                "appliance, against its baseline from the days before `since`. The saving counts "
                "complete days only.",
    responses={200: {"summary": "Progress"}, 404: NOT_READY, 422: INVALID},
)
async def get_progress(
    appliance: s.ExperimentAppliance = Query(...),
    since: date = Query(..., description="First day of the experiment, `YYYY-MM-DD`"),
    asof: datetime | None = ASOF, plan: Plan = Depends(plan_params),
    session: AsyncSession = Depends(get_session),
):
    asof = _asof(asof)
    if since > asof.date():
        raise _invalid(["query", "since"], "`since` must not be after `asof`")
    return await svc.progress(session, await _hid(session), appliance, since, asof, plan)


@router.get(
    "/proposals", response_model=s.ProposalsOut, operation_id="listDemoExperimentProposals",
    tags=["demo-experiments"], summary="Experiments proposed for this household",
    description="What to try, from the household's own data: one proposal per appliance that "
                "ran enough to cut, and `scenario` proposals that run several together (a "
                "balanced and a maximum one). Each lists its actions with the slider range, the "
                "reason in the household's figures and the saving per month. Biggest saving "
                "first. Empty when no appliance ran enough.",
    responses={200: {"summary": "Proposals"}, 404: NOT_READY, 422: INVALID},
)
async def list_proposals(asof: datetime | None = ASOF, plan: Plan = Depends(plan_params),
                         session: AsyncSession = Depends(get_session)):
    return await svc.proposals(session, await _hid(session), _asof(asof), plan, _names())
