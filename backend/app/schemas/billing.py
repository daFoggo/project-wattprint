"""Response models of the billing part of the demo API. Money is whole VND."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.billing.tariffs import Customer, Period

Scheme = Literal["tier", "tou"]


class TariffInfo(BaseModel):
    id: str = Field(examples=["residential_6_tier"])
    name: str = Field(examples=["Sinh hoạt 6 bậc"])
    source: str = Field(examples=["QĐ 1279/QĐ-BCT (09/05/2025)"])
    effective_from: date
    vat_rate: float = Field(examples=[0.08])


class Bill(BaseModel):
    subtotal_vnd: int = Field(description="Before VAT")
    vat_vnd: int
    total_vnd: int = Field(description="What the customer pays")


class BillingSummary(BaseModel):
    """How a window of the breakdown was priced."""
    customer: Customer
    scheme: Scheme
    tariff: TariffInfo
    bill: Bill


# -------------------------------------------------------------------------------- 6 tiers
class BandLine(BaseModel):
    index: int = Field(ge=0, description="0-based, Bậc 1 = 0")
    name: str = Field(examples=["Bậc 4"])
    from_kwh: float = Field(description="Cumulative kWh of the month where the band starts")
    to_kwh: float | None = Field(description="Where it ends; `null` for the last band")
    price_vnd: int = Field(description="VND/kWh before VAT")
    kwh: float = Field(description="kWh used in this band so far this month")
    cost_vnd: int = Field(description="Before VAT; rows can differ from the subtotal by a few dồng")


class DaySegment(BaseModel):
    band: int
    kwh: float


class TierDay(BaseModel):
    date: date
    kwh: float
    cost_vnd: int = Field(description="Before VAT, at the bands this day's kWh fall in")
    segments: list[DaySegment] = Field(description="The day's kWh split by band, in band order")


class TierStatus(BaseModel):
    band_index: int
    band_name: str
    headroom_kwh: float | None = Field(description="kWh left in the band; `null` in the last one")
    next_band_index: int | None
    next_band_name: str | None
    step_pct: int | None = Field(description="Price of the next band over the current, %")
    cross_day: int | None = Field(
        description="Day of the month the next band is reached at the current pace; `null` if not "
                    "this month")


class TierSection(BaseModel):
    bands: list[BandLine]
    daily: list[TierDay]
    status: TierStatus


# ------------------------------------------------------------------------------------ TOU
class PeriodLine(BaseModel):
    key: Period
    name: str = Field(examples=["Cao điểm"])
    hours: str = Field(examples=["T2–T7 09:30–11:30 · 17:00–20:00"])
    price_vnd: int = Field(description="VND/kWh before VAT")
    kwh: float
    share_pct: float
    cost_vnd: int = Field(description="Before VAT")


class TouDay(BaseModel):
    date: date
    kwh: float
    by_period: dict[Period, float]


class ScheduleInfo(BaseModel):
    id: str
    name: str
    source: str
    effective_from: date


class TouSection(BaseModel):
    schedule: ScheduleInfo
    flat_price_vnd: int = Field(
        description="Price per kWh of a customer below the mandatory threshold (25 kVA or "
                    "2,000 kWh/month), who has no 3-price meter")
    periods: list[PeriodLine]
    daily: list[TouDay]


# ------------------------------------------------------------------------------- response
class Forecast(BaseModel):
    kwh: float = Field(description="Whole month at the average pace so far")
    pace_kwh_per_day: float
    bill: Bill


class BillingOut(BaseModel):
    household_id: uuid.UUID
    customer: Customer
    scheme: Scheme = Field(description="`tier` for a household, `tou` for business/production")
    tariff: TariffInfo
    month: str = Field(pattern=r"^\d{4}-\d{2}$", examples=["2023-08"])
    asof: datetime = Field(description="The month is priced up to here (exclusive)")
    days_elapsed: float
    days_in_month: int
    kwh_to_date: float
    bill_to_date: Bill
    forecast: Forecast
    tier: TierSection | None = Field(description="Present when `scheme` is `tier`")
    tou: TouSection | None = Field(description="Present when `scheme` is `tou`")
