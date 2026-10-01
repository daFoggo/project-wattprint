#!/bin/sh
# Train appliance models in parallel inside this container (paper protocol: 50 epochs).
# APPS picks the appliances (default: the 4 paper ones); extra args go to pipeline.train, e.g.:
#   APPS="Fridge TumbleDryer" sh pipeline/run_all.sh
#   sh pipeline/run_all.sh --resume --epochs 20
# Per-appliance logs: artifacts/train_<Appliance>.log
APPS=${APPS:-Kettle Microwave Dishwasher WashingMachine}
N=$(nproc)
K=$(echo $APPS | wc -w)
export OMP_NUM_THREADS=$(( N / K > 0 ? N / K : 1 ))
pids=""
for app in $APPS; do
  python -m pipeline.train --appliance "$app" "$@" > "artifacts/train_$app.log" 2>&1 &
  pids="$pids $!"
done
fail=0
for p in $pids; do wait "$p" || fail=1; done
for app in $APPS; do
  echo "== $app"; tail -n 2 "artifacts/train_$app.log"
done
exit $fail
