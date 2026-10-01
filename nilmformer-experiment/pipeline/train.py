"""Train (or continue training) one appliance model and save a self-contained bundle.

    python -m pipeline.train --appliance Kettle --epochs 30
    python -m pipeline.train --appliance Kettle --epochs 20 --resume   # 20 more epochs
"""
import argparse
import logging

import numpy as np
import torch
import torch.nn as nn
from omegaconf import OmegaConf

from pipeline.common import (ART, FastNILMDataset, bundle_path, env_default, house_data,
                             load_config)
from src.helpers.dataset import NILMscaler
from src.helpers.expes import get_model_instance
from src.helpers.metrics import NILMmetrics
from src.helpers.trainer import SeqToSeqTrainer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--appliance", required=True)
    ap.add_argument("--model", default="NILMFormer")
    ap.add_argument("--epochs", type=int, default=None, help="default: paper (50)")
    ap.add_argument("--test-house", type=int, default=None, help="default: pipeline/appliances.yaml")
    ap.add_argument("--valid-house", type=int, default=None, help="default: pipeline/appliances.yaml")
    ap.add_argument("--batch-size", type=int, default=None)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument("--sampling-rate", default=env_default("SAMPLING_RATE", "1min"))
    ap.add_argument("--window-size", type=int, default=int(env_default("WINDOW_SIZE", "128")))
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--train-houses", type=int, nargs="+", default=None, help="smoke tests")
    ap.add_argument("--max-windows", type=int, default=None, help="random subset (smoke tests)")
    a = ap.parse_args()

    np.random.seed(a.seed)
    torch.manual_seed(a.seed)
    cfg = load_config(a.appliance, a.model)
    cfg.sampling_rate, cfg.window_size = a.sampling_rate, a.window_size
    bs = a.batch_size or cfg.batch_size
    a.test_house = a.test_house or cfg.test_house
    a.valid_house = a.valid_house or cfg.valid_house

    assert a.test_house in cfg.house_with_app_i and a.valid_house in cfg.house_with_app_i
    held_out = {a.test_house, a.valid_house}
    train_h = a.train_houses or [h for h in cfg.house_with_app_i if h not in held_out]
    epochs = a.epochs or cfg.epochs
    logging.info("train houses=%s valid=%s test=%s", train_h, a.valid_house, a.test_house)

    app = [a.appliance]
    X_tr, st_tr = house_data(app, train_h, a.sampling_rate, a.window_size)
    X_va, st_va = house_data(app, [a.valid_house], a.sampling_rate, a.window_size)

    if a.max_windows:
        rng = np.random.default_rng(a.seed)
        i_tr = np.sort(rng.choice(len(X_tr), min(a.max_windows, len(X_tr)), replace=False))
        i_va = np.sort(rng.choice(len(X_va), min(a.max_windows, len(X_va)), replace=False))
        X_tr, st_tr, X_va, st_va = X_tr[i_tr], st_tr.iloc[i_tr], X_va[i_va], st_va.iloc[i_va]

    # scaler fitted on TRAIN houses only (the original script fits it on every house)
    scaler = NILMscaler(cfg.power_scaling_type, cfg.appliance_scaling_type)
    X_tr = scaler.fit_transform(X_tr.copy())
    X_va = scaler.transform(X_va.copy())

    exo = list(cfg.list_exo_variables)

    def mk(X, st):
        return FastNILMDataset(X, st, exo, a.sampling_rate)

    train_loader = torch.utils.data.DataLoader(mk(X_tr, st_tr), batch_size=bs, shuffle=True)
    valid_loader = torch.utils.data.DataLoader(mk(X_va, st_va), batch_size=256, shuffle=False)

    net = get_model_instance(cfg.name_model, c_in=1 + 2 * len(exo), window_size=a.window_size,
                             **cfg.model_kwargs)
    trainer = SeqToSeqTrainer(
        net, train_loader=train_loader, valid_loader=valid_loader,
        learning_rate=cfg.model_training_param.lr, weight_decay=cfg.model_training_param.wd,
        criterion=nn.MSELoss(), f_metrics=NILMmetrics(),
        training_in_model=cfg.model_training_param.training_in_model,
        patience_es=cfg.p_es, patience_rlr=cfg.p_rlr, n_warmup_epochs=cfg.n_warmup_epochs,
        verbose=True, plotloss=False, device=cfg.device, all_gpu=False,
        save_checkpoint=True,
        path_checkpoint=str(ART / "models" / f"trainlog_{a.appliance}_{a.model}"),
    )

    if a.resume and bundle_path(a.appliance, a.model).exists():
        b = torch.load(bundle_path(a.appliance, a.model), map_location="cpu", weights_only=False)
        net.load_state_dict(b["state_dict"])
        if b["optimizer_state_dict"] is not None:
            trainer.optimizer.load_state_dict(b["optimizer_state_dict"])
        trainer.best_loss = b["best_valid_loss"]
        trainer.loss_train_history = list(b["loss_train_history"])
        trainer.loss_valid_history = list(b["loss_valid_history"])
        logging.info("Resumed from %d epochs (best valid %.6f)",
                     len(trainer.loss_valid_history), trainer.best_loss)

    trainer.train(epochs)
    trainer.restore_best_weights()

    torch.save({
        "state_dict": {k: v.cpu() for k, v in net.state_dict().items()},
        "optimizer_state_dict": trainer.log.get("optimizer_state_dict"),
        "config": OmegaConf.to_container(cfg),
        "scaler": scaler,
        "window_size": a.window_size,
        "sampling_rate": a.sampling_rate,
        "train_houses": train_h, "valid_house": a.valid_house, "test_house": a.test_house,
        "best_valid_loss": float(min(trainer.loss_valid_history)),
        "loss_train_history": trainer.loss_train_history,
        "loss_valid_history": trainer.loss_valid_history,
    }, bundle_path(a.appliance, a.model))
    logging.info("Saved %s | epochs so far: %d | best valid loss %.6f",
                 bundle_path(a.appliance, a.model), len(trainer.loss_valid_history),
                 min(trainer.loss_valid_history))


if __name__ == "__main__":
    main()
