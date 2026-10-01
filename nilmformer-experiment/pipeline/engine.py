"""NILMInferenceEngine: the single inference code path (used by predict.py and the API service).

Input : aggregate power (W) as a regularly sampled pd.Series with a DatetimeIndex
        (sampling rate = the one the models were trained on, 1min). NaN marks a gap.
Output: raw per-appliance power predictions, or post-processed ones (see postprocess.py).

NILMFormer input is NOT just the power: each window carries 8 extra channels (sin/cos of
minute/hour/day-of-week/month) built from the timestamps, and the power is scaled with the
scaler fitted at training time (stored in the model bundle).
"""
import logging
import os

import numpy as np
import pandas as pd
import torch
import yaml

from pipeline.common import (APPLIANCES, FastNILMDataset, bundle_path, default_device,
                             load_bundle)
from pipeline.postprocess import CFG_PATH, process


def stitch(arr, starts, total):
    """Average overlapping window predictions back onto the timeline (NaN where uncovered)."""
    s, c = np.zeros(total), np.zeros(total)
    for row, o in zip(arr, starts):
        ok = np.isfinite(row)
        s[o:o + len(row)] += np.where(ok, row, 0.0)
        c[o:o + len(row)] += ok
    return np.where(c > 0, s / np.maximum(c, 1), np.nan)


class NILMInferenceEngine:
    def __init__(self, apps=None, model="NILMFormer", device=None):
        self.device = device or default_device()
        apps = apps or os.environ.get("NILM_APPS", " ".join(APPLIANCES)).split()
        self.nets, self.scalers, self.exo = {}, {}, {}
        self.window_size = self.sampling_rate = None
        for app in apps:
            if not bundle_path(app, model).exists():
                logging.warning("no trained bundle for %s, skipped", app)
                continue
            net, b, cfg = load_bundle(app, model, self.device)
            self.nets[app], self.scalers[app] = net, b["scaler"]
            self.exo[app] = list(cfg.list_exo_variables)
            ws, sr = b["window_size"], b["sampling_rate"]
            assert self.window_size in (None, ws) and self.sampling_rate in (None, sr), \
                "all appliance models must share window size / sampling rate"
            self.window_size, self.sampling_rate = ws, sr
        if not self.nets:
            raise RuntimeError("no model bundle found in the artifacts/models directory")

    @property
    def appliances(self):
        return list(self.nets)

    @torch.no_grad()
    def predict_raw(self, power, stride=None, batch_size=1024):
        """Raw (un-post-processed) predictions. Returns DataFrame[time, aggregate, <app>_pred]."""
        ws = self.window_size
        times = pd.DatetimeIndex(power.index)
        v = power.to_numpy(dtype=float)
        v = np.clip(np.where(v < 5, 0.0, v), 0.0, 10000.0)  # same cleaning as the REFIT builder
        n = len(v)
        if n < ws:
            raise ValueError(f"need at least {ws} samples, got {n}")
        stride = stride or ws
        starts = list(range(0, n - ws + 1, stride))
        if starts[-1] != n - ws:
            starts.append(n - ws)  # cover the tail
        wins = np.stack([v[s:s + ws] for s in starts])
        keep = ~np.isnan(wins).any(axis=1)
        starts, wins = np.asarray(starts)[keep], wins[keep]

        out = {"time": times, "aggregate": v}
        if len(wins) == 0:
            for app in self.nets:
                out[f"{app}_pred"] = np.full(n, np.nan)
            return pd.DataFrame(out)

        st = pd.DataFrame({"start_date": times[starts]})
        for app, net in self.nets.items():
            sc = self.scalers[app]
            data = np.zeros((len(wins), 2, 2, ws))
            data[:, 0, 0, :] = (wins - sc.power_stat1) / sc.power_stat2
            loader = torch.utils.data.DataLoader(
                FastNILMDataset(data, st, self.exo[app], self.sampling_rate),
                batch_size=batch_size, shuffle=False)
            preds = []
            for ts, _, _ in loader:
                p = net(ts.float().to(self.device))
                preds.append(sc.inverse_transform_appliance(p).cpu().numpy().reshape(len(ts), -1))
            out[f"{app}_pred"] = stitch(np.concatenate(preds), starts, n)
        return pd.DataFrame(out)

    def disaggregate(self, power, stride=None, pp_cfg=None):
        """Post-processed per-appliance power (W), indexed like `power` (NaN on gaps)."""
        pp_cfg = pp_cfg or yaml.safe_load(open(CFG_PATH))
        raw = self.predict_raw(power, stride=stride)
        return process(raw, pp_cfg).reindex(pd.DatetimeIndex(raw["time"]))
