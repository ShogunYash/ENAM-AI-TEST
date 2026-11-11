# Build from the REPO ROOT (the API reads docs/examples and data/ at runtime):
#   docker build -f backend/Dockerfile -t finn-api .
#   docker run --rm -p 8000:8000 --env-file .env finn-api
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy PYTHONUNBUFFERED=1

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
COPY docs/examples /app/docs/examples
COPY data /app/data

ENV PATH="/app/backend/.venv/bin:$PATH" PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
