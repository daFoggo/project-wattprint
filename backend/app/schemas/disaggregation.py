import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.device import DeviceRead
from app.schemas.reading import BucketOut


class HouseholdRead(BaseModel):
    id: uuid.UUID
    name: str
    appliances: list[DeviceRead]


class ImportResult(BaseModel):
    household_id: uuid.UUID
    rows_per_device: dict[str, int]


class SeriesOut(BaseModel):
    device_id: uuid.UUID
    name: str
    kind: str
    points: list[BucketOut]


class TotalOut(BaseModel):
    name: str
    energy_wh: float
    share_pct: float  # of the household aggregate energy over the window


class DisaggregationOut(BaseModel):
    household_id: uuid.UUID
    start: datetime
    end: datetime
    bucket: str
    totals: list[TotalOut]
    series: list[SeriesOut]


class DisaggregateIn(BaseModel):
    start: datetime
    power_w: list[float | None]
    stride: int | None = None
