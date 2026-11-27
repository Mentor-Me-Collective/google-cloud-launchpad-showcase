FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY data data
COPY web web
ENV FIXTURES_DIR=/srv/data/fixtures
WORKDIR /srv/backend
# Cloud Run supplies $PORT. Secrets (NVIDIA_API_KEY, INGEST_TOKEN) come from Secret Manager, never the image.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
