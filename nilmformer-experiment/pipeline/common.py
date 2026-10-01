"""Shared helpers: config, per-house data cache, fast exogenous dataset, model bundles.

The vendored NILMFormer repo (NILMFormer/src) is used as-is; everything here wraps it so that
training, inference and post-processing can be run (and re-run) independently.
"""
import os
import pickle
from multiprocessing import Pool
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import yaml
from omegaconf import OmegaConf

from src.helpers.dataset import NILMDataset
from src.helpers.preprocessing import REFIT_DataBuilder

ART = Path(os.environ.get("ARTIFACTS", "artifacts"))
CACHE = Path(os.environ.get("CACHE_DIR", ART / "cache"))
DATA_PATH = "data/REFIT/RAW_DATA_CLEAN/"
# training-only datasets converted to the REFIT layout by pipeline/convert.py; house ids are
# offset (house // 100 picks the dataset) so they never clash with REFIT's 1-21
DATASETS = {0: DATA_PATH, 1: "data/PLEGMA/RAW_DATA_CLEAN/", 2: "data/PRECON/RAW_DATA_CLEAN/"}
APPS_CFG = "pipeline/appliances.yaml"
PAPER_APPLIANCES = ["Kettle", "Microwave", "Dishwasher", "WashingMachine"]


def appliance_specs():
    """Extra appliances of pipeline/appliances.yaml (everything but `defaults`)."""
    with open(APPS_CFG) as f:
        return {k: v for k, v in yaml.safe_load(f).items() if k != "defaults"}


APPLIANCES = PAPER_APPLIANCES + [a for a in appliance_specs() if a not in PAPER_APPLIANCES]


