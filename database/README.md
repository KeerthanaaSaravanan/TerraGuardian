# Database and Persistence

## What

The API uses SQLAlchemy async sessions for incidents, evidence, actions, citizen reports and audit events. Persistence is configured through `DATABASE_URL` in `services/api/app/config.py`.

## Responsibility

`services/api/app/db/models.py` defines ORM tables; `services/api/app/db/session.py` creates the engine and sessions and initializes tables. The spatial API also serves GeoJSON and performs application-level spatial calculations.

## Interfaces

- Local tests and the default local configuration use SQLite with `aiosqlite`.
- A PostgreSQL URL can be normalized for `asyncpg`.
- Current Production configuration validation requires PostgreSQL, a non-default secret and S3-compatible storage settings.

## Current implementation

PostgreSQL/PostGIS is not established as the active datastore by this repository's configuration or the verified Preview. The Preview uses SQLite at Vercel `/tmp`; its state is ephemeral and may differ across serverless function instances. An ORM dependency or spatial model does not prove that PostGIS is active. Audit events are relational application records, not cryptographically immutable storage.

The current session module calls SQLAlchemy `metadata.create_all`. Do not assume a versioned Alembic migration workflow is configured unless an actual migration directory and command are added and verified.

## Verification

Run backend tests with `python -m pytest tests/unit -q`. These tests use test/local database fixtures; they do not certify a managed database or Production persistence. The Preview `/api/v1/health` returned database `ok` with `environment=staging` on 2026-10-04.

## Boundaries and local development

Use SQLite for local tests and demos only. Do not use `/tmp` SQLite or local filesystem uploads as durable remote storage. For a local PostgreSQL container, inspect `docker/docker-compose.yml`; validate database provisioning and migrations before claiming PostgreSQL/PostGIS operation. Set real secrets through the deployment provider, never from this documentation.

## Local development

The default local API database is SQLite. Install backend dependencies with `python -m pip install -r services/api/requirements.txt`, then start the API from the repository root with `python -m uvicorn app.main:app --app-dir services/api --host 127.0.0.1 --port 8000 --reload`. Docker PostgreSQL is an optional local setup and is not required for the unit tests.
