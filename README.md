# project-wattprint

Mỗi thư mục con là một project độc lập, có `docker-compose.yml` và `.env` riêng.

| Folder | Mô tả | Cổng mặc định |
|---|---|---|
| `backend/` | FastAPI + PostgreSQL/TimescaleDB, API trả dữ liệu phân rã | API `8001`, DB `5433` |
| `nilmformer-experiment/` | Train / suy luận NILMFormer (GPU) + inference API | `8002` |

Luồng dữ liệu: `nilmformer-experiment` (train, suy luận) → CSV phân rã → `backend` (TimescaleDB + API).

---

## Bắt đầu trên server (GPU)

Làm lần lượt. Mỗi bước có cách kiểm tra; đừng sang bước sau nếu bước trước chưa đạt.

### 0. Yêu cầu

- Linux, Docker + Compose v2, `make`, git.
- NVIDIA driver (≥ 550) và NVIDIA Container Toolkit. Dự án đã kiểm tra trên RTX 4060; RTX 5880 Ada cùng kiến trúc Ada (sm_89).
- Trống ≥ 30GB (dữ liệu REFIT ~6.5GB sau giải nén, cache + image).

Kiểm tra Docker thấy GPU:

```bash
docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi
```

### 1. Lấy code

```bash
git clone https://github.com/daFoggo/project-wattprint.git
cd project-wattprint
```

### 2. Backend (FastAPI + TimescaleDB)

```bash
cd backend
cp .env.example .env     # ĐỔI POSTGRES_PASSWORD; sửa DB_HOST_PORT / API_HOST_PORT nếu cổng bận
docker compose up -d --build
curl localhost:8001/api/v1/health      # -> {"status":"ok","timescaledb":"2.x"}
```

Tài liệu API: `http://<server>:8001/docs`. Test (tùy chọn):
`docker compose run --rm --no-deps backend sh -c "uv sync --group dev && pytest -q"`.

### 3. Dữ liệu REFIT (không nằm trong git)

Tải `CLEAN_REFIT_081116.7z` (490MB) từ <https://pureportal.strath.ac.uk/en/datasets/refit-electrical-load-measurements-cleaned>
(server tải trực tiếp hay bị chặn → tải trên máy cá nhân rồi copy sang), giải nén, đặt **20 file** `CLEAN_House*.csv` vào:

```
nilmformer-experiment/NILMFormer/data/REFIT/RAW_DATA_CLEAN/
├── HOUSES_Labels          # đã có sẵn trong git
├── CLEAN_House1.csv ... CLEAN_House21.csv   # (không có nhà 14)
```

Ví dụ copy từ máy cá nhân: `rsync -avP CLEAN_REFIT_081116/*.csv user@server:~/project-wattprint/nilmformer-experiment/NILMFormer/data/REFIT/RAW_DATA_CLEAN/`

### 4. Kiểm tra trước khi train dài (vài phút)

```bash
cd ../nilmformer-experiment
cp .env.example .env
make build
make validate            # phải ra "12/12 checks passed"
```

Lỗi hay gặp: `gpu` FAIL → driver / NVIDIA Container Toolkit; `data files` FAIL → thiếu CSV ở bước 3.

### 5. Train (paper: 50 epoch, early stopping)

```bash
make train               # 4 model (Kettle, Microwave, Dishwasher, WashingMachine) song song
```

Chạy lâu → dùng `tmux`/`screen` hoặc `nohup make train &`. Theo dõi: `tail -f artifacts/train_Kettle.log`.
Kết quả: `artifacts/models/REFIT_<App>_NILMFormer.pt`. Nếu muốn train thêm: `make resume` (+20 epoch).
Lần chạy đầu mất thêm vài phút để tiền xử lý dữ liệu (được cache trong `artifacts/cache/`).

### 6. Phân rã 1 hộ + hậu xử lý

```bash
make all-outputs         # predict nhà test (2) & valid (9) -> tune ngưỡng trên nhà valid -> postprocess nhà test
cat artifacts/outputs/house_2_disaggregation_metrics.json
```

Chưa ưng kết quả → **không cần train lại**: sửa `pipeline/postprocess.yaml` rồi `make postprocess` (vài giây).
Đổi nhà: `make all-outputs TEST_HOUSE=15 VALID_HOUSE=3` (nhà phải có đủ 4 thiết bị: 2, 3, 6, 9, 13, 15).

### 7. Đưa vào backend

```bash
curl -X POST "http://localhost:8001/api/v1/households/import?household=REFIT%20House%202" \
     -F "file=@artifacts/outputs/house_2_disaggregation.csv"
# -> {"household_id":"<uuid>","rows_per_device":{...}}

curl "http://localhost:8001/api/v1/households"      # lấy id
curl "http://localhost:8001/api/v1/households/<uuid>/disaggregation?start=2014-01-01T00:00:00Z&end=2014-01-08T00:00:00Z&bucket=1%20hour"
```

Kết quả gồm chuỗi theo từng thiết bị (+ `Other` = phần còn lại), tổng Wh và % tiêu thụ.
Import lại cùng file sẽ ghi đè (không nhân đôi dữ liệu).

### 8. Inference API (tùy chọn)

```bash
make serve                                          # trong nilmformer-experiment, cổng 8002
curl localhost:8002/health
# qua backend (backend tự gọi service này; NILM_SERVICE_URL trong backend/.env):
curl -X POST localhost:8001/api/v1/disaggregate -H 'content-type: application/json' \
     -d '{"start":"2014-01-01T00:00:00","power_w":[...ít nhất 128 giá trị, mỗi phút 1 giá trị, null = thiếu...]}'
```

### Cổng & bảo mật

Mặc định các cổng mở trên mọi interface. Trên server thật: đổi mật khẩu DB, đặt firewall (chỉ mở `8001`, đóng `5433`/`8002`
với bên ngoài) hoặc đặt sau reverse proxy.

Chi tiết kỹ thuật pipeline NILM (kiến trúc, khác biệt so với paper): [`nilmformer-experiment/README.md`](nilmformer-experiment/README.md).
