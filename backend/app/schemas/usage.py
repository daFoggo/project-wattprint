"""Response models of the usage endpoints."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.billing import Scheme, TariffInfo
from app.schemas.demo import ApplianceKey, EnergyShare

Range = Literal["day", "week", "month"]


class PeriodOut(BaseModel):
    start: datetime
    end: datetime = Field(description="Exclusive: where the whole period ends")
    until: datetime = Field(description="Exclusive: what the figures cover; equals `end` for a "
                                        "period that is over")
    complete: bool


class Segment(BaseModel):
    key: str = Field(description="`band-0`..`band-5` on 6 tiers; `offpeak`, `normal`, `peak` on "
                                 "time of use", examples=["band-2"])
    label: str = Field(examples=["Bậc 3"])
    price_vnd: int = Field(description="VND/kWh before VAT")
    kwh: float
    cost_vnd: int = Field(description="With VAT; the segments of a bucket add up to its cost")


class Bucket(BaseModel):
    start: datetime
    kwh: float = Field(description="`0` after `period.until`")
    cost_vnd: int
    previous_kwh: float | None = Field(
        description="Same bucket of the previous period; `null` when that has no such bucket")
    previous_cost_vnd: int | None = Field(
        description="Its cost with VAT, priced as that whole period's bill")
    segments: list[Segment] = Field(description="Where the bucket's kWh and cost fall")


class Forecast(BaseModel):
    kwh: float = Field(description="Whole period if consumption continues at the pace so far")
    cost_vnd: int


class Insight(BaseModel):
    question: str = Field(description="Question the Copilot card offers (Vietnamese)")
    text: str = Field(description="What changed since the previous period, from the data")
    appliance: ApplianceKey | None = Field(description="Appliance the sentence is about")


class UsageOut(BaseModel):
    household_id: uuid.UUID
    range: Range
    offset: int = Field(le=0, description="0 = the period of `asof`, -1 the one before, ...")
    period: PeriodOut
    previous: PeriodOut = Field(description="Period before, cut at the same elapsed time")
    customer: str
    scheme: Scheme
    tariff: TariffInfo
    kwh: float
    cost_vnd: int = Field(description="With VAT")
    previous_kwh: float
    previous_cost_vnd: int
    delta_pct: float | None = Field(description="kWh against the previous period; `null` if that "
                                                "had no data")
    forecast: Forecast | None = Field(description="`null` for a period that is over")
    buckets: list[Bucket] = Field(description="3 hours (day) or 1 day (week, month)")
    devices: list[EnergyShare] = Field(description="Largest first; `cost_vnd` adds up to the cost")
    insight: Insight


class DeviceRuns(BaseModel):
    count: int
    minutes: int = Field(description="Total minutes ON")
    avg_power_w: float | None = Field(description="Mean power while ON")
    peak_power_w: float | None


class DeviceBucket(BaseModel):
    start: datetime
    kwh: float
    cost_vnd: int
    previous_kwh: float | None


class DeviceUsageOut(BaseModel):
    household_id: uuid.UUID
    key: ApplianceKey
    name: str
    range: Range
    offset: int
    period: PeriodOut
    kwh: float
    cost_vnd: int
    share_pct: float = Field(description="Share of the whole-house energy of the period")
    previous_kwh: float
    delta_pct: float | None
    runs: DeviceRuns | None = Field(
        description="`null` for `Other`, the part no model covers")
    buckets: list[DeviceBucket]
    note: str = Field(description="Sentence about this appliance, from the data (Vietnamese)")
