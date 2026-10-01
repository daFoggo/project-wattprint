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
make validate      # smoke test cả chuỗi trong vài phút — phải 12/12 PASS trước khi train dài
make train         # 4 model song song, 50 epoch + early stopping; log: artifacts/train_<App>.log
make all-outputs   # predict (nhà 2 & 9) -> tune ngưỡng trên nhà valid -> postprocess nhà test
make serve         # inference API :8002
```

`make validate` kiểm tra: GPU, đủ file dữ liệu, cấu hình = paper, số tham số ≈ 0.385M (paper), đặc trưng thời gian,
train 1 epoch trên tập con, `--resume`, predict, postprocess (tổng ≤ aggregate), độ trễ suy luận, và API `/disaggregate`.

## Đẩy kết quả sang backend

```bash
curl -X POST "http://localhost:8001/api/v1/households/import?household=REFIT%20House%202" \
     -F "file=@artifacts/outputs/house_2_disaggregation.csv"
```

Backend (`../backend`) rồi trả `GET /api/v1/households/{id}/disaggregation?start=&end=&bucket=` (chuỗi theo thiết bị +
tổng Wh + % tiêu thụ) và `POST /api/v1/disaggregate` (proxy sang service này, `NILM_SERVICE_URL` trong `backend/.env`).

## Lưu ý

- Múi giờ: REFIT timestamp được coi là UTC.
- `POST /disaggregate` cần timestamp + dữ liệu mẫu đều 1 phút; null = thiếu. Điểm cuối cửa sổ ít ngữ cảnh hơn điểm giữa —
  dùng `stride` nhỏ (chồng cửa sổ, lấy trung bình) để tốt hơn.
- Thí nghiệm gốc của repo vẫn chạy được: `docker compose run --rm experiment` (xem `.env`).