def data_path_for(house):
    return DATASETS[int(house) // 100]


def house_appliances(house):
    """Pipeline appliances metered in `house` (its inventory), from the dataset's HOUSES_Labels."""
    labels = pd.read_csv(data_path_for(house) + "HOUSES_Labels").set_index("House_id")
    names, specs = set(labels.loc[int(house)].values), appliance_specs()
    return [a for a in APPLIANCES if names & set(specs.get(a, {}).get("labels", [a]))]
for _d in (CACHE, ART / "models", ART / "predictions", ART / "outputs"):
    _d.mkdir(parents=True, exist_ok=True)


def env_default(name, default):
    return os.environ.get(name, default)


def default_device():
    want = env_default("DEVICE", "cuda")
    return want if (want != "cuda" or torch.cuda.is_available()) else "cpu"


def load_config(appliance, model="NILMFormer"):
    """repo configs (expes/models/datasets) + paper protocol overrides (pipeline/paper.yaml)."""
    with open("configs/expes.yaml") as f:
        cfg = yaml.safe_load(f)
    with open("configs/models.yaml") as f:
        cfg.update(yaml.safe_load(f)[model])
    with open("configs/datasets.yaml") as f:
        refit = yaml.safe_load(f)["REFIT"]
    with open(APPS_CFG) as f:
        apps = yaml.safe_load(f)
    if appliance not in refit and appliance not in apps:
        raise KeyError(f"unknown appliance {appliance!r}: add it to {APPS_CFG}")
    cfg.update(apps["defaults"])
    cfg.update(refit.get(appliance, {}))
    cfg.update(apps.get(appliance, {}))
    cfg["app"] = appliance
    with open("pipeline/paper.yaml") as f:
        cfg.update(yaml.safe_load(f))
    cfg["name_model"] = model
    cfg["device"] = default_device()
    return OmegaConf.create(cfg)


# ---------------------------------------------------------------- data cache
class PipelineBuilder(REFIT_DataBuilder):
    """REFIT builder that also knows the extra appliances of pipeline/appliances.yaml.

    An extra appliance can be recorded under a different label in each house (Fridge-Freezer,
    Fridge & Freezer, ...): the house's label is resolved, the vendored builder runs on it
    unchanged, and its columns are renamed back to the pipeline name.
    """

    def __init__(self, *args, **kw):
        self._specs = appliance_specs()
        super().__init__(*args, **kw)
        for app, spec in self._specs.items():
            self.appliance_param[app] = {k: spec[k] for k in ("min_threshold", "max_threshold")}

    def _check_appliance_names(self):
        unknown = [a for a in self.mask_app if a not in PAPER_APPLIANCES and a not in self._specs]
        assert not unknown, f"unknown appliance(s) {unknown}: add them to {APPS_CFG}"

    def _get_dataframe(self, indice):
        labels = pd.read_csv(self.data_path + "HOUSES_Labels").set_index("House_id")
        names = set(labels.loc[int(indice)].values)
        raw_apps, rename = [], {}
        for app in self.mask_app[1:]:
            raw = next((n for n in self._specs.get(app, {}).get("labels", []) if n in names), app)
            if raw != app:
                self.appliance_param[raw] = self.appliance_param[app]
                rename.update({raw: app, f"{raw}_status": f"{app}_status"})
            raw_apps.append(raw)
        mask_app, self.mask_app = self.mask_app, ["Aggregate"] + raw_apps
        try:
            df = super()._get_dataframe(indice)
        finally:
            self.mask_app = mask_app
        return df.rename(columns=rename)


class InferenceBuilder(PipelineBuilder):
    """Keep every window whose *aggregate* is complete (appliance NaNs are allowed:
    they only affect the ground truth used for evaluation, not the model input)."""

    def _check_anynan(self, a):
        return bool(np.isnan(a[0]).any())


def _build_one(args):
    apps, house, sr, ws, stride, infer, path = args
    cls = InferenceBuilder if infer else PipelineBuilder
    builder = cls(
        data_path=data_path_for(house), mask_app=list(apps), sampling_rate=sr,
        window_size=ws, window_stride=stride,
    )
    data, st = builder.get_nilm_dataset([house])
    with open(path, "wb") as f:
        pickle.dump((data, st), f, protocol=4)


def house_data(apps, houses, sr, ws, stride=None, infer=False, workers=4):
    """Return (X, st_date) concatenated over `houses`; each house is cached on disk."""
    stride = stride or ws
    jobs, paths = [], []
    for h in houses:
        tag = "-".join(apps) + ("_inf" if infer else "")
        p = CACHE / f"refit_{tag}_h{h}_{sr}_w{ws}_s{stride}.pkl"
        paths.append(p)
        if not p.exists():
            jobs.append((tuple(apps), h, sr, ws, stride, infer, str(p)))
    if jobs:
        with Pool(min(workers, len(jobs))) as pool:
            pool.map(_build_one, jobs)
    parts = [pickle.load(open(p, "rb")) for p in paths]
    X = np.concatenate([d for d, _ in parts], axis=0)
    st = pd.concat([s for _, s in parts], axis=0)
    return X, st


# ---------------------------------------------------------------- dataset
class FastNILMDataset(NILMDataset):
    """NILMDataset with the exogenous (sin/cos time) channels precomputed in one vectorised pass.

    The original builds a pandas date_range for every sample at every epoch, which makes the
    CPU the bottleneck while the GPU idles.
    """

    _PERIOD = {"minute": ("minute", 60.0), "hour": ("hour", 24.0), "dow": ("dayofweek", 7.0),
               "month": ("month", 12.0), "dom": ("day", 31.0)}

    def __init__(self, X, st_date, list_exo_variables, freq, **kw):
        super().__init__(X, list_exo_variables=list_exo_variables, st_date=st_date, freq=freq, **kw)
        self._exo = self._precompute() if self.n_var else None

    def _precompute(self):
        assert self.cosinbase
        n, length = len(self.samples), self.L
        step = pd.tseries.frequencies.to_offset(self.freq).nanos
        st = pd.to_datetime(self.st_date).values.astype("datetime64[ns]")
        offs = (np.arange(length, dtype="int64") * step).astype("timedelta64[ns]")
        t = pd.DatetimeIndex((st[:, None] + offs[None, :]).ravel())
        feats = []
        for v in self.list_exo_variables:
            attr, period = self._PERIOD[v]
            x = getattr(t, attr).values
            feats += [np.sin(2 * np.pi * x / period), np.cos(2 * np.pi * x / period)]
        arr = np.stack(feats, 0).reshape(len(feats), n, length).transpose(1, 0, 2)
        return np.ascontiguousarray(arr, dtype=np.float32)

    def _create_exogene(self, idx):
        return self._exo[idx]


# ---------------------------------------------------------------- bundles
def bundle_path(appliance, model="NILMFormer"):
    return ART / "models" / f"REFIT_{appliance}_{model}.pt"


def load_bundle(appliance, model="NILMFormer", device="cpu"):
    from src.helpers.expes import get_model_instance

    b = torch.load(bundle_path(appliance, model), map_location="cpu", weights_only=False)
    cfg = OmegaConf.create(b["config"])
    net = get_model_instance(
        cfg.name_model, c_in=1 + 2 * len(cfg.list_exo_variables),
        window_size=b["window_size"], **cfg.model_kwargs,
    )
    net.load_state_dict(b["state_dict"])
    return net.to(device).eval(), b, cfg
