"""OpenAPI 3.2 document (https://spec.openapis.org/oas/v3.2.0).

FastAPI emits 3.1-shaped documents; the JSON Schema dialect (2020-12) is the same in 3.2, so we
generate with FastAPI and add what 3.2 changes:
  * `openapi: 3.2.0`, named servers (`Server.name`)
  * hierarchical tags (`Tag.summary`, `Tag.parent`, `Tag.kind`)
  * `Response.summary`, examples as `Example.dataValue`
  * errors documented as RFC 9457 `application/problem+json` (also what the handlers send)
Checked against the official 3.2 schema in tests/test_openapi.py.
"""
import json

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.core.problems import PROBLEM_MEDIA_TYPE, Problem, ValidationProblem

OPENAPI_VERSION = "3.2.0"
VERSION = "0.2.0"
SUMMARY = "Household energy disaggregation (NILM) for WattPrint"
DESCRIPTION = """\
Whole-house power in, appliance-level consumption out.

* **Demo** — one household (Plegma House 101), every result precomputed: no model runs, every
  call answers in milliseconds. Start with `GET /api/v1/demo/household`.
* **Platform** — devices, raw readings, CSV import of NILM results and live disaggregation.

Errors follow RFC 9457 (`application/problem+json`). Times are ISO 8601, UTC.
"""
TAGS = [
    {"name": "demo", "kind": "nav", "summary": "Demo",
     "description": "One household, precomputed results only (no model run)."},
    {"name": "demo-household", "parent": "demo", "kind": "nav", "summary": "Household",
     "description": "Who the household is and which models produced its results."},
    {"name": "demo-consumption", "parent": "demo", "kind": "nav", "summary": "Consumption",
     "description": "Predicted power and energy per appliance (from the database)."},
    {"name": "demo-evaluation", "parent": "demo", "kind": "nav", "summary": "Evaluation",
     "description": "Predictions compared with the household's sub-metered ground truth."},
    {"name": "platform", "kind": "nav", "summary": "Platform",
     "description": "General endpoints, not tied to the demo household."},
    {"name": "health", "parent": "platform", "kind": "nav", "summary": "Health"},
    {"name": "devices", "parent": "platform", "kind": "nav", "summary": "Devices",
     "description": "Meters: a household (`aggregate`) and its appliances."},
    {"name": "readings", "parent": "platform", "kind": "nav", "summary": "Readings",
     "description": "Raw power readings of a device, bucketed on read."},
    {"name": "disaggregation", "parent": "platform", "kind": "nav", "summary": "Disaggregation",
     "description": "Import NILM results, read them per household, or run the model live."},
]
SERVERS = [{"url": "/", "name": "current", "description": "The host serving this document"}]
METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace", "query"}


def _ref(name: str) -> dict:
    return {"$ref": f"#/components/schemas/{name}"}


def build(app: FastAPI) -> dict:
    spec = get_openapi(title=app.title, version=VERSION, openapi_version=OPENAPI_VERSION,
                       summary=SUMMARY, description=DESCRIPTION, routes=app.routes, tags=TAGS,
                       servers=SERVERS)
    schemas = spec.setdefault("components", {}).setdefault("schemas", {})
    for model in (Problem, ValidationProblem):
        schemas[model.__name__] = model.model_json_schema(
            ref_template="#/components/schemas/{model}")

    for item in spec["paths"].values():
        for method, op in item.items():
            if method not in METHODS:
                continue
            for code, resp in op["responses"].items():
                ref = resp.get("content", {}).get("application/json", {}).get("schema", {})
                if code == "422":
                    resp["summary"] = resp.get("summary", "Invalid parameters")
                    resp["description"] = resp.get("description") or "Validation error"
                    resp["content"] = {PROBLEM_MEDIA_TYPE: {"schema": _ref("ValidationProblem")}}
                elif ref.get("$ref", "").rsplit("/", 1)[-1] in ("Problem", "ValidationProblem"):
                    resp["content"] = {PROBLEM_MEDIA_TYPE: resp["content"].pop("application/json")}
            op["responses"].setdefault("default", {
                "summary": "Error", "description": "Any other error, as RFC 9457 problem details",
                "content": {PROBLEM_MEDIA_TYPE: {"schema": _ref("Problem")}}})

    # FastAPI's own 422 models are replaced by ValidationProblem: drop them once unreferenced
    for name in ("HTTPValidationError", "ValidationError"):
        rest = {**spec, "components": {"schemas": {k: v for k, v in schemas.items() if k != name}}}
        if f'/schemas/{name}"' not in json.dumps(rest):
            schemas.pop(name, None)
    return spec


def install(app: FastAPI) -> None:
    def openapi():
        if app.openapi_schema is None:
            app.openapi_schema = build(app)
        return app.openapi_schema
    app.openapi = openapi
