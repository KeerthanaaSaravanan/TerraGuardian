"""Database engine and session management.

Supports asynchronous SQLAlchemy 2.0 engines for PostgreSQL/PostGIS in production
and in-memory SQLite (via aiosqlite) for automated testing.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy ORM models."""
    pass


# Global engine and sessionmaker
_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


from sqlalchemy.pool import StaticPool

def get_engine() -> AsyncEngine:
    """Get or create the global async database engine."""
    global _engine
    if _engine is None:
        db_url = settings.database_url
        # SQLite compatibility flags if running in test mode
        connect_args = {}
        kwargs = {}
        if "sqlite" in db_url:
            connect_args = {"check_same_thread": False}
            if ":memory:" in db_url:
                kwargs["poolclass"] = StaticPool
        _engine = create_async_engine(
            db_url,
            echo=settings.log_level.upper() == "DEBUG",
            connect_args=connect_args,
            **kwargs,
        )
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Get or create the global async session factory."""
    global _async_session_factory
    if _async_session_factory is None:
        _async_session_factory = async_sessionmaker(
            bind=get_engine(),
            autocommit=False,
            autoflush=False,
            expire_on_commit=False,
            class_=AsyncSession,
        )
    return _async_session_factory


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db(engine: AsyncEngine | None = None) -> None:
    """Create all tables in the target database."""
    target_engine = engine or get_engine()
    async with target_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def reset_db_state() -> None:
    """Reset global engine and sessionmaker state (useful for tests)."""
    global _engine, _async_session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _async_session_factory = None
