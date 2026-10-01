"""paper/data/*.csv -> paper/figures/*.pdf (vector, IEEE column widths) + paper/tables/*.tex (booktabs).

    make paper-figures       # = python -m paper.scripts.make_figures  (CPU, seconds)

Also writes paper/tables/numbers.tex: \\newcommand macros for every number quoted in the text,
so re-running the pipeline updates the prose as well as the tables.
"""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

D, FIG, TAB = Path("paper/data"), Path("paper/figures"), Path("paper/tables")
COL, WIDE = 3.5, 7.16  # IEEE single / double column width, inches
C = {"AC": "#2a62b0", "WaterHeater": "#d2501a", "Fridge": "#11877a", "WashingMachine": "#7a4bb4",
     "Other": "#9aa3ae", "true": "#2b2f36", "paper": "#9aa3ae", "ours": "#0d6a8c"}
plt.rcParams.update({
    "font.family": "serif", "font.serif": ["Times New Roman", "Times", "DejaVu Serif"],
    "mathtext.fontset": "stix", "font.size": 8, "axes.titlesize": 8, "axes.labelsize": 8,
    "xtick.labelsize": 7, "ytick.labelsize": 7, "legend.fontsize": 7, "axes.linewidth": 0.6,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.linewidth": 0.4,
    "grid.alpha": 0.35, "axes.axisbelow": True, "pdf.fonttype": 42, "savefig.bbox": "tight",
    "savefig.pad_inches": 0.02, "legend.frameon": False,
})

meta = json.load(open(D / "meta.json"))
NAME = meta["names"]
train = pd.read_csv(D / "training.csv")
curves = pd.read_csv(D / "training_curves.csv")
test = pd.read_csv(D / "test_metrics.csv")
paper = pd.read_csv(D / "paper_comparison.csv")
mix = pd.read_csv(D / "house101_mix.csv")
monthly = pd.read_csv(D / "house101_monthly.csv", parse_dates=["month"])
daily = pd.read_csv(D / "house101_daily.csv", parse_dates=["day"])
quarterly = pd.read_csv(D / "house101_quarterly_f1.csv")
day_file = sorted(D.glob("house101_day_*.csv"))[0]
day = pd.read_csv(day_file, parse_dates=["time"])
abl = pd.read_csv(D / "ablations.csv")
HH = meta["household"]
APPS101 = ["AC", "WaterHeater", "Fridge", "WashingMachine"]
NAME["Other"] = "Other"


def save(fig, name):
    fig.savefig(FIG / f"{name}.pdf")
    fig.savefig(FIG / f"{name}.png", dpi=200)
    plt.close(fig)


# ------------------------------------------------------------------------------------- figures
def fig_paper():
    short = {"Kettle": "Kettle", "Microwave": "MW", "Dishwasher": "DW", "WashingMachine": "WM"}
    fig, axs = plt.subplots(1, 2, figsize=(COL, 1.6))
    x, w = np.arange(len(paper)), 0.38
    for ax, m, lab in [(axs[0], "MAE", "MAE (W) $\\downarrow$"), (axs[1], "MR", "MR $\\uparrow$")]:
        ax.bar(x - w / 2, paper[f"paper_{m}"], w, color=C["paper"], label="Paper (2 test houses, 3 seeds)")
        ax.bar(x + w / 2, paper[f"ours_{m}"], w, color=C["ours"], label="Ours (REFIT house 2, 1 seed)")
        ax.set_xticks(x, [short[a] for a in paper.appliance])
        ax.set_ylabel(lab)
        ax.grid(axis="x", visible=False)
    h, l = axs[0].get_legend_handles_labels()
    fig.legend(h, l, loc="upper center", ncol=2, bbox_to_anchor=(0.5, 1.08), handlelength=1)
    fig.tight_layout(w_pad=1.5, rect=(0, 0, 1, 0.92))
    save(fig, "paper_comparison")


