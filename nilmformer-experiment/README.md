# NILMFormer experiment (Docker)

Code gốc: https://github.com/adrienpetralia/NILMFormer (vendored trong `NILMFormer/`, Apache-2.0).

```bash
cd nilmformer-experiment
docker compose --profile tools run --rm download-refit   # tải REFIT clean (~490MB) vào NILMFormer/data/REFIT/RAW_DATA_CLEAN
docker compose run --rm experiment                        # chạy theo cấu hình trong .env
```
Kết quả nằm ở `results/`. Đổi `DATASET/APPLIANCE/MODEL/WINDOW_SIZE/SEED` trong `.env`.
Cần Docker Desktop + NVIDIA GPU (đã kiểm tra: RTX 4060).

## Kết quả (REFIT, NILMFormer, window 128, 1min, seed 0, **3 epoch** mặc định)

| Appliance | MAE | RMSE | NDE | F1 | Precision | Recall |
|---|---|---|---|---|---|---|
| WashingMachine | 26.9 | 198.4 | 0.883 | 0.290 | 0.248 | 0.350 |
| Dishwasher | 38.6 | 232.2 | 0.677 | 0.543 | 0.401 | 0.840 |
| Kettle | 11.6 | 136.9 | 0.420 | 0.743 | 0.731 | 0.755 |
| Microwave | 3.1 | 56.6 | 0.999 | 0.002 | 0.500 | 0.001 |

Microwave gần như không phát hiện được (mô hình dự đoán ~0): cần train lâu hơn.
Chạy song song từng thiết bị: `APPLIANCE=Kettle docker compose run -d --rm --name nilm-Kettle experiment`.
Tổng hợp metric từ checkpoint: `docker compose run --rm --no-deps experiment python tools/summarize.py` → `results/summary.csv`.
