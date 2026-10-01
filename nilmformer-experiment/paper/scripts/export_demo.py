"""paper/data -> one JSON snapshot of the served household for the backend demo API.

    make demo-snapshot     # writes ../backend/app/demo/plegma_101.json (then rebuild the backend)

Everything here is already computed (no model run): the household profile, the evaluation
against the sub-metered ground truth, monthly / daily energy and one sample day. The predicted
1-minute series itself lives in the backend database (POST /households/import).
"""
import json
import sys
from pathlib import Path

import pandas as pd

D = Path("paper/data")
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "paper/data/demo_plegma_101.json")
APPS = ["AC", "WaterHeater", "Fridge", "WashingMachine"]
LABEL = {  # key -> (Vietnamese, English)
    "AC": ("Điều hoà", "Air conditioner"), "WaterHeater": ("Bình nóng lạnh", "Water heater"),
    "Fridge": ("Tủ lạnh", "Fridge"), "WashingMachine": ("Máy giặt", "Washing machine"),
    "Other": ("Khác", "Other"),
}
VERDICT = {"AC": "detected_reliably_energy_underestimated", "WaterHeater": "accurate",
           "Fridge": "good_except_constant_draw_days", "WashingMachine": "weak_low_impact"}
SAMPLE_WINDOW = {"start": "2023-07-10T00:00:00Z", "end": "2023-07-17T00:00:00Z", "bucket": "1 hour"}


def r(x, n=3):
    return None if pd.isna(x) else round(float(x), n)


def main():
    meta = json.load(open(D / "meta.json"))
    hh = meta["household"]
    test = pd.read_csv(D / "test_metrics.csv")
    test = test[test.test_house == hh["house"]].set_index("appliance")
    mix = pd.read_csv(D / "house101_mix.csv").set_index("appliance")
    q = pd.read_csv(D / "house101_quarterly_f1.csv")
    monthly = pd.read_csv(D / "house101_monthly.csv", parse_dates=["month"])
    daily = pd.read_csv(D / "house101_daily.csv", parse_dates=["day"])
    day_file = sorted(D.glob("house101_day_*.csv"))[0]
    day = pd.read_csv(day_file, parse_dates=["time"])
    train = pd.read_csv(D / "training.csv")
    fc = hh["fridge_constant_draw"]

    appliances = [{"key": k, "name": LABEL[k][0], "name_en": LABEL[k][1],
                   "kind": "residual" if k == "Other" else "appliance"} for k in APPS + ["Other"]]
    models = []
    for a in APPS:
        t = train[(train.appliance == a) & (train.test_house == hh["house"])].iloc[0]
        models.append({"appliance": a, "training_datasets": t.train_datasets.split("+"),
                       "training_houses": int(t.n_train), "validation_house": int(t.valid_house),
                       "epochs": int(t.epochs_run), "best_epoch": int(t.best_epoch)})

    snapshot = {
        "household": {
            "name": "Plegma House 101", "dataset": "Plegma", "country": "GR",
            "dataset_license": "CC BY 4.0",
            "period": {"start": pd.Timestamp(hh["start"]).strftime("%Y-%m-%dT%H:%M:%SZ"),
                       "end": pd.Timestamp(hh["end"]).strftime("%Y-%m-%dT%H:%M:%SZ")},
            "timezone_note": "timestamps as recorded by the dataset, served as UTC",
            "sampling_interval_seconds": 60,
            "valid_days": r(hh["valid_days"], 1), "missing_share": r(hh["missing_share"], 4),
            "aggregate_energy_kwh": r(hh["aggregate_kwh"], 1),
            "metered_share": r(hh["metered_share"], 4),
            "held_out": True,
            "appliances": appliances,
            "sample_window": SAMPLE_WINDOW,
        },
        "model": {
            "name": "NILMFormer", "parameters": meta["n_params"], "window_minutes": 128,
            "sampling": "1min", "paper": "arXiv:2506.05880", "git_commit": meta["git"],
            "per_appliance": models,
        },
        "evaluation": {
            "appliances": [{
                "key": a, "name": LABEL[a][0], "verdict": VERDICT[a],
                "f1": r(test.loc[a, "F1"]), "precision": r(test.loc[a, "precision"]),
                "recall": r(test.loc[a, "recall"]), "mae_w": r(test.loc[a, "MAE_post"], 1),
                "rmse_w": r(test.loc[a, "RMSE_post"], 1), "sae": r(test.loc[a, "SAE"]),
                "nde": r(test.loc[a, "NDE"]), "matching_ratio": r(test.loc[a, "MR_post"]),
                "measured_kwh": r(test.loc[a, "true_kwh"], 1),
                "predicted_kwh": r(test.loc[a, "pred_kwh"], 1),
                "on_minutes": int(test.loc[a, "true_on_min"]),
            } for a in APPS],
            "mean_f1": r(test.loc[APPS, "F1"].mean()),
            "mix": [{"key": k, "name": LABEL[k][0],
                     "measured_kwh": r(mix.loc[k, "true_kwh"], 1),
                     "predicted_kwh": r(mix.loc[k, "pred_kwh"], 1),
                     "measured_share": r(mix.loc[k, "true_share"], 4),
                     "predicted_share": r(mix.loc[k, "pred_share"], 4)} for k in APPS + ["Other"]],
            "quarterly_f1": [{"appliance": x.appliance, "quarter": x.quarter, "f1": r(x.F1)}
                             for x in q.itertuples()],
            "findings": [
                {"appliance": "AC", "code": "ac_heating_underestimated",
                 "text": "Điều hoà phát hiện đúng lúc bật (precision cao) nhưng đoán thấp công suất, "
                         "nhất là mùa đông khi chạy sưởi."},
                {"appliance": "Fridge", "code": "fridge_constant_draw",
                 "text": f"{fc['days']} ngày tủ lạnh kéo đều ~{fc['median_w']:.0f} W, không đóng ngắt: "
                         f"không tách được từ công tơ tổng. Loại các ngày này: F1 {fc['F1_excl']:.3f}.",
                 "days": fc["days"], "f1_excluding": r(fc["F1_excl"])},
            ],
        },
        "monthly": [{
            "month": m.month.strftime("%Y-%m"), "days": r(m.days, 1),
            "aggregate_kwh": r(m.aggregate_kwh, 1),
            "appliances": {a: {"measured_kwh": r(m[f"{a}_true_kwh"], 1),
                               "predicted_kwh": r(m[f"{a}_pred_kwh"], 1)} for a in APPS},
        } for _, m in monthly.iterrows()],
        "daily": [{
            "date": d.day.strftime("%Y-%m-%d"), "aggregate_kwh": r(d.aggregate_kwh, 2),
            "appliances": {a: {"measured_kwh": r(d[f"{a}_true_kwh"], 2),
                               "predicted_kwh": r(d[f"{a}_pred_kwh"], 2)} for a in APPS},
        } for _, d in daily.iterrows()],
        "sample_day": {
            "date": day.time.iloc[0].strftime("%Y-%m-%d"), "interval_minutes": 10,
            "points": [{
                "time": p.time.strftime("%Y-%m-%dT%H:%M:%SZ"), "aggregate_w": r(p["aggregate"], 0),
                "appliances": {a: {"measured_w": r(p[f"{a}_true"], 0),
                                   "predicted_w": r(p[f"{a}_pred"], 0)} for a in APPS},
            } for _, p in day.iterrows()],
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    json.dump(snapshot, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
