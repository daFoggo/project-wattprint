"""Pre-flight validation: run the WHOLE chain on a tiny budget (minutes) before a long training.

    docker compose run --rm pipeline python -m pipeline.validate

Uses a separate artifacts dir (artifacts/_validate) so nothing real is overwritten; the per-house
data cache is shared. Exit code 1 if any check fails.
"""
import os
import subprocess
import sys
import time
from pathlib import Path

os.environ["CACHE_DIR"] = str(Path(os.environ.get("ARTIFACTS", "artifacts")) / "cache")
os.environ["ARTIFACTS"] = str(Path(os.environ.get("ARTIFACTS", "artifacts")) / "_validate")

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import torch  # noqa: E402
import yaml  # noqa: E402

from pipeline.common import ART, DATA_PATH, load_config  # noqa: E402

RESULTS = []


def check(name):
    def deco(fn):
        t = time.time()
        try:
            detail = fn() or ""
            RESULTS.append((name, True, detail, time.time() - t))
        except Exception as e:  # noqa: BLE001
            RESULTS.append((name, False, f"{type(e).__name__}: {e}", time.time() - t))
        r = RESULTS[-1]
        print(f"[{'PASS' if r[1] else 'FAIL'}] {r[0]:<28} {r[3]:6.1f}s  {r[2]}", flush=True)
        return fn
    return deco


def run(*args):
    r = subprocess.run([sys.executable, "-m", *args], capture_output=True, text=True,
                       env=os.environ)
    if r.returncode:
        raise RuntimeError((r.stdout + r.stderr)[-1500:])
    return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""


@check("gpu")
def _():
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA not available in the container (driver / nvidia-container-toolkit?)")
    p = torch.cuda.get_device_properties(0)
    x = torch.randn(512, 512, device="cuda")
    assert torch.isfinite(x @ x).all()
    return f"{p.name} sm_{p.major}{p.minor} {p.total_memory / 2**30:.0f}GB torch {torch.__version__}"


@check("data files")
def _():
    d = Path(DATA_PATH)
    labels = pd.read_csv(d / "HOUSES_Labels").set_index("House_id")
    missing = [i for i in range(1, 22) if i != 14 and not (d / f"CLEAN_House{i}.csv").exists()]
    assert not missing, f"missing CLEAN_House csv: {missing}"
    for h in (2, 9):  # header width must match the labels file
        ncol = len(pd.read_csv(d / f"CLEAN_House{h}.csv", nrows=2).columns)
        assert ncol == len(labels.loc[h].dropna()) or ncol == len(labels.loc[h]), f"house {h}"
    return "20 houses + labels OK"


@check("config = paper protocol")
def _():
    c = load_config("Kettle")
    got = (c.epochs, c.p_es, c.p_rlr, c.batch_size, c.model_training_param.lr)
    assert got == (50, 10, 5, 64, 1e-4), got
    return f"epochs/p_es/p_rlr/batch/lr = {got}"


@check("model size (paper 0.385M)")
def _():
    from src.helpers.expes import get_model_instance
    c = load_config("Kettle")
    n = sum(p.numel() for p in get_model_instance(
        "NILMFormer", c_in=1 + 2 * len(c.list_exo_variables), window_size=128,
        **c.model_kwargs).parameters())
    assert abs(n - 385_000) / 385_000 < 0.05, f"{n} params differs from the paper"
    return f"{n:,} params"


@check("exogenous features")
def _():
    from pipeline.common import FastNILMDataset
    from src.helpers.dataset import NILMDataset
    X = np.random.rand(5, 2, 2, 128)
    st = pd.DataFrame({"start_date": pd.date_range("2014-03-02 23:50", periods=5, freq="777min")})
    exo = ["minute", "hour", "dow", "month"]
    a, b = NILMDataset(X, list_exo_variables=exo, st_date=st, freq="1min"), \
        FastNILMDataset(X, st, exo, "1min")
    d = max(np.abs(a[i][0] - b[i][0]).max() for i in range(5))
    assert d < 1e-5, d
    return f"fast == original (max diff {d:.1e})"


@check("mini train (1 epoch)")
def _():
    return run("pipeline.train", "--appliance", "Kettle", "--epochs", "1", "--train-houses",
               "3", "4", "--max-windows", "3000")


@check("resume")
def _():
    return run("pipeline.train", "--appliance", "Kettle", "--epochs", "1", "--train-houses",
               "3", "4", "--max-windows", "3000", "--resume")


@check("predict (house 2, 3000 min)")
def _():
    return run("pipeline.predict", "--house", "2", "--apps", "Kettle", "--limit", "3000",
               "--stride", "64")


@check("postprocess")
def _():
    out = run("pipeline.postprocess", "run", "--house", "2")
    csv = pd.read_csv(ART / "outputs" / "house_2_disaggregation.csv")
    assert {"time", "aggregate", "Kettle", "Other"} <= set(csv.columns), list(csv.columns)
    assert (csv[["Kettle", "Other"]] >= 0).all().all()
    assert (csv["Kettle"] + csv["Other"] <= csv["aggregate"] + 0.05).all(), "sum exceeds aggregate"
    return f"{len(csv)} rows, columns {list(csv.columns)}"


@check("engine latency")
def _():
    from pipeline.engine import NILMInferenceEngine
    e = NILMInferenceEngine(["Kettle"])
    s = pd.Series(np.random.rand(256) * 500, index=pd.date_range("2014-01-01", periods=256, freq="1min"))
    e.disaggregate(s)  # warm-up
    t = time.time()
    for _ in range(10):
        e.disaggregate(s)
    return f"{(time.time() - t) * 100:.0f} ms per 256-sample request on {e.device}"


@check("inference API")
def _():
    from fastapi.testclient import TestClient
    from service.main import app
    with TestClient(app) as c:
        h = c.get("/health").json()
        r = c.post("/disaggregate", json={"start": "2014-01-01T00:00:00",
                                          "power_w": [100.0] * 100 + [None] * 5 + [2500.0] * 200})
        assert r.status_code == 200, r.text
        j = r.json()
        assert len(j["series_w"]["Kettle"]) == 305 and j["series_w"]["Kettle"][102] is None
        assert c.post("/disaggregate", json={"start": "2014-01-01T00:00:00",
                                             "power_w": [1.0] * 10}).status_code == 422
    return f"loaded={h['appliances']} device={h['device']}"


@check("config yaml sane")
def _():
    cfg = yaml.safe_load(open("pipeline/postprocess.yaml"))
    assert set(cfg["appliances"]) == {"Kettle", "Microwave", "Dishwasher", "WashingMachine"}


print()
fails = [r for r in RESULTS if not r[1]]
print(f"{len(RESULTS) - len(fails)}/{len(RESULTS)} checks passed")
sys.exit(1 if fails else 0)
