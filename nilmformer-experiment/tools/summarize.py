"""Collect test metrics from result/**/*.pt into result/summary.csv."""
import pathlib
import pandas as pd
import torch

rows = []
for f in sorted(pathlib.Path("result").glob("*/*/*.pt")):
    ds_app_sr, win, model_seed = f.parts[-3], f.parts[-2], f.stem
    dataset, appliance, sr = ds_app_sr.split("_")
    model, seed = model_seed.rsplit("_", 1)
    c = torch.load(f, map_location="cpu", weights_only=False)
    m = {k: float(v) for k, v in c["test_metrics_timestamp"].items()}
    rows.append(dict(Model=model, Dataset=dataset, Appliance=appliance, SamplingRate=sr,
                     WindowSize=win, Seed=seed, **m, TestTime=c.get("test_metrics_time")))
df = pd.DataFrame(rows)
df.to_csv("result/summary.csv", index=False)
print(df.round(3).to_string(index=False))
