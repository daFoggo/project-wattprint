# project-wattprint

Mỗi thư mục con là một project độc lập, có `docker-compose.yml` và `.env` riêng.

| Folder | Mô tả | Cổng mặc định |
|---|---|---|
| `backend/` | FastAPI + PostgreSQL/TimescaleDB, API trả dữ liệu phân rã | API `8001`, DB `5433` |
| `nilmformer-experiment/` | Train / suy luận NILMFormer (GPU) + inference API | `8002` |
| `mobile-app/` | Ứng dụng di động React Native / Expo (theo dõi điện năng & Copilot) | Metro `8081` |

Luồng dữ liệu: `nilmformer-experiment` (train, suy luận) → CSV phân rã → `backend` (TimescaleDB + API) → `mobile-app` (trực quan hoá tiêu thụ, biểu giá điện, RAG Copilot).

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

### 3. Dữ liệu (không nằm trong git)

**REFIT** (thiết bị paper): tải `CLEAN_REFIT_081116.7z` (490MB) từ
<https://pureportal.strath.ac.uk/en/datasets/refit-electrical-load-measurements-cleaned> (server tải trực tiếp hay bị chặn
→ tải trên máy cá nhân rồi copy sang), giải nén **20 file** `CLEAN_House*.csv` vào:

```
nilmformer-experiment/NILMFormer/data/REFIT/RAW_DATA_CLEAN/
├── HOUSES_Labels          # có sẵn trong git
├── CLEAN_House1.csv ... CLEAN_House21.csv   # (không có nhà 14)
```

**Plegma + PRECON** (chỉ để train AC, bình nóng lạnh; Plegma 101 là hộ phục vụ backend):

```bash
cd ..                    # về thư mục gốc repo (bước 2 đang ở backend/)
D=nilmformer-experiment/NILMFormer/data/_raw
# Plegma: tải PlegmaDataset_Clean.7z bằng trình duyệt (server bị chặn) từ
#   https://doi.org/10.15129/3b01a6c6-2efd-424a-b8b8-5fe7fa445ded , copy lên rồi:
7z x -o$D/plegma PlegmaDataset_Clean.7z 'Clean_Dataset/House_*/Electric_data/*'
# PRECON: server tải trực tiếp được
mkdir -p $D/precon && cd $D/precon && wget http://web.lums.edu.pk/~eig/precon_files/PRECON.zip \
  http://web.lums.edu.pk/~eig/precon_files/Metadata.csv && unzip PRECON.zip && rm PRECON.zip && cd -
```

### 4. Kiểm tra trước khi train dài (vài phút)

```bash
cd nilmformer-experiment
cp .env.example .env     # sửa INFERENCE_PORT nếu cổng bận
make build
make convert             # Plegma, PRECON -> layout REFIT (vài phút, 1 lần)
make validate            # phải ra "13/13 checks passed"
```

Lỗi hay gặp: `gpu` FAIL → driver / NVIDIA Container Toolkit; `data files` FAIL → thiếu CSV REFIT;
`extra appliances` FAIL → chưa `make convert`.

### 5. Train (paper: 50 epoch, early stopping)

```bash
make train               # Kettle, Microwave, Dishwasher, WashingMachine song song
make train-extra         # Fridge, TumbleDryer, AC, WaterHeater
```

