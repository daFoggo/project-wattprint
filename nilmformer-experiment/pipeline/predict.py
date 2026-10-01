"""Run every appliance model on one REFIT household and store the RAW (un-post-processed) predictions.

    python -m pipeline.predict --house 2               # -> artifacts/predictions/house_2_raw.parquet
    python -m pipeline.predict --house 2 --stride 64   # overlapping windows, averaged
"""
import argparse

import numpy as np
import pandas as pd

from pipeline.common import ART, env_default, house_appliances, house_data
from pipeline.engine import NILMInferenceEngine, stitch


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--house", type=int, required=True)
    ap.add_argument("--apps", nargs="+", default=None,
                    help="default: the household's inventory (appliances it actually has)")
    ap.add_argument("--model", default="NILMFormer")
    ap.add_argument("--stride", type=int, default=None)
    ap.add_argument("--limit", type=int, default=None, help="only the first N samples (smoke tests)")
    ap.add_argument("--sampling-rate", default=env_default("SAMPLING_RATE", "1min"))
    ap.add_argument("--window-size", type=int, default=int(env_default("WINDOW_SIZE", "128")))
    a = ap.parse_args()
    ws, sr = a.window_size, a.sampling_rate
    # a model is only run for appliances the household has: run on a house without that
    # appliance, it reports false activations (e.g. the dryer model on the dishwasher's heating)
    a.apps = a.apps or house_appliances(a.house)

    # the household's aggregate (+ appliance ground truth) from the REFIT csv, on a regular grid
    X, st = house_data(a.apps, [a.house], sr, ws, infer=True)
    step = pd.tseries.frequencies.to_offset(sr).nanos
    start = pd.to_datetime(st["start_date"]).values.astype("datetime64[ns]")
    t0 = start.min()
    offs = ((start - t0).astype("int64") // step).astype(int)
    total = int(offs.max()) + ws
    index = pd.DatetimeIndex(t0 + (np.arange(total) * step).astype("timedelta64[ns]"))
    agg = pd.Series(stitch(X[:, 0, 0, :], offs, total), index=index)
    truth = {f"{app}_true": stitch(X[:, k, 0, :], offs, total) for k, app in enumerate(a.apps, 1)}
    if a.limit:
        agg = agg.iloc[:a.limit]

    engine = NILMInferenceEngine(a.apps, a.model)
    raw = engine.predict_raw(agg, stride=a.stride)
    for k, v in truth.items():
        raw[k] = v[:len(raw)]

    path = ART / "predictions" / f"house_{a.house}_raw.parquet"
    raw.to_parquet(path)
    print(f"saved {path}  apps={engine.appliances}  rows={len(raw)}  "
          f"covered={raw['aggregate'].notna().mean():.1%}")


if __name__ == "__main__":
    main()
