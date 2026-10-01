from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session

router = APIRouter()


@router.get("/health", operation_id="getHealth")
async def health(session: AsyncSession = Depends(get_session)):
    result = await session.execute(
        text("SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'")
    )
    return {"status": "ok", "timescaledb": result.scalar()}
