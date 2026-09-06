"""TerraGuardian AI — FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, incidents


def create_app() -> FastAPI:
    """Application factory."""
    application = FastAPI(
        title="TerraGuardian AI API",
        description="Operational intelligence and coordination for landslide risk management.",
        version="0.0.1",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url="/redoc" if settings.environment == "development" else None,
    )

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    application.include_router(health.router)
    application.include_router(incidents.router, prefix="/api/v1")

    return application


app = create_app()
