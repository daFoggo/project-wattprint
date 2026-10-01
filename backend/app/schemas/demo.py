"""Response models of the demo API (one household, precomputed NILM results)."""
import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field

ApplianceKey = Literal["AC", "WaterHeater", "Fridge", "WashingMachine", "Other"]
MeteredKey = Literal["AC", "WaterHeater", "Fridge", "WashingMachine"]
Bucket = Literal["1 minute", "10 minutes", "1 hour", "1 day"]
Verdict = Literal["accurate", "detected_reliably_energy_underestimated",
                  "good_except_constant_draw_days", "weak_low_impact"]


# ---------------------------------------------------------------------------------- household
class Appliance(BaseModel):
    key: ApplianceKey = Field(description="Stable identifier (device name in the database)")
    name: str = Field(description="Display name (Vietnamese)", examples=["Điều hoà"])
    name_en: str = Field(examples=["Air conditioner"])
    kind: Literal["appliance", "residual"] = Field(
        description="`residual`: whole-house power minus every modelled appliance")


class Period(BaseModel):
    start: datetime
    end: datetime


class Window(Period):
    bucket: Bucket


class Household(BaseModel):
    id: uuid.UUID | None = Field(
        description="Household id in the database; `null` if its series is not imported yet")
    name: str = Field(examples=["Plegma House 101"])
    dataset: str = Field(description="Public dataset the household comes from", examples=["Plegma"])
    country: str = Field(description="ISO 3166-1 alpha-2", examples=["GR"])
    dataset_license: str = Field(examples=["CC BY 4.0"])
    period: Period = Field(description="First and last minute with data")
    timezone_note: str
    sampling_interval_seconds: int = Field(examples=[60])
    valid_days: float = Field(description="Days with a whole-house reading", examples=[426.9])
    missing_pct: float = Field(ge=0, le=100, description="Minutes without whole-house reading, %")
    aggregate_energy_kwh: float = Field(description="Whole-house energy over the period")
    metered_pct: float = Field(
        ge=0, le=100, description="Share of that energy used by the modelled appliances, %")
    held_out: bool = Field(description="True: no model was trained on this household")
    appliances: list[Appliance]
    sample_window: Window = Field(description="Suggested window for a first chart (a summer week)")


class ApplianceModel(BaseModel):
    appliance: MeteredKey
    training_datasets: list[str] = Field(examples=[["Plegma", "PRECON"]])
    training_houses: int
    validation_house: int
    epochs: int = Field(description="Epochs run before early stopping")
    best_epoch: int = Field(description="Epoch whose weights are kept")


class ModelInfo(BaseModel):
    name: str = Field(examples=["NILMFormer"])
    parameters: int = Field(examples=[383283])
    window_minutes: int
    sampling: str
    paper: str = Field(examples=["arXiv:2506.05880"])
    git_commit: str | None
    per_appliance: list[ApplianceModel]


class HouseholdOut(BaseModel):
    household: Household
    model: ModelInfo


# -------------------------------------------------------------------------------- consumption
class PowerPoint(BaseModel):
    time: datetime = Field(description="Bucket start (UTC)")
    avg_power_w: float | None = Field(description="`null`: no reading in the bucket")
    max_power_w: float | None
    energy_wh: float = Field(description="Energy of the minutes with data (1-minute readings / 60)")
    coverage: float = Field(ge=0, le=1, description="Share of the bucket's minutes with data")


class ApplianceSeries(BaseModel):
    key: ApplianceKey
    name: str
    points: list[PowerPoint]


class EnergyShare(BaseModel):
    key: ApplianceKey
    name: str
    energy_kwh: float
    share_pct: float = Field(description="Share of the whole-house energy of the window, %")


class ConsumptionOut(BaseModel):
    household_id: uuid.UUID
    start: datetime
    end: datetime
    bucket: Bucket
    aggregate: list[PowerPoint] = Field(description="Whole-house (metered) power")
    appliances: list[ApplianceSeries] = Field(description="Predicted power per appliance")
    totals: list[EnergyShare]
    aggregate_energy_kwh: float


class BreakdownOut(BaseModel):
    household_id: uuid.UUID
    start: datetime
    end: datetime
    aggregate_energy_kwh: float
    totals: list[EnergyShare] = Field(description="Predicted energy per appliance, largest first")


# --------------------------------------------------------------------------------- evaluation
class ApplianceMetrics(BaseModel):
    key: MeteredKey
    name: str
    verdict: Verdict
    f1: float = Field(ge=0, le=1, description="ON/OFF F1 per minute")
    precision: float = Field(ge=0, le=1)
    recall: float = Field(ge=0, le=1)
    mae_w: float = Field(description="Mean absolute error, W")
    rmse_w: float
    sae: float | None = Field(description="|E_pred - E_true| / E_true over the period")
    nde: float = Field(description="Normalised disaggregation error")
    matching_ratio: float = Field(ge=0, le=1, description="sum(min) / sum(max) (paper metric)")
    measured_kwh: float
    predicted_kwh: float
    on_minutes: int = Field(description="Minutes the appliance is ON in the ground truth")


class MixItem(BaseModel):
    key: ApplianceKey
    name: str
    measured_kwh: float
    predicted_kwh: float
    measured_share_pct: float
    predicted_share_pct: float


class QuarterF1(BaseModel):
    appliance: MeteredKey
    quarter: str = Field(pattern=r"^Q[1-4]/\d{4}$", examples=["Q3/2023"])
    f1: float = Field(ge=0, le=1)


class Finding(BaseModel):
    appliance: MeteredKey
    code: str = Field(examples=["fridge_constant_draw"])
    text: str = Field(description="Explanation (Vietnamese)")


class EvaluationOut(BaseModel):
    household: str
    method: str = Field(description="How the numbers were obtained")
    mean_f1: float
    appliances: list[ApplianceMetrics]
    mix: list[MixItem] = Field(description="Energy mix over the whole period")
    quarterly_f1: list[QuarterF1]
    findings: list[Finding]


class EnergyPair(BaseModel):
    measured_kwh: float | None = Field(description="Sub-metered ground truth")
    predicted_kwh: float | None


class MonthEnergy(BaseModel):
    month: str = Field(pattern=r"^\d{4}-\d{2}$", examples=["2023-07"])
    days: float = Field(description="Days with data in the month")
    aggregate_kwh: float
    appliances: dict[MeteredKey, EnergyPair]


class DayEnergy(BaseModel):
    date: date
    aggregate_kwh: float
    appliances: dict[MeteredKey, EnergyPair]


class MonthlyOut(BaseModel):
    household: str
    items: list[MonthEnergy]


class DailyOut(BaseModel):
    household: str
    items: list[DayEnergy] = Field(description="Days with at least 90 % of the minutes")


class PowerPair(BaseModel):
    measured_w: float | None
    predicted_w: float | None


class SamplePoint(BaseModel):
    time: datetime
    aggregate_w: float | None = Field(description="`null`: no data in this interval")
    appliances: dict[MeteredKey, PowerPair]


class SampleDayOut(BaseModel):
    household: str
    date: date
    interval_minutes: int
    points: list[SamplePoint]
