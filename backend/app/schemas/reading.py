from datetime import datetime

from pydantic import BaseModel


class ReadingIn(BaseModel):
    time: datetime
    power_w: float


class ReadingsBulkIn(BaseModel):
    readings: list[ReadingIn]


class BucketOut(BaseModel):
    bucket: datetime
    avg_power_w: float
    max_power_w: float
    energy_wh: float