Chạy lâu → dùng `tmux`/`screen` hoặc `nohup make train &`. Theo dõi: `tail -f artifacts/train_Kettle.log`.
Kết quả: `artifacts/models/REFIT_<App>_NILMFormer.pt`. Nếu muốn train thêm: `make resume APPS="AC"` (+20 epoch).
Lần chạy đầu mất thêm vài phút để tiền xử lý dữ liệu (được cache trong `artifacts/cache/`).
Thiết bị nào train trên nhà nào: [`nilmformer-experiment/README.md`](nilmformer-experiment/README.md#thiết-bị--dữ-liệu-pipelineappliancesyaml).

### 6. Phân rã hộ phục vụ + hậu xử lý

Backend chỉ phục vụ **1 hộ: Plegma 101** (không model nào train trên nhà này; có AC, bình nóng lạnh, tủ lạnh, máy giặt).
Model chỉ chạy cho thiết bị hộ có.

```bash
make all-outputs         # predict hộ 101 & valid 103 -> tune ngưỡng trên 103 -> postprocess 101
cat artifacts/outputs/house_101_disaggregation_metrics.json
```

Chưa ưng kết quả → **không cần train lại**: sửa `pipeline/postprocess.yaml` rồi `make postprocess` (vài giây).
Đánh giá model paper trên REFIT: `make all-outputs TEST_HOUSE=2 VALID_HOUSE=9`.

### 7. Đưa vào backend

```bash
curl -X POST "http://localhost:8001/api/v1/households/import?household=Plegma%20House%20101" \
     -F "file=@artifacts/outputs/house_101_disaggregation.csv"          # vài phút
# -> {"household_id":"<uuid>","rows_per_device":{...}}

curl "http://localhost:8001/api/v1/households"      # lấy id
curl "http://localhost:8001/api/v1/households/<uuid>/disaggregation?start=2023-07-10T00:00:00Z&end=2023-07-17T00:00:00Z&bucket=1%20hour"
```

Kết quả gồm chuỗi theo từng thiết bị (+ `Other` = phần còn lại), tổng Wh và % tiêu thụ. Dữ liệu hộ 101: 07/2022 – 09/2023.
Import lại cùng file sẽ ghi đè (không nhân đôi dữ liệu).

### 7b. API demo (1 hộ, kết quả có sẵn, không chạy model)

Mọi kết quả đều đã tính sẵn từ thực nghiệm: chuỗi dự đoán lấy từ DB (bước 7), phần đánh giá so với số đo thật lấy từ
`backend/app/demo/plegma_101.json`. Không cần id hay tham số, mỗi lời gọi trả về trong khoảng 5–400 ms.

| API | Trả về |
|---|---|
| `GET /api/v1/demo/household` | Hồ sơ hộ (dataset, thời gian, thiết bị, cửa sổ gợi ý) và thông tin model |
| `GET /api/v1/demo/consumption?start=&end=&bucket=` | Công suất tổng + dự đoán từng thiết bị, kèm kWh và %. Mặc định: tuần 10–17/07/2023, theo giờ |
| `GET /api/v1/demo/breakdown?start=&end=&customer=` | kWh, % và **tiền** (đã VAT) từng thiết bị. Mặc định: cả kỳ |
| `GET /api/v1/demo/billing?month=&asof=&customer=` | Hóa đơn tháng đến `asof` và dự báo cả tháng: **hộ (`household`) tính 6 bậc**, **kinh doanh/sản xuất (`business`/`production`) tính theo giờ TOU**. Có VAT |
| `GET /api/v1/demo/evaluation` | F1, MAE, SAE... từng thiết bị, cơ cấu thật/dự đoán, F1 theo quý, nhận xét |
| `GET /api/v1/demo/evaluation/monthly` · `/daily?start=&end=` | kWh thật và dự đoán theo tháng / theo ngày |
| `GET /api/v1/demo/evaluation/sample-day` | Ngày 12/07/2023, 10 phút một điểm, công suất thật và dự đoán |

**Giá điện** (`backend/app/billing/`): biểu giá là dữ liệu (`tariffs.py`, QĐ 1279/QĐ-BCT: 6 bậc sinh hoạt 1.984–3.460 đ/kWh, TOU kinh doanh và sản xuất theo cấp điện áp, VAT 8% đến hết 2026), phép tính là hàm thuần (`engine.py`, có test). Hộ sinh hoạt chưa có TOU nên luôn tính 6 bậc; TOU chỉ dành cho kinh doanh/sản xuất (`voltage=`, `hours=legacy|qd963`). Biểu 5 bậc (QĐ 14/2025/QĐ-TTg) chưa áp dụng, thêm khi có giá.

Tài liệu: OpenAPI **3.2.0** tại `/api/v1/openapi.json` (bản lưu: `backend/openapi.json`), Swagger UI tại `/docs`.
Lỗi trả theo RFC 9457 (`application/problem+json`). Sau khi train lại: `make paper-data demo-snapshot` trong
`nilmformer-experiment/`, rồi `docker compose up -d --build backend` và
`docker compose exec backend python -m app.openapi_export > openapi.json`.

### 8. Inference API

```bash
make serve                                          # trong nilmformer-experiment, cổng 8002
curl localhost:8002/health                          # appliances = NILM_APPS trong .env (thiết bị của hộ 101)
# qua backend (backend tự gọi service này; NILM_SERVICE_URL trong backend/.env):
curl -X POST localhost:8001/api/v1/disaggregate -H 'content-type: application/json' \
     -d '{"start":"2023-07-10T00:00:00","power_w":[...ít nhất 128 giá trị, mỗi phút 1 giá trị, null = thiếu...]}'
```

### 9. Mobile App (Expo / React Native)

Thư mục `mobile-app/` là ứng dụng di động cho người dùng cuối (iOS / Android / Web), kết nối với FastAPI backend để hiển thị phân rã phụ tải và gợi ý tiết kiệm điện.

#### Cài đặt & chạy:

```bash
cd mobile-app
pnpm install
cp .env.example .env    # cấu hình EXPO_PUBLIC_API_URL=http://localhost:8001/api/v1
pnpm start
```

#### Chạy trên thiết bị thật qua USB Debugging:

1. Kết nối điện thoại Android qua cáp USB, bật **USB Debugging**.
2. Thiết lập reverse port forwarding để điện thoại kết nối Metro và Backend:
   ```bash
   adb reverse tcp:8081 tcp:8081    # Metro bundler
   adb reverse tcp:8001 tcp:8001    # Backend API
   ```
3. Mở ứng dụng WattPrint trên điện thoại (hoặc nhấn `a` trong terminal Metro, hoặc chạy `pnpm android` nếu cần build lại APK).
4. Chi tiết về Fast Refresh / Hot Reload xem tại [`mobile-app/README.md`](mobile-app/README.md).

### Cổng & bảo mật

Mặc định các cổng mở trên mọi interface. Trên server thật: đổi mật khẩu DB, đặt firewall (chỉ mở `8001`, đóng `5433`/`8002`
với bên ngoài) hoặc đặt sau reverse proxy.

Chi tiết kỹ thuật pipeline NILM (kiến trúc, khác biệt so với paper): [`nilmformer-experiment/README.md`](nilmformer-experiment/README.md).