def fig_curves():
    rows = train.reset_index(drop=True)
    fig, axs = plt.subplots(2, 5, figsize=(WIDE, 2.5), sharex=False)
    for ax, (_, r) in zip(axs.flat, rows.iterrows()):
        c = curves[(curves.variant == r.variant) & (curves.appliance == r.appliance)]
        base = c.valid_loss.min()
        ax.plot(c.epoch, c.train_loss / c.train_loss.iloc[0], color=C["paper"], lw=1, label="train")
        ax.plot(c.epoch, c.valid_loss / base, color=C["ours"], lw=1.2, label="valid")
        ax.axvline(r.best_epoch, color=C["true"], lw=0.6, ls=":")
        tag = {"REFIT": "R", "REFIT+Plegma": "R+P", "Plegma+PRECON": "P+PR", "Plegma": "P"}
        ax.set_title(f"{NAME[r.appliance]} ({tag.get(r.train_datasets, r.train_datasets)})", pad=3)
        ax.set_xlabel("epoch")
    axs[0, 0].set_ylabel("loss / reference")
    axs[1, 0].set_ylabel("loss / reference")
    axs[0, 0].legend(loc="upper right")
    fig.tight_layout(h_pad=0.8, w_pad=0.6)
    save(fig, "training_curves")


def fig_mix():
    fig, ax = plt.subplots(figsize=(COL, 1.05))
    order = APPS101 + ["Other"]
    m = mix.set_index("appliance").loc[order]
    for i, col in enumerate(["pred_share", "true_share"]):
        left = 0
        for a in order:
            v = m.loc[a, col] * 100
            ax.barh(i, v, left=left, color=C[a], height=0.62, edgecolor="white", lw=0.5)
            if v > 6:
                ax.text(left + v / 2, i, f"{v:.0f}%", ha="center", va="center", color="white", fontsize=6.5)
            left += v
    ax.set_yticks([0, 1], ["Predicted", "Measured"])
    ax.set_xlim(0, 100)
    ax.set_xlabel("share of household energy (%)")
    ax.grid(False)
    handles = [plt.Rectangle((0, 0), 1, 1, color=C[a]) for a in order]
    ax.legend(handles, [NAME[a] for a in order], ncol=5, loc="lower center", bbox_to_anchor=(0.45, 1.0),
              handlelength=0.9, columnspacing=0.8)
    save(fig, "house101_mix")


def fig_monthly():
    apps = ["AC", "WaterHeater", "Fridge"]
    fig, axs = plt.subplots(len(apps), 1, figsize=(WIDE, 3.3), sharex=True)
    x, w = np.arange(len(monthly)), 0.38
    for ax, a in zip(axs, apps):
        ax.bar(x - w / 2, monthly[f"{a}_true_kwh"], w, color=C["true"], alpha=0.8, label="measured")
        ax.bar(x + w / 2, monthly[f"{a}_pred_kwh"], w, color=C[a], label="predicted")
        ax.set_ylabel("kWh")
        ax.set_title(NAME[a], loc="left", pad=2)
        ax.grid(axis="x", visible=False)
    fig.legend([plt.Rectangle((0, 0), 1, 1, color=C["true"], alpha=0.8)] +
               [plt.Rectangle((0, 0), 1, 1, color=C[a]) for a in apps],
               ["measured"] + [f"predicted: {NAME[a]}" for a in apps], ncol=4, loc="upper center",
               bbox_to_anchor=(0.5, 1.04), handlelength=1)
    axs[-1].set_xticks(x, monthly.month.dt.strftime("%b\n%Y").where(monthly.month.dt.month.isin([1, 7]) | (x == 0),
                                                                   monthly.month.dt.strftime("%b")))
    fig.tight_layout(h_pad=0.6, rect=(0, 0, 1, 0.95))
    save(fig, "house101_monthly")


def fig_day():
    apps = [("AC", 1500), ("WaterHeater", 3600), ("Fridge", 100)]
    fig, axs = plt.subplots(len(apps), 1, figsize=(COL, 3.1), sharex=True)
    h = (day.time - day.time.dt.normalize()).dt.total_seconds() / 3600
    gap = day["aggregate"].isna()
    for ax, (a, ymax) in zip(axs, apps):
        if a == "AC":
            ax.fill_between(h, day["aggregate"], step="post", color=C["Other"], alpha=0.3, lw=0, label="aggregate")
        ax.fill_between(h, day[f"{a}_true"], step="post", color=C["true"], alpha=0.25, lw=0, label="measured")
        ax.step(h, day[f"{a}_pred"], where="post", color=C[a], lw=1, label="predicted")
        ax.fill_between(h, 0, ymax, where=gap, step="post", color="#d0d5dc", alpha=0.5, lw=0, label="no data")
        ax.set_ylim(0, ymax)
        ax.set_ylabel("W")
        ax.set_title(NAME[a], loc="left", pad=2)
    axs[0].legend(ncol=4, loc="lower center", bbox_to_anchor=(0.5, 1.12), handlelength=1.2, columnspacing=0.8)
    axs[-1].set_xticks(range(0, 25, 3))
    axs[-1].set_xlim(0, 24)
    axs[-1].set_xlabel(f"hour of {pd.Timestamp(day.time.iloc[0]).strftime('%d %b %Y')} (10-min means)")
    fig.tight_layout(h_pad=0.4)
    save(fig, "house101_day")


