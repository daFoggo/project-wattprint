from fastapi import APIRouter

from app.api.v1.endpoints import demo, demo_billing, demo_copilot, demo_experiments, demo_insights, demo_usage, devices, health, households, readings

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(devices.router)
api_router.include_router(readings.router)
api_router.include_router(households.router)
api_router.include_router(demo.router)
api_router.include_router(demo_billing.router)
api_router.include_router(demo_insights.router)
api_router.include_router(demo_usage.router)
api_router.include_router(demo_copilot.router)
api_router.include_router(demo_experiments.router)
