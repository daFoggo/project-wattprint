# NILMFormer experiment (Docker)

Code gốc: https://github.com/adrienpetralia/NILMFormer (vendored trong `NILMFormer/`, Apache-2.0).

```bash
cd nilmformer-experiment
docker compose --profile tools run --rm download-refit   # tải REFIT clean (~490MB) vào NILMFormer/data/REFIT/RAW_DATA_CLEAN
docker compose run --rm experiment                        # chạy theo cấu hình trong .env
```
Kết quả nằm ở `results/`. Đổi `DATASET/APPLIANCE/MODEL/WINDOW_SIZE/SEED` trong `.env`.
Cần Docker Desktop + NVIDIA GPU (đã kiểm tra: RTX 4060).
