#!/bin/sh
# Run NILMFormer on every REFIT appliance sequentially, then summarize.
for app in WashingMachine Dishwasher Kettle Microwave; do
  [ -f "result/REFIT_${app}_${SAMPLING_RATE}/${WINDOW_SIZE}/${MODEL}_${SEED}.pt" ] && continue
  python -m scripts.run_one_expe --dataset REFIT --sampling_rate "$SAMPLING_RATE" \
    --appliance "$app" --window_size "$WINDOW_SIZE" --name_model "$MODEL" --seed "$SEED" \
    || echo "FAILED: $app"
done
python tools/summarize.py
