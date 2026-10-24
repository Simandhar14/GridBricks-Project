"""Health check router."""

from backend.app.config import settings
from backend.app.schemas import HealthResponse
from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/api/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Service health check."""
    return HealthResponse(status="ok", version=settings.app_version)
