"""
Standalone LearnLite AI content service (for Cloud Run, or local testing).

    uvicorn main:app --reload --port 8081

Docs at http://localhost:8081/docs
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_content_api import build_router, install_error_handlers

app = FastAPI(title="LearnLite AI Content API", version="0.1.0")
install_error_handlers(app)
app.include_router(build_router(), prefix="/api/v1")

origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
if origins:
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-content", "version": app.version}
