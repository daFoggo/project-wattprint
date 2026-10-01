FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_LINK_MODE=copy PYTHONUNBUFFERED=1 PATH="/app/.venv/bin:$PATH"
WORKDIR /app

COPY NILMFormer/pyproject.toml NILMFormer/uv.lock ./
RUN uv sync --frozen --no-install-project && uv pip install py7zr requests

COPY NILMFormer/ .
COPY tools/ ./tools/
# data/ and result/ are bind-mounted by docker-compose
CMD ["python", "-m", "scripts.run_one_expe"]
