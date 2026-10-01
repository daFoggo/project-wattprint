import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.device import DeviceKind


class DeviceCreate(BaseModel):
    name: str
    kind: DeviceKind
    parent_id: uuid.UUID | None = None


class DeviceRead(DeviceCreate):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
