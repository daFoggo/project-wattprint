import uuid
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Device
from app.schemas.reading import BucketOut, ReadingsBulkIn
from app.services import readings as svc

router = APIRouter(prefix="/devices/{device_id}/readings", tags=["readings"])

Bucket = Literal["1 minute", "10 minutes", "1 hour", "1 day"]


async def _device_or_404(session: AsyncSession, device_id: uuid.UUID) -> Device:
    device = await session.get(Device, device_id)
    if not device:
        raise HTTPException(404, "Device not found")
    return device


@router.post("", status_code=201, operation_id="createReadings")
async def ingest(
    device_id: uuid.UUID, body: ReadingsBulkIn, session: AsyncSession = Depends(get_session)
):
    await _device_or_404(session, device_id)
    return {"inserted": await svc.bulk_insert(session, device_id, body.readings)}


@router.get("", response_model=list[BucketOut], operation_id="listReadings")
async def query(
    device_id: uuid.UUID,
    start: datetime,
    end: datetime,
    bucket: Bucket = "1 hour",
    session: AsyncSession = Depends(get_session),
):
    await _device_or_404(session, device_id)
    return await svc.bucketed(session, device_id, start, end, bucket)
