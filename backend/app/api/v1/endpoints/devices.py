import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Device
from app.schemas.device import DeviceCreate, DeviceRead

router = APIRouter(prefix="/devices", tags=["devices"])


@router.post("", response_model=DeviceRead, status_code=201,
             operation_id="createDevice")
async def create_device(body: DeviceCreate, session: AsyncSession = Depends(get_session)):
    device = Device(**body.model_dump())
    session.add(device)
    await session.commit()
    await session.refresh(device)
    return device


@router.get("", response_model=list[DeviceRead], operation_id="listDevices")
async def list_devices(session: AsyncSession = Depends(get_session)):
    return (await session.scalars(select(Device).order_by(Device.created_at))).all()


@router.get("/{device_id}", response_model=DeviceRead, operation_id="getDevice")
async def get_device(device_id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    device = await session.get(Device, device_id)
    if not device:
        raise HTTPException(404, "Device not found")
    return device
