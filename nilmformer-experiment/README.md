# NILMFormer experiment (Docker)

Code gốc: https://github.com/adrienpetralia/NILMFormer (vendored trong `NILMFormer/`, Apache-2.0).
Paper: https://arxiv.org/abs/2506.05880. Mọi thứ chạy trong Docker; project này độc lập với `../backend`.

## Kiến trúc

```
train ──► artifacts/models/REFIT_<App>_NILMFormer.pt   (model + scaler + config, tự đủ để suy luận)
              │
predict ──► artifacts/predictions/house_N_raw.parquet  (dự đoán THÔ — không bao giờ cần tính lại)
              │
postprocess ──► artifacts/outputs/house_N_disaggregation.csv  (+ _metrics.json)   ──► backend import
              ▲
   pipeline/postprocess.yaml  (ngưỡng, độ dài tối thiểu, làm mượt, ràng buộc tổng ≤ aggregate)

inference service (POST /disaggregate) = pipeline/engine.py, cùng đường code với predict
```

Đổi hậu xử lý → chỉ chạy lại `postprocess` (vài giây). Train thêm epoch → `--resume`. Không bước nào buộc train lại.

## Cấu hình train = paper

`pipeline/paper.yaml` ghi đè mặc định của repo (3 epoch): **50 epoch**, early stopping **10**, ReduceLROnPlateau **5**,
batch 64, lr 1e-4, MSE. Window 128, 1min. Khác paper (có chủ đích): 1 nhà test (2) + 1 nhà valid (9) thay vì 2 test + 1 valid,
scaler fit trên các nhà train, train loader có shuffle; chỉ 1 seed (paper trung bình 3 seed).

## Chuyển lên server (RTX 5880 Ada — cùng kiến trúc Ada sm_89, image hiện tại dùng được)

Yêu cầu: Docker + NVIDIA driver (≥ 550) + NVIDIA Container Toolkit.

```bash
git clone https://github.com/daFoggo/project-wattprint && cd project-wattprint/nilmformer-experiment
cp .env.example .env
# copy dữ liệu REFIT (không có trong git) vào NILMFormer/data/REFIT/RAW_DATA_CLEAN/  (20 CSV CLEAN_House*.csv + HOUSES_Labels)
make build
make convert       # Plegma + PRECON (chỉ để train) -> layout REFIT (xem "Thiết bị & dữ liệu")
make validate      # smoke test cả chuỗi trong vài phút — phải 13/13 PASS trước khi train dài
make train         # 4 model song song, 50 epoch + early stopping; log: artifacts/train_<App>.log
make train-extra   # Fridge, TumbleDryer, AC, WaterHeater (ngoài paper), cùng protocol
make all-outputs   # predict (nhà 101 & 103) -> tune ngưỡng trên nhà valid -> postprocess nhà test
make serve         # inference API :8002 (model của NILM_APPS trong .env)
```

`make validate` kiểm tra: GPU, đủ file dữ liệu, cấu hình = paper, số tham số ≈ 0.385M (paper), đặc trưng thời gian,
cấu hình thiết bị bổ sung (nhà/nhãn, đổi tên nhãn), train 1 epoch trên tập con, `--resume`, predict, postprocess (tổng ≤ aggregate), độ trễ suy luận, và API `/disaggregate`.

## Thiết bị & dữ liệu (`pipeline/appliances.yaml`)

Paper chỉ dùng Kettle, Microwave, Dishwasher, WashingMachine trên REFIT (Anh). Thêm thiết bị phổ biến, tiêu thụ lớn —
AC và bình nóng lạnh không có trong REFIT nên lấy từ 2 bộ dữ liệu khác, **chỉ dùng để train**:

| Bộ | Nhà (id trong pipeline) | Nguồn | Ghi chú |
|---|---|---|---|
| REFIT | 1–21 | Strathclyde, CC BY 4.0 | 230V, ~8s |
| Plegma | 101–113 | doi:10.15129/3b01a6c6-2efd-424a-b8b8-5fe7fa445ded, CC BY 4.0 | Hy Lạp, 230V, 10s, đo theo ổ cắm |
| PRECON | 201–242 | web.lums.edu.pk/~eig (không ghi license) | Pakistan, 230V, 1 phút, đo theo mạch phòng |

`pipeline/convert.py` (`make convert`) đổi Plegma/PRECON sang đúng layout REFIT CLEAN (`CLEAN_House<id>.csv` +
`HOUSES_Labels`, W), nên builder REFIT đọc được nguyên trạng. File gốc đặt ở `NILMFormer/data/_raw/plegma/Clean_Dataset/`
(giải nén `PlegmaDataset_Clean.7z`) và `NILMFormer/data/_raw/precon/` (`PRECON.zip` + `Metadata.csv`).

