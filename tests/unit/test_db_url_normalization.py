"""Regression: libpq-only URL params (Neon channel_binding, sslmode) must not reach asyncpg."""

import app.db.session as session
from app.config import settings


def _build(monkeypatch, url):
    monkeypatch.setattr(settings, "database_url", url)
    monkeypatch.setattr(session, "_engine", None)
    engine = session.get_engine()
    monkeypatch.setattr(session, "_engine", None)
    return engine


def test_channel_binding_and_sslmode_are_stripped(monkeypatch):
    engine = _build(
        monkeypatch,
        "postgresql://u:p@example.neon.tech/db?sslmode=require&channel_binding=require",
    )
    assert engine.url.drivername == "postgresql+asyncpg"
    assert "channel_binding" not in engine.url.query
    assert "sslmode" not in engine.url.query


def test_unrelated_params_preserved(monkeypatch):
    engine = _build(
        monkeypatch,
        "postgres://u:p@example.com/db?sslmode=require&application_name=tg",
    )
    assert dict(engine.url.query) == {"application_name": "tg"}
