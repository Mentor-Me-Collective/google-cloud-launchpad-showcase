from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.plans import router as plans_router
from app.api.routes.sites import router as sites_router
from app.api.routes.species import router as species_router
from app.core.config import get_settings

settings = get_settings()
is_production = settings.app_env.lower() == "production"

# Explicitly ensure Vite dev server (http://localhost:5173), Firebase Hosting, and
# production Cloud Run domains (*.run.app + any configured CORS_ORIGINS) are permitted.
ALLOWED_ORIGINS = list(
    dict.fromkeys(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "https://canopycrew-sp-mvp.web.app",
            "https://canopycrew-sp-mvp.firebaseapp.com",
            *settings.cors_origins,
        ]
    )
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for the CanopyCrew urban greening platform.",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(sites_router, prefix=settings.api_v1_prefix)
app.include_router(species_router, prefix=settings.api_v1_prefix)
app.include_router(plans_router, prefix=settings.api_v1_prefix)
