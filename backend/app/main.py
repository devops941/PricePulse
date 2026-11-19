from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import get_settings
from app.core.logging import logger, setup_logging
from app.core.errors import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)
from app.api.v1.routers import health, auth, master, prices, uploads, index, markets, forecasts, anomalies, reports

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.core.database import get_db, create_all_indexes
        from app.core.bootstrap import ensure_master_catalog

        db = get_db()
        create_all_indexes(db)
        ensure_master_catalog()
    except Exception as e:
        logger.warning(f"Startup bootstrap notice: {e}")
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)

    app = FastAPI(
        title="PricePulse API",
        description="Retail Inflation Tracker & Essential Goods Basket Intelligence API",
        version="1.0.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom exception handlers for standard error contract
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Include routers under /api/v1
    app.include_router(health.router, prefix="/api/v1")
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(master.router, prefix="/api/v1")
    app.include_router(prices.router, prefix="/api/v1")
    app.include_router(uploads.router, prefix="/api/v1")
    app.include_router(index.router, prefix="/api/v1")
    app.include_router(markets.router, prefix="/api/v1")
    app.include_router(forecasts.router, prefix="/api/v1")
    app.include_router(anomalies.router, prefix="/api/v1")
    app.include_router(reports.router, prefix="/api/v1")

    # Top-level /dashboard aliases for frontend convenience
    from app.api.v1.routers.index import get_dashboard_summary, get_dashboard_movers
    app.add_api_route("/api/v1/dashboard/summary", get_dashboard_summary, methods=["GET"], tags=["Dashboard Analytics"])
    app.add_api_route("/api/v1/dashboard/movers", get_dashboard_movers, methods=["GET"], tags=["Dashboard Analytics"])

    @app.get("/")
    def root():
        return {
            "name": "PricePulse API",
            "version": "1.0.0",
            "docs": "/api/docs",
            "health": "/api/v1/health"
        }

    return app

app = create_app()
