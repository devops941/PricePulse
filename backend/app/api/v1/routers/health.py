from fastapi import APIRouter
from app.core.config import get_settings

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    settings = get_settings()
    return {
        "status": "healthy",
        "app": "PricePulse",
        "env": settings.APP_ENV,
        "database": "configured",
        "version": "1.0.0"
    }
