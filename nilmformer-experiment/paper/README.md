# Paper và báo cáo

Mọi con số, bảng và hình của bài báo đều sinh từ kết quả thật của pipeline. Train lại thì chỉ cần chạy lại 3 lệnh bên dưới, không phải sửa số bằng tay.

```
artifacts/ (models, predictions, outputs)
   │  make paper-data        scripts/export_results.py   (GPU ~3 phút: chạy lại ablation REFIT-only)
   ▼
data/*.csv + meta.json       nguồn số liệu duy nhất (đọc được bằng pandas, Excel, ...)
   │  make paper-figures     scripts/make_figures.py     (CPU, vài giây)
   ▼
figures/*.pdf|png            hình vector đúng khổ cột IEEE (3.5" / 7.16"), PNG để xem nhanh và làm slide
tables/*.tex                 bảng booktabs + numbers.tex (macro cho mọi số trong bài, ví dụ \ACFone)
   │  make paper             latexmk trên máy (hoặc upload thư mục paper/ lên Overleaf)
   ▼
build/main.pdf
```

| File | Nội dung |
|---|---|
| `report.html` | Báo cáo tiếng Việt cho nhóm (mở bằng trình duyệt). Bản online: https://claude.ai/artifact/NrgkZepRmhUVzvKKGBXqKn |
| `main.tex`, `refs.bib` | Bản thảo bài báo (tiếng Anh, IEEE conference). Tác giả và đơn vị đang để `[Authors]`. Cần kiểm tra lại `refs.bib` trước khi nộp |
| `data/training.csv`, `training_curves.csv` | Nhà train/valid/test, số epoch, epoch tốt nhất, loss, thời gian, đường loss từng epoch |
| `data/test_metrics.csv` | Mọi model trên nhà test: MAE và MR thô (chỉ số của paper), F1/precision/recall/SAE/NDE sau hậu xử lý |
| `data/paper_comparison.csv` | So sánh với Table 2 của paper (REFIT, 1 phút, w=128) |
| `data/ablations.csv` | Dữ liệu train (REFIT vs REFIT+Plegma), ngưỡng tủ lạnh, gain, inventory |
| `data/house101_*.csv` | Hộ Plegma 101: cơ cấu, theo tháng, theo ngày, F1 theo quý, một ngày mẫu (10 phút) |
| `data/meta.json` | Commit, số tham số, cấu hình hậu xử lý, hồ sơ hộ 101 (gồm phân tích các ngày tủ lạnh kéo điện liên tục) |

Thêm một hình: viết một hàm `fig_*` trong `scripts/make_figures.py`, đọc từ `data/`. Thêm một số trích trong bài: thêm vào `numbers()` rồi dùng `\TenMacro{}` trong `main.tex`.

Lưu ý: script không bao giờ ghi đè `artifacts/models|predictions|outputs`. Ablation REFIT-only chỉ ghi vào `artifacts/_ablation/`.
