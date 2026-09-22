"""TerraGuardian test configuration and fixtures."""

import os
import sys
from pathlib import Path
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Add services/api and workspace root to sys.path
root_path = Path(__file__).resolve().parent.parent
api_path = root_path / "services" / "api"
if str(api_path) not in sys.path:
    sys.path.insert(0, str(api_path))
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

# Set test environment
os.environ["TERRAGUARDIAN_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.db.models import Base
from app.db.session import get_db_session
from app.main import create_app


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    """Create a fresh isolated in-memory SQLite database engine for each test."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session bound to the isolated in-memory test database."""
    session_factory = async_sessionmaker(
        bind=db_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def test_client(db_engine):
    """Create a FastAPI test client with the database session overridden."""
    from httpx import ASGITransport, AsyncClient

    session_factory = async_sessionmaker(
        bind=db_engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
        class_=AsyncSession,
    )

    async def override_get_db_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app = create_app()
    app.dependency_overrides[get_db_session] = override_get_db_session

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client
