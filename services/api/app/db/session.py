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


from sqlalchemy import event
from sqlalchemy.engine import Engine

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enforce SQLite foreign key constraints on connection creation."""
    if "sqlite" in type(dbapi_connection).__module__:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()



# Global engine and sessionmaker
_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


from sqlalchemy.pool import StaticPool

def get_engine() -> AsyncEngine:
    """Get or create the global async database engine."""
    global _engine
    if _engine is None:
        db_url = settings.database_url

        # Normalize PostgreSQL URL for asyncpg if standard scheme was provided by cloud provider
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # SQLite compatibility flags if running in test/local dev mode
        connect_args = {}
        kwargs = {}
        if "sqlite" in db_url:
            connect_args = {"check_same_thread": False}
            if ":memory:" in db_url:
                kwargs["poolclass"] = StaticPool
        else:
            # PostgreSQL pool configuration
            import os
            if os.environ.get("VERCEL"):
                from sqlalchemy.pool import NullPool
                kwargs["poolclass"] = NullPool
            else:
                kwargs["pool_pre_ping"] = True
                kwargs["pool_recycle"] = 300

            # Handle libpq-style query params from cloud databases (Neon, Supabase, RDS).
            # asyncpg rejects libpq-only keywords (sslmode, channel_binding, ...), so strip
            # them from the URL and translate the TLS intent into an asyncpg ssl context.
            from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
            parts = urlsplit(db_url)
            query = parse_qsl(parts.query, keep_blank_values=True)
            libpq_only = {
                "sslmode", "ssl", "channel_binding", "sslrootcert", "sslcert",
                "sslkey", "gssencmode", "target_session_attrs", "options",
            }
            wants_tls = False
            kept = []
            for key, value in query:
                lowered = key.lower()
                if lowered in ("sslmode", "ssl"):
                    wants_tls = wants_tls or value.lower() not in ("disable", "false", "0", "allow")
                if lowered not in libpq_only:
                    kept.append((key, value))
            if len(kept) != len(query):
                db_url = urlunsplit(parts._replace(query=urlencode(kept)))
            if wants_tls:
                import ssl
                connect_args["ssl"] = ssl.create_default_context()

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
