"""Export every number used by the paper and the report into paper/data/ (the single source of truth).

    make paper-data              # = python -m paper.scripts.export_results --ablation (GPU, ~5 min)
    python -m paper.scripts.export_results      # CPU only: skips the REFIT-only ablation predictions

Reads only what the pipeline already produced (artifacts/models, predictions, outputs) plus
pipeline/postprocess.yaml; it never overwrites them. The REFIT-only ablation predicts into
artifacts/_ablation/ (models from artifacts/models/paper_refit/).
"""
import argparse
import copy
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import yaml

from pipeline import postprocess as pp
from pipeline.common import ART

OUT = Path("paper/data")
MODELS = ART / "models"
ORDER = ["Kettle", "Microwave", "Dishwasher", "WashingMachine", "Fridge", "TumbleDryer", "AC",
         "WaterHeater"]
# NILMFormer paper (arXiv 2506.05880), Table 2: REFIT, 1 min, window 128 -- (MAE W, MR)
PAPER_REFIT_W128 = {"Kettle": (9.3, 0.522), "Microwave": (5.7, 0.110),
                    "Dishwasher": (29.1, 0.332), "WashingMachine": (18.9, 0.250)}
# (variant, appliance, test house): variant "refit" = REFIT-only bundles (paper protocol),
# "served" = the bundles behind the backend (REFIT + Plegma / PRECON where the appliance needs it)
EVALS = [("refit", a, 2) for a in ["Kettle", "Microwave", "Dishwasher", "WashingMachine", "Fridge"]] \
    + [("refit", "TumbleDryer", 15)] \
    + [("served", a, 101) for a in ["AC", "WaterHeater", "Fridge", "WashingMachine"]]
SERVED_HOUSE, SERVED_VALID, DAY = 101, 103, "2023-07-12"
NAMES = {"Kettle": "Kettle", "Microwave": "Microwave", "Dishwasher": "Dishwasher",
         "WashingMachine": "Washing machine", "Fridge": "Fridge", "TumbleDryer": "Tumble dryer",
         "AC": "Air conditioner", "WaterHeater": "Water heater"}


def dataset(h):
    return "REFIT" if h < 100 else "Plegma" if h < 200 else "PRECON"


def mr(t, y):
    """Matching ratio of the paper: sum(min) / sum(max)."""
    return float(np.minimum(t, y).sum() / max(np.maximum(t, y).sum(), 1e-9))


def load_raw(h, root=ART):
    return pd.read_parquet(root / "predictions" / f"house_{h}_raw.parquet")


def load_output(h):
    """Post-processed series exactly as exported to the backend (params of their own tune run)."""
    df = pd.read_csv(ART / "outputs" / f"house_{h}_disaggregation.csv")
    return df.set_index(pd.to_datetime(df.pop("time")).dt.tz_localize(None))


def bundle(app, variant):
    d = MODELS / "paper_refit" if variant == "refit" else MODELS
    return torch.load(d / f"REFIT_{app}_NILMFormer.pt", map_location="cpu", weights_only=False)


def evaluate(raw, proc, app, cfg):
    """Paper metrics on the RAW output (MAE, MR) + event/energy metrics after post-processing."""
    t = raw[f"{app}_true"].values
    m = np.isfinite(t) & raw["aggregate"].notna().values
    x = np.clip(np.nan_to_num(raw[f"{app}_pred"].values), 0, None)[m]
    y = proc.reindex(raw["time"][m].values)[app].fillna(0).values
    r = pp.metrics(raw, proc, {"appliances": {app: cfg["appliances"][app]}})[app]
    return {"MAE_raw": float(np.abs(t[m] - x).mean()), "MR_raw": mr(t[m], x),
            "MAE_post": r["MAE"], "MR_post": mr(t[m], y), "RMSE_post": r["RMSE"],
            "SAE": r["SAE"], "NDE": r["NDE"], "F1": r["F1"], "precision": r["precision"],
            "recall": r["recall"], "true_on_min": r["true_on_steps"],
            "true_kwh": r["true_energy_wh"] / 1000, "pred_kwh": r["pred_energy_wh"] / 1000}