def fig_scatter():
    apps = ["AC", "WaterHeater", "Fridge"]
    fig, axs = plt.subplots(1, len(apps), figsize=(WIDE, 2.0))
    for ax, a in zip(axs, apps):
        t, p = daily[f"{a}_true_kwh"], daily[f"{a}_pred_kwh"]
        lim = max(t.max(), p.max()) * 1.05
        ax.plot([0, lim], [0, lim], color=C["true"], lw=0.6, ls="--")
        const = daily["Fridge_on_share"] > 0.98 if a == "Fridge" else pd.Series(False, index=daily.index)
        ax.scatter(t[~const], p[~const], s=5, color=C[a], alpha=0.55, lw=0)
        r = np.corrcoef(t[~const], p[~const])[0, 1]
        title = f"{NAME[a]}  ($r$ = {r:.2f}, {(~const).sum()} days)"
        if const.any():
            ax.scatter(t[const], p[const], s=7, marker="x", color=C["true"], lw=0.6,
                       label=f"no cycling ({const.sum()} d)")
            ax.legend(loc="upper left", handletextpad=0.2, fontsize=6)
            title = f"{NAME[a]}  ($r$ = {r:.2f} excl. $\\times$)"
        ax.set_title(title, pad=3)
        ax.set_xlim(0, lim)
        ax.set_ylim(0, lim)
        ax.set_aspect("equal")
        ax.set_xlabel("measured kWh/day")
    axs[0].set_ylabel("predicted kWh/day")
    fig.tight_layout(w_pad=1.0)
    save(fig, "house101_daily_scatter")


# -------------------------------------------------------------------------------------- tables
def f(v, n=3):
    return "--" if pd.isna(v) else f"{v:.{n}f}"


def write(name, body):
    (TAB / f"{name}.tex").write_text("% generated by paper/scripts/make_figures.py -- do not edit\n" + body)


