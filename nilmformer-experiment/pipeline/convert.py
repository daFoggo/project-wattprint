"""Convert external NILM datasets into the REFIT CLEAN layout, so the REFIT builder reads them as is.

    python -m pipeline.convert plegma    # data/_raw/plegma/Clean_Dataset -> data/PLEGMA/RAW_DATA_CLEAN
    python -m pipeline.convert precon    # data/_raw/precon               -> data/PRECON/RAW_DATA_CLEAN

Output per house: CLEAN_House<id>.csv with `Time, Unix, Aggregate, <slots...>, Issues` (active power
in W) plus one HOUSES_Labels file naming the slots per house ("Not Used" = not metered there).
House ids are offset per dataset (pipeline.common.DATASETS) so they never clash with REFIT's 1-21.
Timestamps are kept as recorded (naive), like REFIT.
"""
import argparse
import re
from pathlib import Path

import numpy as np
import pandas as pd

RAW = Path("data/_raw")
OUT = {"plegma": Path("data/PLEGMA/RAW_DATA_CLEAN"), "precon": Path("data/PRECON/RAW_DATA_CLEAN")}
BASE = {"plegma": 100, "precon": 200}
SLOTS = {
    "plegma": ["AC", "WaterHeater", "Fridge", "WashingMachine", "Dishwasher", "Kettle"],
    "precon": ["AC", "Fridge"],
}


def sum_strict(df, cols):
    """Sum of the metered units of one appliance type; NaN as soon as one of them is missing."""
    return df[cols].sum(axis=1, min_count=len(cols)) if cols else None


def write_house(name, hid, frame, slots, labels):
    out = pd.DataFrame({"Time": frame.index.strftime("%Y-%m-%d %H:%M:%S"),
                        "Unix": frame.index.astype("int64") // 10**9,
                        "Aggregate": frame["Aggregate"].round(2).values})
    names = []
    for s in slots:
        names.append(s if s in frame else "Not Used")
        out[f"slot_{s}"] = frame[s].round(2).values if s in frame else np.nan
    out["Issues"] = frame["Issues"].astype(int).values
    out.to_csv(OUT[name] / f"CLEAN_House{hid}.csv", index=False)
    labels.append([hid, "Time", "Unix", "Aggregate", *names, "Issues"])
    present = [n for n in names if n != "Not Used"]
    print(f"{name} house {hid}: {len(out)} rows {frame.index[0]} -> {frame.index[-1]}  "
          f"issues {frame['Issues'].mean():.1%}  {present}", flush=True)


def plegma():
    for d in sorted((RAW / "plegma" / "Clean_Dataset").glob("House_*")):
        n = int(d.name.split("_")[1])
        df = pd.concat([pd.read_csv(f) for f in sorted((d / "Electric_data").glob("20*.csv"))])
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.drop_duplicates("timestamp").set_index("timestamp").sort_index()
        f = pd.DataFrame(index=df.index)
        f["Aggregate"] = df["P_agg"]
        for slot, rx in [("AC", r"ac_\d+"), ("WaterHeater", r"boiler"), ("Fridge", r"fridge(_\d+)?"),
                         ("WashingMachine", r"washing_machine"), ("Dishwasher", r"dishwasher"),
                         ("Kettle", r"kettle")]:
            cols = [c for c in df.columns if re.fullmatch(rx, c)]
            if cols:
                f[slot] = sum_strict(df, cols)
        f["Issues"] = (df["issues"].fillna(1) != 0) | f["Aggregate"].isna()
        yield BASE["plegma"] + n, f


def precon():
    meta = pd.read_csv(RAW / "precon" / "Metadata.csv").set_index("Website Name")
    for p in sorted(RAW.joinpath("precon").glob("House*.csv"), key=lambda p: int(p.stem[5:])):
        n = int(p.stem[5:])
        df = pd.read_csv(p)
        df["Date_Time"] = pd.to_datetime(df["Date_Time"])
        df = df.drop_duplicates("Date_Time").set_index("Date_Time").sort_index() * 1000.0  # kW -> W
        f = pd.DataFrame(index=df.index)
        f["Aggregate"] = df["Usage_kW"]
        # AC circuits; AC_UPS mixes the AC with the UPS-backed loads, so it is not an AC label
        ac = [c for c in df.columns if re.match(r"(?i)(w_)?ac", c) and not c.upper().startswith("AC_UPS")]
        fridge = [c for c in df.columns if re.match(r"(?i)re[fg]rigerator", c)]
        # every AC of the house must be metered, else the unmetered ones hide unlabelled in the mains
        n_ac = meta.loc[f"House {n}", "No_of_ACs"]
        if ac and len(ac) >= n_ac:
            f["AC"] = sum_strict(df, ac)
        if fridge and len(fridge) >= meta.loc[f"House {n}", "No_of_Refrigerators"]:
            f["Fridge"] = sum_strict(df, fridge)
        # zero mains = outage / logger off (UPS-backed loads are not seen by the meter then)
        f["Issues"] = f["Aggregate"].isna() | (f["Aggregate"] <= 0)
        yield BASE["precon"] + n, f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dataset", choices=sorted(OUT))
    name = ap.parse_args().dataset
    OUT[name].mkdir(parents=True, exist_ok=True)
    slots, labels = SLOTS[name], []
    for hid, frame in {"plegma": plegma, "precon": precon}[name]():
        write_house(name, hid, frame, slots, labels)
    cols = ["House_id", "Time", "Unix", "Aggregate", *[f"Appliance{i + 1}" for i in range(len(slots))],
            "Issues"]
    pd.DataFrame(labels, columns=cols).to_csv(OUT[name] / "HOUSES_Labels", index=False)
    print(f"wrote {len(labels)} houses + HOUSES_Labels to {OUT[name]}")


if __name__ == "__main__":
    main()