def training_table():
    """One row per trained bundle. Paper appliances and the dryer have a single (REFIT-only)
    bundle; Fridge / WashingMachine have a REFIT-only one and a REFIT + Plegma one."""
    rows, curves = [], []
    for app in ORDER:
        has = {v: (MODELS / ("paper_refit" if v == "refit" else "") / f"REFIT_{app}_NILMFormer.pt")
               .exists() for v in ["refit", "served"]}
        b = {v: bundle(app, v) for v in has if has[v]}
        same = len(b) == 2 and b["refit"]["train_houses"] == b["served"]["train_houses"]
        # trainlog_* belongs to the bundle currently in artifacts/models
        tl = torch.load(MODELS / f"trainlog_{app}_NILMFormer.pt", map_location="cpu",
                        weights_only=False)
        served_minutes = float(tl["training_time"]) / 60
        for variant in [v for v in ["refit", "served"] if v in b and not (v == "served" and same)]:
            bb = b[variant]
            minutes = served_minutes if variant == "served" or same else None
            vh = bb["loss_valid_history"]
            by_ds = pd.Series([dataset(h) for h in bb["train_houses"]]).value_counts()
            rows.append({
                "variant": variant, "appliance": app,
                "train_datasets": "+".join(d for d in ["REFIT", "Plegma", "PRECON"] if d in by_ds),
                "n_train": len(bb["train_houses"]),
                **{f"n_{d}": int(by_ds.get(d, 0)) for d in ["REFIT", "Plegma", "PRECON"]},
                "train_houses": " ".join(map(str, bb["train_houses"])),
                "valid_house": bb["valid_house"], "test_house": bb["test_house"],
                "epochs_run": len(vh), "best_epoch": int(np.argmin(vh)) + 1,
                "best_valid_loss": float(min(vh)), "train_minutes": minutes,
            })
            curves += [{"variant": variant, "appliance": app, "epoch": i + 1, "train_loss": tr,
                        "valid_loss": va} for i, (tr, va) in
                       enumerate(zip(bb["loss_train_history"], vh))]
    return pd.DataFrame(rows), pd.DataFrame(curves)


def test_table(cfg):
    rows = []
    for variant, app, h in EVALS:
        r = evaluate(load_raw(h), load_output(h), app, cfg)
        rows.append({"variant": variant, "appliance": app, "test_house": h,
                     "test_dataset": dataset(h), **r})
    return pd.DataFrame(rows)


def paper_table(test):
    t = test[(test.variant == "refit") & (test.test_house == 2)].set_index("appliance")
    return pd.DataFrame([{"appliance": a, "paper_MAE": mae, "ours_MAE": t.loc[a, "MAE_raw"],
                          "paper_MR": m, "ours_MR": t.loc[a, "MR_raw"], "ours_F1": t.loc[a, "F1"]}
                         for a, (mae, m) in PAPER_REFIT_W128.items()])


