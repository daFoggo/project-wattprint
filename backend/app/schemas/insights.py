"""Response models of the alerts and timeline endpoints."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.demo import ApplianceKey

Tone = Literal["warning", "info", "good"]
AlertCode = Literal["day_vs_yesterday", "tier_approaching", "tier_headroom", "tou_peak_share",
                    "month_forecast", "long_run", "big_share"]


Scope = Literal["event", "day", "month"]


class AlertOut(BaseModel):
    code: AlertCode = Field(description="Rule that raised it, stable for the app")
    tone: Tone
    at: datetime = Field(description="When it applies (UTC clock of the dataset)")
    text: str = Field(description="Sentence in Vietnamese, built from the figures of the window")
    scope: Scope = Field(description="`event`: happened at `at`; `day`: about today so far; "
                                     "`month`: about the billing month. Show a clock time only "
                                     "for `event`")
    appliance: ApplianceKey | None = None


class AlertsOut(BaseModel):
    household_id: uuid.UUID
    asof: datetime = Field(description="Alerts are computed from the start of this day up to here")
    items: list[AlertOut] = Field(description="Most important first, at most `limit`")


class RunOut(BaseModel):
    start: datetime
    end: datetime = Field(description="Exclusive: the minute after the last one ON")
    minutes: int
    energy_kwh: float
    peak_power_w: float


class ApplianceRuns(BaseModel):
    key: ApplianceKey
    name: str = Field(description="Display name (Vietnamese)")
    first_start: datetime
    last_end: datetime
    run_count: int
    minutes: int = Field(description="Total minutes ON")
    energy_kwh: float
    runs: list[RunOut] = Field(description="Chronological")


class TimelineOut(BaseModel):
    household_id: uuid.UUID
    date: date
    until: datetime = Field(description="Runs are looked for up to here (exclusive)")
    on_threshold_w: float = Field(description="An appliance is ON above this power")
    items: list[ApplianceRuns] = Field(description="Appliances that ran, by first start")
