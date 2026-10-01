"""Errors as RFC 9457 Problem Details (`application/problem+json`), for every endpoint."""
from http import HTTPStatus
from typing import Any

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_MEDIA_TYPE = "application/problem+json"


class Problem(BaseModel):
    """RFC 9457 problem details. Extension members may be added."""

    model_config = ConfigDict(extra="allow")

    type: str = Field("about:blank", description="URI reference identifying the problem type")
    title: str = Field(description="Short, human-readable summary of the problem type",
                       examples=["Not Found"])
    status: int = Field(description="HTTP status code", examples=[404])
    detail: str | None = Field(None, description="Explanation specific to this occurrence")
    instance: str | None = Field(None, description="URI reference of this occurrence (the path)")


class ValidationProblem(Problem):
    errors: list[dict[str, Any]] = Field(
        description="One entry per invalid input: `loc` (where), `msg` (why), `type` (error code)")


def problem(status: int, detail: str | None = None, request: Request | None = None,
            **extra: Any) -> JSONResponse:
    body = {"type": "about:blank", "title": HTTPStatus(status).phrase, "status": status,
            "detail": detail, "instance": request.url.path if request else None, **extra}
    return JSONResponse(jsonable_encoder(body), status_code=status, media_type=PROBLEM_MEDIA_TYPE)


def install(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        resp = problem(exc.status_code, str(exc.detail) if exc.detail else None, request)
        for k, v in (exc.headers or {}).items():
            resp.headers[k] = v
        return resp

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        errors = [{k: e[k] for k in ("loc", "msg", "type") if k in e} for e in exc.errors()]
        return problem(422, "The request parameters are invalid.", request, errors=errors)
