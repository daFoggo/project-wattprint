# project-wattprint

Mỗi thư mục con là một project độc lập, có `docker-compose.yml` và `.env` riêng.

| Folder | Mô tả | Chạy |
|---|---|---|
| `backend/` | FastAPI + PostgreSQL/TimescaleDB | `cd backend && docker compose up -d --build` → http://localhost:8001/docs |
| `nilmformer-experiment/` | Thực nghiệm NILMFormer (GPU) trên REFIT | xem `nilmformer-experiment/README.md` |
