from fastapi import APIRouter

from app.api.v1.endpoints import devices, health, households, readings

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(devices.router)
api_router.include_router(readings.router)
api_router.include_router(households.router)