| Thiết bị | Nhà train | Valid / test | Ghi chú |
|---|---|---|---|
| Kettle, Microwave, Dishwasher | paper (REFIT) | 9 / 2 | đúng protocol paper |
| `WashingMachine` | paper (REFIT) + Plegma | 103 / 101 | chỉ REFIT: F1 0.333 trên nhà 101 → + Plegma 0.468. Bản chỉ-REFIT giữ ở `artifacts/models/paper_refit/` |
| `Fridge` | REFIT 2, 5, 9, 12, 15, 19, 21 + Plegma | 103 / 101 | REFIT: chỉ nhà có 1 tủ lạnh chính (tủ thứ 2 sẽ nằm trong aggregate không nhãn). Trên nhà 101, cùng hậu xử lý: chỉ REFIT F1 0.875 / MR 0.461, + Plegma F1 0.801 / MR 0.525 |
| `TumbleDryer` | REFIT 1, 3, 5, 7, 8, 20, 21 | 13 / 15 | bỏ washer-dryer (9, 18) |
| `AC` | Plegma (11 nhà có AC) + PRECON 201, 208, 211, 214, 223, 232 | 103 / 101 | tổng mọi máy AC của nhà. PRECON: chỉ giữ nhà mà **mọi** AC đều được đo (`No_of_ACs` trong Metadata) |
| `WaterHeater` | Plegma (boiler, 12 nhà) | 103 / 101 | |

**Inventory:** model chỉ chạy cho thiết bị mà hộ có (`house_appliances`, từ `HOUSES_Labels`; với API: `NILM_APPS`).
Chạy model trên nhà không có thiết bị đó sinh báo động giả (máy sấy trên nhà 2 không có máy sấy: 120 kWh ảo).

**Hộ phục vụ backend: Plegma 101** — không model nào train trên nhà này; 427 ngày có số liệu, 3.6% số phút thiếu; có AC (46% điện năng),
bình nóng lạnh (20%), tủ lạnh, máy giặt: gần cơ cấu tiêu thụ hộ Việt Nam nhất. `make all-outputs` mặc định nhà 101
(tune ngưỡng trên 103). Đánh giá model paper trên REFIT: `make all-outputs TEST_HOUSE=2 VALID_HOUSE=9`.

Kết quả hộ 101 (chưa model nào thấy nhà này; ngưỡng + gain tune trên nhà valid 103):

| Thiết bị | F1 | SAE | Năng lượng thật / dự đoán |
|---|---|---|---|
| WaterHeater | 0.985 | 0.06 | 638 / 602 kWh |
| AC | 0.809 | 0.41 | 1446 / 858 kWh — model đoán biên độ thấp (~0.5×), `gain` bù một phần |
| Fridge | 0.801 | 0.42 | 417 / 241 kWh |
| WashingMachine | 0.468 | 0.16 | 39 / 33 kWh |

**Hậu xử lý** (`postprocess.yaml`): `tune` chọn ngưỡng theo F1 rồi tính `gain` = năng lượng thật / dự đoán trên nhà valid
(giới hạn 0.5–3) — model train bằng MSE kéo mức ON về 0. `tune_threshold: false` cho tải chạy chu kỳ (tủ lạnh): ngưỡng
F1 của nhà valid (tủ 131W) cắt mất tủ nhỏ hơn của nhà khác (81W) → F1 0.15; giữ ngưỡng cố định 20W → 0.80.

`pipeline.common.PipelineBuilder` bọc builder REFIT gốc (không sửa code vendored): đọc nhãn của từng nhà, chạy builder
gốc với nhãn đó rồi đổi tên cột về tên chung. Thêm thiết bị = thêm 1 mục vào `appliances.yaml` + `postprocess.yaml`.

```bash
make convert                                               # Plegma + PRECON -> layout REFIT (1 lần)
make train APPS="AC WaterHeater"                           # chọn thiết bị bất kỳ
make all-outputs                                           # hộ 101: các thiết bị hộ có
make eval-app APP=TumbleDryer APP_TEST=15 APP_VALID=13     # đánh giá trên cặp nhà riêng của thiết bị
```

## Báo cáo và paper (`paper/`)

`make paper-data` xuất mọi số liệu ra `paper/data/*.csv`, `make paper-figures` sinh hình PDF và bảng LaTeX,
`make paper` biên dịch `paper/build/main.pdf`. Báo cáo tiếng Việt cho nhóm: `paper/report.html`. Chi tiết: `paper/README.md`.

## Đẩy kết quả sang backend

```bash
curl -X POST "http://localhost:8001/api/v1/households/import?household=Plegma%20House%20101" \
     -F "file=@artifacts/outputs/house_101_disaggregation.csv"
```

Backend (`../backend`) rồi trả `GET /api/v1/households/{id}/disaggregation?start=&end=&bucket=` (chuỗi theo thiết bị +
tổng Wh + % tiêu thụ) và `POST /api/v1/disaggregate` (proxy sang service này, `NILM_SERVICE_URL` trong `backend/.env`).

## Lưu ý

- Múi giờ: REFIT timestamp được coi là UTC.
- `POST /disaggregate` cần timestamp + dữ liệu mẫu đều 1 phút; null = thiếu. Điểm cuối cửa sổ ít ngữ cảnh hơn điểm giữa —
  dùng `stride` nhỏ (chồng cửa sổ, lấy trung bình) để tốt hơn.
- Thí nghiệm gốc của repo vẫn chạy được: `docker compose run --rm experiment` (xem `.env`).
