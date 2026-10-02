"""Response models of the copilot (questions answered from the household's own series)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.demo import ApplianceKey

Intent = Literal["bill_change", "tier_budget", "standby", "top_appliance", "ac_runtime",
                 "heater_timing", "fridge_cycles", "forecast", "saving_plan", "month_compare",
                 "unknown"]


class Fact(BaseModel):
    label: str = Field(examples=["Điều hoà"])
    value: str = Field(examples=["+208,6 kWh"])


class Action(BaseModel):
    kind: Literal["experiment"] = Field(description="What the app can offer next")
    appliance: ApplianceKey = Field(description="Appliance the experiment would be about")
    label: str = Field(description="Button text (Vietnamese)")


class Suggestion(BaseModel):
    intent: Intent
    question: str = Field(description="Question in Vietnamese, as a chip")
    category: str = Field(description="Short upper-case topic", examples=["HÓA ĐƠN"])


class SuggestionsOut(BaseModel):
    household_id: uuid.UUID
    asof: datetime
    items: list[Suggestion] = Field(description="Most useful first, for this customer's tariff")


class AskIn(BaseModel):
    question: str | None = Field(None, max_length=300, description="Free text; matched to an "
                                 "intent by keywords. Ignored when `intent` is given")
    intent: Intent | None = Field(None, description="Ask a suggestion directly")


class Answer(BaseModel):
    household_id: uuid.UUID
    asof: datetime
    intent: Intent = Field(description="`unknown` when the question matched nothing the "
                                       "copilot can answer from the data")
    question: str = Field(description="The question as understood (a suggestion's text when "
                                      "`intent` was given)")
    category: str
    period: str = Field(description="What the answer covers", examples=["THÁNG 8"])
    text: str = Field(description="Answer in Vietnamese, built from the figures in `facts`")
    facts: list[Fact]
    action: Action | None = None
    follow_ups: list[Suggestion] = Field(
        default_factory=list,
        description="What to ask next, chosen from this answer: up to 3, never the question just "
                    "answered")
