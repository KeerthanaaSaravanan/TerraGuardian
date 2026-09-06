# TerraGuardian AI — Database & Spatial Storage

## Overview

TerraGuardian uses PostgreSQL 16 with the PostGIS 3.4 spatial extension as its primary operational datastore.

## Principles

1. **Spatial Data Integrity**: All geographic points, polygons, and tracks MUST use PostGIS types (`GEOMETRY(Point, 4326)`, `GEOMETRY(Polygon, 4326)`, etc.). Simple (latitude, longitude) floating point pairs are only used at boundary contracts (e.g., API schemas) and are immediately transformed into spatial types for storage and spatial querying.
2. **Versioned Migrations**: All schema modifications are tracked and versioned using Alembic (`services/api/alembic/`). No manual schema modifications in production or staging.
3. **Domain Entity Decoupling**: SQLAlchemy ORM models map relational and spatial tables. Pydantic v2 models in `services/api/app/domain/` represent the business domain and remain decoupled from ORM-specific details.
4. **Auditability**: Key incident events, status transitions, and authoritative human approvals must be written to append-only audit tables.

## Setup for Local Development

When running locally with Docker:
```bash
docker compose -f docker/docker-compose.yml up -d postgres
```

Database connection string format:
```
postgresql+asyncpg://<username>:<password>@<host>:<port>/<dbname>
```
