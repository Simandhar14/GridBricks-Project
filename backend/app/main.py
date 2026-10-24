"""FastAPI application factory for GridBricks Wind Procurement Dashboard.

Configures lifespan events, CORS, API routers, and static file serving for single-container deployment.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from backend.app.config import settings
from backend.app.data_loader import data_loader
from backend.app.routers import accuracy, forecast, health, meta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager: loads Parquet snapshots into memory on startup."""
    logger.info("Initializing GridBricks backend service (%s)...", settings.app_env)
    data_loader.load()
    yield
    logger.info("GridBricks backend shutting down.")


app = FastAPI(
    title="GridBricks — Wind Procurement API",
    description="UK Day-Ahead Market Wind Generation & Forecast Analytics (January 2026)",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ───────────────────────────────────────────────────────────
if settings.app_env == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins or ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# ── Include API Routers ───────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(meta.router)
app.include_router(forecast.router)
app.include_router(accuracy.router)

# ── Serve Built Frontend (Production / Docker single container) ───────────────
frontend_dist = Path("frontend/dist")
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    logger.info("Mounting frontend static files from %s", frontend_dist)
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> FileResponse:
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")
