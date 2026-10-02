"""Demo copilot: suggested questions and answers computed from the household's series."""
import asyncio
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.billing_params import plan_params
from app.api.v1.endpoints.demo import INVALID, NOT_READY, _hid, _names, _snap, _utc
from app.billing.tariffs import Plan
from app.core import cache
from app.core.config import settings
from app.core.database import get_session
from app.schemas import copilot as s
from app.services import copilot as svc

router = APIRouter(prefix="/demo/copilot")

ASOF = Query(None, description="\"Now\". Default: the end of the recorded period")


def _asof(asof: datetime | None) -> datetime:
    if asof:
        return _utc(asof)
    end = _snap()["household"]["period"]["end"]
    return _utc(datetime.fromisoformat(end)) + timedelta(minutes=1)


@router.get(
    "/suggestions", response_model=s.SuggestionsOut, operation_id="listDemoCopilotSuggestions",
    tags=["demo-copilot"], summary="Questions the copilot can answer",
    description="Chips for the chat, worded for the customer's tariff. Each `intent` can be "
                "passed to `POST /demo/copilot/ask`.",
    responses={200: {"summary": "Suggestions"}, 404: NOT_READY, 422: INVALID},
)
async def list_suggestions(asof: datetime | None = ASOF, plan: Plan = Depends(plan_params),
                           session: AsyncSession = Depends(get_session)):
    return s.SuggestionsOut(household_id=await _hid(session), asof=_asof(asof),
                            items=svc.suggestions(plan))


@router.post(
    "/ask", response_model=s.Answer, operation_id="askDemoCopilot", tags=["demo-copilot"],
    summary="Answer a question from the household's data",
    description="Give an `intent` (a suggestion) or a free-text `question`, matched to an intent "
                "by keywords. The text is built from the figures in `facts`, which come from the "
                "same queries as the usage, billing and insights endpoints. A question the "
                "copilot cannot answer from the data gets `intent: unknown` and a list of what "
                "can be asked. There is no language model and no weather. Replies are held back "
                "about one to four seconds (`COPILOT_LATENCY_SCALE`), so the chat feels like one.",
    responses={200: {"summary": "Answer"}, 404: NOT_READY, 422: INVALID},
)
async def ask(body: s.AskIn, asof: datetime | None = ASOF, plan: Plan = Depends(plan_params),
              session: AsyncSession = Depends(get_session),
              x_warmup: str | None = Header(None, include_in_schema=False)):
    key = f"ask|{body.intent}|{(body.question or '').strip()}|{asof}|{plan}"
    answer = cache.memo_get(key)
    if answer is None:
        ctx = svc.Ctx(session, await _hid(session), _asof(asof), plan, _names())
        answer = await svc.answer(ctx, body.question, body.intent)
        cache.memo_set(key, answer)
    if not x_warmup:  # the pause is for people; the start-up warm-up skips it
        await asyncio.sleep(_pause(answer.text))
    return answer


def _pause(text: str) -> float:
    """Seconds to hold a reply back so it reads like an assistant thinking, not a lookup."""
    return settings.COPILOT_LATENCY_SCALE * min(1.2 + 0.005 * len(text), 4.0)
