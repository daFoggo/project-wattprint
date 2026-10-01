"""Response models of the experiments endpoints (habit changes measured on the appliance's series)."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ExperimentAppliance = Literal["AC", "WaterHeater", "WashingMachine"]
Knob = Literal["minutes_per_day", "runs_per_week"]


class Baseline(BaseModel):
    lookback_days: int = Field(description="Days before `asof` the typical values come from")
    kwh_per_day: float
    minutes_per_day: float = Field(description="Minutes the appliance is ON, per day")
    runs_per_day: float
    avg_power_w: float | None = Field(description="Power while ON; `null` if it never ran")
    kwh_per_run: float | None


class Slider(BaseModel):
    min: int
    max: int
    step: int
    default: int


class Template(BaseModel):
    appliance: ExperimentAppliance
    name: str = Field(description="Display name (Vietnamese)")
    title: str = Field(description="What the customer would do")
    description: str
    knob: Knob = Field(description="What the slider changes")
    unit_label: str = Field(examples=["phút/ngày", "lần/tuần"])
    slider: Slider = Field(description="How much to cut, in `unit_label`")
    kwh_per_day_per_unit: float = Field(
        description="kWh a day saved per unit of the slider: the appliance's own power for "
                    "minutes, its energy per run (spread over 7 days) for runs")
    vnd_per_kwh: int = Field(description="Price of the next kWh with VAT (current band, or the "
                                         "normal-hours price on time of use)")
    baseline: Baseline
    available: bool = Field(description="False when the appliance barely ran: nothing to cut")


class TemplatesOut(BaseModel):
    household_id: uuid.UUID
    asof: datetime
    items: list[Template]


class Day(BaseModel):
    date: date
    kwh: float
    minutes: int
    runs: int
    complete: bool = Field(description="False for the day `asof` falls in, which is still going")


class ProgressOut(BaseModel):
    household_id: uuid.UUID
    appliance: ExperimentAppliance
    since: date
    asof: datetime
    baseline: Baseline
    days: list[Day] = Field(description="From `since` to the day of `asof`")
    saved_kwh: float = Field(description="Baseline minus measured, over complete days; may be "
                                         "negative")
    saved_vnd: int = Field(description="`saved_kwh` at the template's price")


class Action(BaseModel):
    appliance: ExperimentAppliance
    name: str = Field(description="Display name (Vietnamese)")
    knob: Knob
    unit_label: str
    amount: int = Field(description="How much to cut, in `unit_label`")
    slider: Slider
    kwh_per_day_per_unit: float
    saves_kwh_per_day: float = Field(description="`amount` x `kwh_per_day_per_unit`")


class Impact(BaseModel):
    kwh_per_day: float
    kwh_per_month: float = Field(description="30 days")
    vnd_per_month: int = Field(description="`kwh_per_month` at `vnd_per_kwh`, VAT included")


class Proposal(BaseModel):
    id: str = Field(examples=["single-AC", "scenario-balanced"])
    kind: Literal["single", "scenario"] = Field(
        description="`scenario` combines actions on several appliances run together")
    title: str
    summary: str = Field(description="What the customer would do")
    reason: str = Field(description="Why it is proposed: the household's own figures")
    appliances: list[ExperimentAppliance]
    actions: list[Action]
    impact: Impact
    featured: bool = Field(False, description="The one to try first: the balanced scenario when there is one, else the biggest saving. Always the first item")


class ProposalsOut(BaseModel):
    household_id: uuid.UUID
    asof: datetime
    vnd_per_kwh: int
    baselines: dict[str, Baseline] = Field(description="Typical day of each appliance, by key")
    items: list[Proposal] = Field(description="Biggest saving first")