def tab_splits():
    lines = [r"\begin{tabular}{@{}llrrrrr@{}}", r"\toprule",
             r"Model & Training data & REFIT & Plegma & PRECON & Valid & Test \\", r"\midrule"]
    for _, r in train.iterrows():
        tag = " (REFIT only)" if r.variant == "refit" and (train.appliance == r.appliance).sum() > 1 else ""
        lines.append(f"{NAME[r.appliance]}{tag} & {r.train_datasets.replace('+', ' + ')} & {r.n_REFIT} & "
                     f"{r.n_Plegma} & {r.n_PRECON} & {r.valid_house} & {r.test_house} \\\\")
    write("splits", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_training():
    lines = [r"\begin{tabular}{@{}lrrrr@{}}", r"\toprule",
             r"Model & Epochs & Best & Best valid loss & Train time (min) \\", r"\midrule"]
    for _, r in train.iterrows():
        tag = " (R)" if r.variant == "refit" and (train.appliance == r.appliance).sum() > 1 else \
            (" (R+P)" if (train.appliance == r.appliance).sum() > 1 else "")
        lines.append(f"{NAME[r.appliance]}{tag} & {r.epochs_run} & {r.best_epoch} & "
                     f"\\num{{{r.best_valid_loss:.2e}}} & {f(r.train_minutes, 1)} \\\\")
    write("training", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_paper():
    lines = [r"\begin{tabular}{@{}lrrrrr@{}}", r"\toprule",
             r" & \multicolumn{2}{c}{MAE (W) $\downarrow$} & \multicolumn{2}{c}{MR $\uparrow$} & F1 $\uparrow$ \\",
             r"\cmidrule(lr){2-3}\cmidrule(lr){4-5}\cmidrule(l){6-6}",
             r"Appliance & Paper & Ours & Paper & Ours & Ours \\", r"\midrule"]
    for _, r in paper.iterrows():
        mae = f"\\textbf{{{r.ours_MAE:.1f}}}" if r.ours_MAE < r.paper_MAE else f"{r.ours_MAE:.1f}"
        pmae = f"\\textbf{{{r.paper_MAE:.1f}}}" if r.paper_MAE <= r.ours_MAE else f"{r.paper_MAE:.1f}"
        mr = f"\\textbf{{{r.ours_MR:.3f}}}" if r.ours_MR > r.paper_MR else f"{r.ours_MR:.3f}"
        pmr = f"\\textbf{{{r.paper_MR:.3f}}}" if r.paper_MR >= r.ours_MR else f"{r.paper_MR:.3f}"
        lines.append(f"{NAME[r.appliance]} & {pmae} & {mae} & {pmr} & {mr} & {r.ours_F1:.3f} \\\\")
    write("paper_comparison", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_test():
    lines = [r"\begin{tabular}{@{}llrrrrrrr@{}}", r"\toprule",
             r"Model & Test house & MAE & MR & MR$_\text{pp}$ & F1 & Prec. & Rec. & SAE \\", r"\midrule"]
    for _, r in test.iterrows():
        tag = " (R)" if r.variant == "refit" and r.appliance in ("Fridge", "WashingMachine") else \
            (" (R+P)" if r.appliance in ("Fridge", "WashingMachine") else "")
        lines.append(f"{NAME[r.appliance]}{tag} & {r.test_dataset} {r.test_house} & {r.MAE_raw:.1f} & "
                     f"{f(r.MR_raw)} & {f(r.MR_post)} & {f(r.F1)} & {f(r.precision)} & {f(r.recall)} & "
                     f"{f(r.SAE)} \\\\")
    write("test_metrics", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_house():
    t = test[test.test_house == HH["house"]].set_index("appliance").loc[APPS101]
    lines = [r"\begin{tabular}{@{}lrrrrrrrr@{}}", r"\toprule",
             r"Appliance & F1 & Prec. & Rec. & MAE & RMSE & SAE & NDE & kWh (meas./pred.) \\", r"\midrule"]
    for a, r in t.iterrows():
        lines.append(f"{NAME[a]} & {f(r.F1)} & {f(r.precision)} & {f(r.recall)} & {r.MAE_post:.1f} & "
                     f"{r.RMSE_post:.1f} & {f(r.SAE)} & {f(r.NDE)} & {r.true_kwh:.0f} / {r.pred_kwh:.0f} \\\\")
    write("house101", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_quarterly():
    p = quarterly.pivot(index="appliance", columns="quarter", values="F1").loc[APPS101]
    qs = sorted(p.columns, key=lambda q: (q.split("/")[1], q))
    lines = [r"\begin{tabular}{@{}l" + "r" * len(qs) + r"@{}}", r"\toprule",
             "Appliance & " + " & ".join(qs) + r" \\", r"\midrule"]
    for a, r in p.iterrows():
        lines.append(f"{NAME[a]} & " + " & ".join(f(r[q]) for q in qs) + r" \\")
    write("house101_quarterly", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def tab_ablation():
    lines = [r"\begin{tabular}{@{}lllrrr@{}}", r"\toprule",
             r"Study & Appliance & Variant & F1 & SAE & kWh (meas./pred.) \\", r"\midrule"]
    title = {"training_data": "Training data", "fridge_threshold": "Threshold", "gain": "Energy gain",
             "inventory": "Inventory"}
    prev = None
    for _, r in abl.iterrows():
        if prev is not None and r.study != prev:
            lines.append(r"\addlinespace")
        s = title[r.study] if r.study != prev else ""
        prev = r.study
        lines.append(f"{s} & {NAME[r.appliance]} & {r.variant} & {f(r.F1)} & {f(r.SAE)} & "
                     f"{r.true_kwh:.0f} / {r.pred_kwh:.0f} \\\\")
    write("ablations", "\n".join(lines + [r"\bottomrule", r"\end{tabular}"]) + "\n")


def numbers():
    """LaTeX macros for every number the text quotes (\\newcommand{\\ACFone}{0.809} ...)."""
    n = {}
    alpha = {"Kettle": "Kettle", "Microwave": "MW", "Dishwasher": "DW", "WashingMachine": "WM",
             "Fridge": "Fridge", "TumbleDryer": "TD", "AC": "AC", "WaterHeater": "WH"}
    for _, r in test.iterrows():
        k = alpha[r.appliance] + ("Refit" if r.variant == "refit" and r.appliance in ("Fridge", "WashingMachine") else "")
        n[f"{k}Fone"] = f(r.F1)
        n[f"{k}MR"] = f(r.MR_raw)
        n[f"{k}MAE"] = f"{r.MAE_raw:.1f}"
        n[f"{k}SAE"] = f(r.SAE, 2)
        n[f"{k}Prec"] = f(r.precision)
        n[f"{k}Rec"] = f(r.recall)
        n[f"{k}TrueKWh"] = f"{r.true_kwh:,.0f}"
        n[f"{k}PredKWh"] = f"{r.pred_kwh:,.0f}"
    t101 = test[test.test_house == HH["house"]]
    n["HouseMeanFone"] = f(t101.F1.mean(), 2)
    n["HouseKWh"] = f"{HH['aggregate_kwh']:,.0f}"
    n["HouseDays"] = f"{HH['valid_days']:.0f}"
    n["HouseMissing"] = f"{100 * HH['missing_share']:.1f}"
    n["HouseMetered"] = f"{100 * HH['metered_share']:.0f}"
    n["HouseFound"] = f"{100 * HH['found_share']:.0f}"
    n["NParams"] = f"{meta['n_params']:,}"
    m = mix.set_index("appliance")
    for a in APPS101 + ["Other"]:
        k = alpha.get(a, a)
        n[f"{k}TrueShare"] = f"{100 * m.loc[a, 'true_share']:.0f}"
        n[f"{k}PredShare"] = f"{100 * m.loc[a, 'pred_share']:.0f}"
    mo = monthly.set_index(monthly.month.dt.strftime("%Y%m"))
    for ym, lab in [("202307", "Jul"), ("202301", "Jan")]:
        if ym in mo.index:
            n[f"AC{lab}True"] = f"{mo.loc[ym, 'AC_true_kwh']:.0f}"
            n[f"AC{lab}Pred"] = f"{mo.loc[ym, 'AC_pred_kwh']:.0f}"
            n[f"AC{lab}Pct"] = f"{100 * mo.loc[ym, 'AC_pred_kwh'] / mo.loc[ym, 'AC_true_kwh']:.0f}"
    q = quarterly.set_index(["appliance", "quarter"]).F1
    n["ACQfourF"] = f(q.get(("AC", "Q4/2022")))
    n["ACQthreeF"] = f(q.get(("AC", "Q3/2023")))
    a = abl.set_index(["study", "appliance", "variant"])
    get = lambda *k: a.loc[k] if k in a.index else None  # noqa: E731
    for key, k in [("FridgeThrTuned", ("fridge_threshold", "Fridge", "tuned on house 103")),
                   ("FridgeThrFixed", ("fridge_threshold", "Fridge", "fixed 20 W")),
                   ("FridgeRefitOnly", ("training_data", "Fridge", "REFIT only")),
                   ("WMRefitOnly", ("training_data", "WashingMachine", "REFIT only")),
                   ("FridgeRefitPlegma", ("training_data", "Fridge", "REFIT + Plegma"))]:
        r = get(*k)
        if r is not None:
            n[f"{key}Fone"] = f(r.F1)
            n[f"{key}SAE"] = f(r.SAE, 2)
            n[f"{key}MRpp"] = f(r.MR_post)
            n[f"{key}Thr"] = f"{r.threshold_w:.0f}"
    fc = HH.get("fridge_constant_draw", {})
    if fc:
        n["FridgeConstDays"] = str(fc["days"])
        n["FridgeConstW"] = f"{fc['median_w']:.0f}"
        n["FridgeExclFone"] = f(fc["F1_excl"])
        n["FridgeExclSAE"] = f(fc["SAE_excl"], 2)
        n["FridgeDailyRall"] = f(fc["daily_r_all"], 2)
        n["FridgeDailyRexcl"] = f(fc["daily_r_excl"], 2)
    r = get("inventory", "TumbleDryer", "run on house 2")
    if r is not None:
        n["TDFalseKWh"] = f"{r.pred_kwh:.0f}"
    body = "".join(f"\\newcommand{{\\{k}}}{{{v.replace(',', '{,}')}}}\n" for k, v in n.items())
    write("numbers", body)
    return n


def main():
    FIG.mkdir(parents=True, exist_ok=True)
    TAB.mkdir(parents=True, exist_ok=True)
    for fn in [fig_paper, fig_curves, fig_mix, fig_monthly, fig_day, fig_scatter]:
        fn()
    for fn in [tab_splits, tab_training, tab_paper, tab_test, tab_house, tab_quarterly, tab_ablation]:
        fn()
    n = numbers()
    print(f"figures: {sorted(p.name for p in FIG.glob('*.pdf'))}")
    print(f"tables: {sorted(p.name for p in TAB.glob('*.tex'))}  ({len(n)} number macros)")


if __name__ == "__main__":
    main()
