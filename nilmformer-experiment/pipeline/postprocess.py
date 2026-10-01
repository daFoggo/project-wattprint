"""Post-process raw predictions (cheap, CPU only) and export the household disaggregation.

    python -m pipeline.postprocess run  --house 2     # -> outputs/house_2_disaggregation.csv + metrics
    python -m pipeline.postprocess tune --house 9     # tune thresholds (use the VALIDATION house)
"""
import argparse
import json

import numpy as np
import pandas as pd
import yaml

from pipeline.common import ART

CFG_PATH = "pipeline/postprocess.yaml"


def drop_short_runs(on, min_len):
    if min_len <= 1:
        return on
    d = np.diff(np.concatenate(([0], on.astype(int), [0])))
    for s, e in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
        if e - s < min_len:
            on[s:e] = False
    return on


def process(raw, cfg):
    agg = raw["aggregate"].values
    ok = np.isfinite(agg)
    out = {}
    for app, p in cfg["appliances"].items():
        if f"{app}_pred" not in raw:
            continue
        x = np.clip(np.nan_to_num(raw[f"{app}_pred"].values), 0, None)
        if p["smooth"] > 1:
            x = pd.Series(x).rolling(p["smooth"], center=True, min_periods=1).median().values
        on = drop_short_runs(x >= p["threshold_w"], p["min_on_steps"])
        out[app] = np.where(on, np.minimum(x, p["max_w"]), 0.0)
    total = sum(out.values())
    if cfg["cap_to_aggregate"]:
        scale = np.where(ok & (total > agg), agg / np.maximum(total, 1e-9), 1.0)
        out = {k: v * scale for k, v in out.items()}
        total = sum(out.values())
    out[cfg["residual_name"]] = np.clip(np.nan_to_num(agg) - total, 0, None)
    df = pd.DataFrame(out, index=raw["time"].values)
    df.insert(0, "aggregate", agg)
    return df[ok]


def metrics(raw, proc, cfg):
    res = {}
    for app, p in cfg["appliances"].items():
        if app not in proc or f"{app}_true" not in raw:
            continue
        t = raw[f"{app}_true"].values
        m = np.isfinite(t) & raw["aggregate"].notna().values
        t = t[m]
        y = proc.reindex(raw["time"][m].values)[app].values
        ts, ys = t >= p["truth_threshold_w"], y > 0
        tp = (ts & ys).sum()
        prec, rec = tp / max(ys.sum(), 1), tp / max(ts.sum(), 1)
        res[app] = {
            "MAE": float(np.abs(t - y).mean()), "RMSE": float(np.sqrt(((t - y) ** 2).mean())),
            "SAE": float(abs(y.sum() - t.sum()) / max(t.sum(), 1e-9)),
            "NDE": float(((t - y) ** 2).sum() / max((t ** 2).sum(), 1e-9)),
            "precision": float(prec), "recall": float(rec),
            "F1": float(2 * prec * rec / max(prec + rec, 1e-9)),
            "true_on_steps": int(ts.sum()), "true_energy_wh": float(t.sum() / 60),
            "pred_energy_wh": float(y.sum() / 60),
        }
    return res


def tune(raw, cfg):
    for app, p in cfg["appliances"].items():
        if f"{app}_pred" not in raw or f"{app}_true" not in raw:
            continue
        t = raw[f"{app}_true"].values
        x = raw[f"{app}_pred"].values
        m = np.isfinite(t) & np.isfinite(x)
        ts = t[m] >= p["truth_threshold_w"]
        if ts.sum() == 0:
            print(f"{app}: no activation in this house, keep threshold")
            continue
        best = (-1.0, float(p["threshold_w"]))
        for thr in np.unique(np.clip(np.quantile(x[m], np.linspace(0.5, 0.9995, 120)), 1, None)):
            ys = x[m] >= thr
            tp = (ts & ys).sum()
            best = max(best, (2 * tp / max(ts.sum() + ys.sum(), 1), float(thr)))
        print(f"{app}: threshold {p['threshold_w']} -> {best[1]:.1f} W  (F1 {best[0]:.3f})")
        p["threshold_w"] = round(best[1], 1)
    return cfg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["run", "tune"])
    ap.add_argument("--house", type=int, required=True)
    a = ap.parse_args()
    cfg = yaml.safe_load(open(CFG_PATH))
    raw = pd.read_parquet(ART / "predictions" / f"house_{a.house}_raw.parquet")
    if a.mode == "tune":
        yaml.safe_dump(tune(raw, cfg), open(CFG_PATH, "w"), sort_keys=False)
        print(f"wrote {CFG_PATH}")
        return
    proc = process(raw, cfg)
    base = ART / "outputs" / f"house_{a.house}_disaggregation"
    out = proc.round(2).rename_axis("time").reset_index()
    out["time"] = out["time"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    out.to_csv(f"{base}.csv", index=False)
    m = metrics(raw, proc, cfg)
    json.dump(m, open(f"{base}_metrics.json", "w"), indent=2)
    print(pd.DataFrame(m).T[["MAE", "RMSE", "SAE", "F1", "precision", "recall"]].round(3))
    print(f"saved {base}.csv ({len(out)} rows)")


if __name__ == "__main__":
    main()
