"""NILM inference API: whole-house power in, per-appliance power out.

    uvicorn service.main:app --host 0.0.0.0 --port 8000
"""
from contextlib import asynccontextmanager
from datetime import datetime

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field

from pipeline.engine import NILMInferenceEngine

MAX_SAMPLES = 200_000


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.engine = NILMInferenceEngine()
    yield


app = FastAPI(title="WattPrint NILM inference", lifespan=lifespan)


class DisaggregateIn(BaseModel):
    start: datetime = Field(description="timestamp of the first sample (naive = UTC)")
    power_w: list[float | None] = Field(
        description="aggregate power in W, one value per sampling step; null = missing")
    stride: int | None = Field(None, description="window stride; smaller = overlap-averaged")


def _clean(df: pd.DataFrame):
    return {c: [None if np.isnan(x) else round(float(x), 2) for x in df[c].to_numpy()]
            for c in df.columns}


@app.get("/health")
def health(request: Request):
    e = request.app.state.engine
    return {"status": "ok", "device": e.device, "appliances": e.appliances,
            "window_size": e.window_size, "sampling_rate": e.sampling_rate}


@app.post("/disaggregate")
def disaggregate(body: DisaggregateIn, request: Request):
    e = request.app.state.engine
    n = len(body.power_w)
    if n < e.window_size:
        raise HTTPException(422, f"need at least {e.window_size} samples, got {n}")
    if n > MAX_SAMPLES:
        raise HTTPException(422, f"at most {MAX_SAMPLES} samples per request")
    index = pd.date_range(pd.Timestamp(body.start).tz_localize(None), periods=n,
                          freq=e.sampling_rate)
    power = pd.Series(np.array(body.power_w, dtype=float), index=index)
    res = e.disaggregate(power, stride=body.stride)
    return {"start": index[0].isoformat() + "Z", "sampling_rate": e.sampling_rate,
            "n": n, "series_w": _clean(res)}
