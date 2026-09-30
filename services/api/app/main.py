from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db
from app.routers import alerts, auth, copilot, gis, health, incidents, ingestion, system
import app.db.models  # noqa: F401



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ensure database schema is created and baseline layers exist on startup."""
    await init_db()
    from app.db.session import get_session_factory
    from app.routers.gis import seed_baseline_gis_data
    from app.services.seed_service import SeedService
    from app.services.auth_service import AuthService
    factory = get_session_factory()
    
    # 1. Deterministic demo users seeding
    async with factory() as session:
        try:
            auth_service = AuthService(session)
            await auth_service.seed_demo_users()
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"[STARTUP] Auth seeding error: {e}")

    # 2. Baseline GIS data & incident scenario seeding
    async with factory() as session:
        try:
            await seed_baseline_gis_data(session)
            seed_service = SeedService(session)
            await seed_service.seed_tg_2048(force_reset=False)
            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"[STARTUP] GIS/scenario seeding error: {e}")
    yield


def create_app() -> FastAPI:
    """Application factory."""
    application = FastAPI(
        title="TerraGuardian AI API",
        description="Operational intelligence and coordination for landslide risk management.",
        version="0.0.1",
        docs_url="/docs" if settings.environment == "development" else None,
        redoc_url="/redoc" if settings.environment == "development" else None,
        lifespan=lifespan,
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
    application.include_router(health.router, prefix="/api/v1")
    application.include_router(auth.router, prefix="/api/v1")
    application.include_router(incidents.router, prefix="/api/v1")
    application.include_router(alerts.router)
    application.include_router(ingestion.router, prefix="/api/v1")
    application.include_router(gis.router, prefix="/api/v1")
    application.include_router(copilot.router, prefix="/api/v1")
    application.include_router(system.router, prefix="/api/v1")

    return application



app = create_app()
