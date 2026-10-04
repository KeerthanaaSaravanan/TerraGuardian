import pytest

from app.config import Settings


def test_vercel_production_environment_enforces_persistent_database(monkeypatch):
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("TERRAGUARDIAN_ENV", raising=False)
    monkeypatch.setenv("VERCEL_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "sqlite+aiosqlite:///./terraguardian.db")

    with pytest.raises(RuntimeError, match="Production requires DATABASE_URL"):
        Settings(_env_file=None)