def household(cfg):
    raw = load_raw(SERVED_HOUSE).set_index("time")
    proc = load_output(SERVED_HOUSE)
    apps = [a for a in ["AC", "WaterHeater", "Fridge", "WashingMachine"] if f"{a}_pred" in raw]
    ok = raw["aggregate"].notna()
    agg = raw.loc[ok, "aggregate"]
    tr = raw.loc[ok, [f"{a}_true" for a in apps]].rename(columns=lambda c: c[:-5]).fillna(0)
    pr = proc.reindex(agg.index)[apps].fillna(0)
    kwh = lambda s, f: s.resample(f).sum() / 60000  # noqa: E731  (1-min W -> kWh)

    total = float(agg.sum() / 60000)
    mix = [{"appliance": a, "true_kwh": float(tr[a].sum() / 60000),
            "pred_kwh": float(pr[a].sum() / 60000)} for a in apps]
    mix.append({"appliance": "Other", "true_kwh": total - sum(r["true_kwh"] for r in mix),
                "pred_kwh": total - sum(r["pred_kwh"] for r in mix)})
    mix = pd.DataFrame(mix).assign(true_share=lambda d: d.true_kwh / total,
                                   pred_share=lambda d: d.pred_kwh / total)

    monthly = pd.DataFrame({"aggregate_kwh": kwh(agg, "MS"), "days": agg.resample("MS").count() / 1440})
    daily = pd.DataFrame({"aggregate_kwh": kwh(agg, "D")})
    for a in apps:
        monthly[f"{a}_true_kwh"], monthly[f"{a}_pred_kwh"] = kwh(tr[a], "MS"), kwh(pr[a], "MS")
        daily[f"{a}_true_kwh"], daily[f"{a}_pred_kwh"] = kwh(tr[a], "D"), kwh(pr[a], "D")
    # a fridge drawing power every minute of the day (no compressor cycling) has no on/off edge
    # in the aggregate: NILM cannot see it, whatever the model
    daily["Fridge_on_share"] = (tr["Fridge"] > 20).resample("D").mean()
    daily = daily[agg.resample("D").count() >= 1296]  # days with >= 90 % of the minutes
    const_days = daily.index[daily["Fridge_on_share"] > 0.98]

    q = []
    for a in apps:
        ts = tr[a] >= cfg["appliances"][a]["truth_threshold_w"]
        ys = pr[a] > 0
        g = pd.DataFrame({"tp": ts & ys, "t": ts, "y": ys}).resample("QS").sum()
        for k, v in g.iterrows():
            q.append({"appliance": a, "quarter": f"Q{k.quarter}/{k.year}",
                      "F1": float(2 * v.tp / max(v.t + v.y, 1)), "true_on_min": int(v.t)})
    quarterly = pd.DataFrame(q)

    d = slice(DAY, f"{DAY} 23:59")
    full = raw.loc[d, ["aggregate"]].join(raw.loc[d, [f"{a}_true" for a in apps]])
    for a in apps:
        full[f"{a}_pred"] = proc[a].reindex(full.index).where(full["aggregate"].notna())
    day = full.resample("10min").mean()

    keep = ~tr.index.normalize().isin(const_days)
    fr_cfg = {"appliances": {"Fridge": cfg["appliances"]["Fridge"]}}
    r_keep = pp.metrics(raw.loc[ok][keep].reset_index(), proc.reindex(agg.index[keep]), fr_cfg)["Fridge"]
    d_keep = daily.drop(const_days)
    fridge_const = {"days": len(const_days), "months": sorted({str(d)[:7] for d in const_days}),
                    "median_w": float(tr.loc[~keep, "Fridge"].median()),
                    "F1_excl": r_keep["F1"], "SAE_excl": r_keep["SAE"],
                    "daily_r_all": float(daily.Fridge_true_kwh.corr(daily.Fridge_pred_kwh)),
                    "daily_r_excl": float(d_keep.Fridge_true_kwh.corr(d_keep.Fridge_pred_kwh))}
    profile = {"fridge_constant_draw": fridge_const, "house": SERVED_HOUSE, "dataset": "Plegma", "start": str(raw.index.min()),
               "end": str(raw.index.max()), "valid_days": float(ok.sum() / 1440),
               "missing_share": float(1 - ok.mean()), "aggregate_kwh": total,
               "metered_share": float(sum(r for r in mix.true_kwh[:-1]) / total),
               "found_share": float(mix.pred_kwh[:-1].sum() / mix.true_kwh[:-1].sum())}
    return profile, mix, monthly.rename_axis("month"), daily.rename_axis("day"), quarterly, \
        day.rename_axis("time")


