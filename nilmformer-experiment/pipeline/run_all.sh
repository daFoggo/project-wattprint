#!/bin/sh
# Train the 4 appliance models in parallel inside this container (paper protocol: 50 epochs).
# Extra args are forwarded to pipeline.train, e.g.:  sh pipeline/run_all.sh --resume --epochs 20
# Per-appliance logs: artifacts/train_<Appliance>.log
N=$(nproc)
export OMP_NUM_THREADS=$(( N / 4 > 0 ? N / 4 : 1 ))
pids=""
for app in Kettle Microwave Dishwasher WashingMachine; do
  python -m pipeline.train --appliance "$app" "$@" > "artifacts/train_$app.log" 2>&1 &
  pids="$pids $!"
done
fail=0
for p in $pids; do wait "$p" || fail=1; done
for app in Kettle Microwave Dishwasher WashingMachine; do
  echo "== $app"; tail -n 2 "artifacts/train_$app.log"
done
exit $fail
