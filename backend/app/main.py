import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

from app.api.v1.router import api_router
from app.core import openapi, problems
from app.core.cache import DemoCacheMiddleware
from app.core.warmup import warm
from app.core.config import settings

# this Swagger UI release renders OpenAPI 3.2; pinned so the docs keep matching the document
SWAGGER_UI = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.33.0"

@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(warm(app))  # computed in the background, never blocks start-up
    yield
    task.cancel()


app = FastAPI(title=settings.PROJECT_NAME, version=openapi.VERSION, lifespan=lifespan,
              openapi_url=f"{settings.API_V1_PREFIX}/openapi.json", docs_url=None, redoc_url=None)

if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.add_middleware(DemoCacheMiddleware, prefix=settings.API_V1_PREFIX)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
problems.install(app)
openapi.install(app)


@app.get("/docs", include_in_schema=False)
async def docs():
    return get_swagger_ui_html(openapi_url=app.openapi_url, title=f"{app.title} - Swagger UI",
                               swagger_js_url=f"{SWAGGER_UI}/swagger-ui-bundle.js",
                               swagger_css_url=f"{SWAGGER_UI}/swagger-ui.css")