def ablations(cfg, run_gpu):
    rows = []
    raw101, raw103 = load_raw(SERVED_HOUSE), load_raw(SERVED_VALID)

    def tuned_eval(raw_test, raw_valid, apps, c, study, variant, note=""):
        c = copy.deepcopy(c)
        c["appliances"] = {a: c["appliances"][a] for a in apps}
        with open(os.devnull, "w") as dn:
            so, sys.stdout = sys.stdout, dn
            try:
                c = pp.tune(raw_valid, c)
            finally:
                sys.stdout = so
        proc = pp.process(raw_test, c)
        for a in apps:
            r = evaluate(raw_test, proc, a, c)
            rows.append({"study": study, "appliance": a, "variant": variant,
                         "threshold_w": c["appliances"][a]["threshold_w"],
                         "gain": c["appliances"][a].get("gain", 1.0), "F1": r["F1"],
                         "SAE": r["SAE"], "MR_post": r["MR_post"], "true_kwh": r["true_kwh"],
                         "pred_kwh": r["pred_kwh"], "note": note})

    # 1) fridge threshold: tuned for F1 on the valid house vs the fixed 20 W kept in production
    base = copy.deepcopy(cfg)
    for a in base["appliances"].values():
        a.pop("gain", None)
    tuned = copy.deepcopy(base)
    tuned["appliances"]["Fridge"]["tune_threshold"] = True
    tuned_eval(raw101, raw103, ["Fridge"], tuned, "fridge_threshold", "tuned on house 103")
    tuned_eval(raw101, raw103, ["Fridge"], base, "fridge_threshold", "fixed 20 W")

    # 2) energy gain on/off (served models, house 101): same thresholds, gain = 1 vs tuned
    no_gain = copy.deepcopy(cfg)
    for a in no_gain["appliances"].values():
        a["gain"] = 1.0
    for c, v in [(no_gain, "gain = 1"), (cfg, "gain tuned on 103")]:
        proc = pp.process(raw101, c)
        for a in ["AC", "WaterHeater", "Fridge", "WashingMachine"]:
            r = evaluate(raw101, proc, a, c)
            rows.append({"study": "gain", "appliance": a, "variant": v,
                         "threshold_w": c["appliances"][a]["threshold_w"],
                         "gain": c["appliances"][a].get("gain", 1.0), "F1": r["F1"], "SAE": r["SAE"],
                         "MR_post": r["MR_post"], "true_kwh": r["true_kwh"],
                         "pred_kwh": r["pred_kwh"], "note": ""})

    # 3) household inventory: the dryer model run on REFIT 2, which has no dryer
    out2 = load_output(2)
    if "TumbleDryer" in out2:
        rows.append({"study": "inventory", "appliance": "TumbleDryer", "variant": "run on house 2",
                     "pred_kwh": float(out2["TumbleDryer"].sum() / 60000), "true_kwh": 0.0,
                     "note": "house 2 has no tumble dryer: every kWh is a false positive"})

    # 4) training data: REFIT-only vs REFIT + Plegma, on house 101 (GPU: predicts 101 and 103)
    if run_gpu:
        ab = ART / "_ablation"
        (ab / "models").mkdir(parents=True, exist_ok=True)
        apps = ["Fridge", "WashingMachine"]
        for a in apps:
            shutil.copy(MODELS / "paper_refit" / f"REFIT_{a}_NILMFormer.pt", ab / "models")
        env = dict(os.environ, ARTIFACTS=str(ab), CACHE_DIR=str(ART / "cache"))
        for h in (SERVED_HOUSE, SERVED_VALID):
            subprocess.run([sys.executable, "-m", "pipeline.predict", "--house", str(h), "--apps",
                            *apps, "--stride", "64"], env=env, check=True)
        tuned_eval(load_raw(SERVED_HOUSE, ab), load_raw(SERVED_VALID, ab), apps, cfg,
                   "training_data", "REFIT only")
        proc = load_output(SERVED_HOUSE)
        for a in apps:
            r = evaluate(raw101, proc, a, cfg)
            rows.append({"study": "training_data", "appliance": a, "variant": "REFIT + Plegma",
                         "threshold_w": cfg["appliances"][a]["threshold_w"],
                         "gain": cfg["appliances"][a].get("gain", 1.0), "F1": r["F1"],
                         "SAE": r["SAE"], "MR_post": r["MR_post"], "true_kwh": r["true_kwh"],
                         "pred_kwh": r["pred_kwh"], "note": ""})
    return pd.DataFrame(rows)


def model_size():
    from src.helpers.expes import get_model_instance

    from pipeline.common import load_config
    c = load_config("Kettle")
    net = get_model_instance("NILMFormer", c_in=1 + 2 * len(c.list_exo_variables), window_size=128,
                             **c.model_kwargs)
    return sum(p.numel() for p in net.parameters()), dict(c.model_kwargs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ablation", action="store_true", help="also re-run the REFIT-only models (GPU)")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    cfg = yaml.safe_load(open(pp.CFG_PATH))

    train, curves = training_table()
    test = test_table(cfg)
    profile, mix, monthly, daily, quarterly, day = household(cfg)
    abl = ablations(cfg, a.ablation)
    n_params, kwargs = model_size()

    files = {"training.csv": train, "training_curves.csv": curves, "test_metrics.csv": test,
             "paper_comparison.csv": paper_table(test), "house101_mix.csv": mix,
             "house101_monthly.csv": monthly, "house101_daily.csv": daily,
             "house101_quarterly_f1.csv": quarterly, f"house101_day_{DAY}.csv": day,
             "ablations.csv": abl}
    for name, df in files.items():
        df.to_csv(OUT / name, index=not isinstance(df.index, pd.RangeIndex), float_format="%.6g")
    commit = os.environ.get("GIT_COMMIT")  # the repo's .git is not mounted in the container
    meta = {"generated": pd.Timestamp.now("UTC").isoformat(timespec="seconds"), "git": commit,
            "n_params": n_params, "model_kwargs": kwargs,
            "postprocess": cfg, "household": profile, "names": NAMES,
            "paper_reference": "arXiv:2506.05880, Table 2 (REFIT, 1 min, w=128)",
            "ablation_gpu": a.ablation}
    json.dump(meta, open(OUT / "meta.json", "w"), indent=2, default=str)
    print(test.round(3).to_string())
    print(abl.round(3).to_string())
    print(f"wrote {len(files) + 1} files to {OUT}")


if __name__ == "__main__":
    main()
