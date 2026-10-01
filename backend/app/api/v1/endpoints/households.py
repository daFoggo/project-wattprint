import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.readings import Bucket
from app.core.config import settings
from app.core.database import get_session
from app.models import Device, DeviceKind
from app.schemas.disaggregation import (DisaggregateIn, DisaggregationOut, HouseholdRead,
                                        ImportResult)
from app.services import disaggregation as svc

router = APIRouter(tags=["disaggregation"])


@router.get("/households", response_model=list[HouseholdRead],
            operation_id="listHouseholds")
async def list_households(session: AsyncSession = Depends(get_session)):
    houses = (
        await session.scalars(
            select(Device).where(Device.kind == DeviceKind.aggregate).order_by(Device.name)
        )
    ).all()
    out = []
    for h in houses:
        kids = (
            await session.scalars(
                select(Device).where(Device.parent_id == h.id).order_by(Device.name)
            )
        ).all()
        out.append(HouseholdRead(id=h.id, name=h.name, appliances=kids))
    return out


@router.post("/households/import", response_model=ImportResult, status_code=201,
             operation_id="importHouseholdDisaggregation")
async def import_disaggregation(
    household: str,
    file: UploadFile = File(..., description="CSV from nilmformer-experiment outputs"),
    session: AsyncSession = Depends(get_session),
):
    try:
        house, counts = await svc.import_csv(session, household, file.file)
    except (ValueError, KeyError) as e:
        await session.rollback()
        raise HTTPException(422, str(e)) from e
    return ImportResult(household_id=house.id, rows_per_device=counts)


@router.get("/households/{household_id}/disaggregation", response_model=DisaggregationOut,
            operation_id="getHouseholdDisaggregation")
async def get_disaggregation(
    household_id: uuid.UUID,
    start: datetime,
    end: datetime,
    bucket: Bucket = "1 hour",
    session: AsyncSession = Depends(get_session),
):
    house = await session.get(Device, household_id)
    if not house or house.kind != DeviceKind.aggregate:
        raise HTTPException(404, "Household not found")
    series, totals = await svc.household_series(session, household_id, start, end, bucket)
    return DisaggregationOut(
        household_id=household_id, start=start, end=end, bucket=bucket, totals=totals, series=series
    )


@router.post("/disaggregate", operation_id="disaggregateLive")
async def disaggregate(body: DisaggregateIn):
    """Whole-house power in, per-appliance power out. Proxies to the NILM inference service."""
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{settings.NILM_SERVICE_URL}/disaggregate", json=body.model_dump(mode="json")
            )
    except httpx.TransportError as e:
        raise HTTPException(503, f"NILM inference service unreachable: {e}") from e
    if r.status_code >= 400:
        raise HTTPException(r.status_code, r.json().get("detail", r.text))
    return r.json()
