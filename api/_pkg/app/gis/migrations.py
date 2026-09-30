"""PostgreSQL & PostGIS Migration DDL Specifications and Spatial Index Scripts."""

from __future__ import annotations

# Authoritative PostGIS Extension Activation
POSTGIS_EXTENSION_DDL = """
-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
"""

# PostGIS Native Tables & Spatial Columns DDL
POSTGIS_TABLES_DDL = """
-- 2. Administrative Boundaries with MultiPolygon Geometry
CREATE TABLE IF NOT EXISTS admin_boundaries (
    id UUID PRIMARY KEY,
    boundary_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    admin_level VARCHAR(32) NOT NULL,
    state_code VARCHAR(10) NOT NULL,
    census_code VARCHAR(32),
    geometry_wkt TEXT NOT NULL,
    geom geometry(MultiPolygon, 4326),
    min_latitude FLOAT NOT NULL,
    max_latitude FLOAT NOT NULL,
    min_longitude FLOAT NOT NULL,
    max_longitude FLOAT NOT NULL,
    source VARCHAR(100) NOT NULL,
    provenance_class VARCHAR(32) NOT NULL,
    is_authoritative BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Linear Highway Transport Corridors
CREATE TABLE IF NOT EXISTS road_segments (
    id UUID PRIMARY KEY,
    road_code VARCHAR(64) NOT NULL,
    segment_name VARCHAR(255) NOT NULL,
    classification VARCHAR(64) NOT NULL,
    managing_agency VARCHAR(100) NOT NULL,
    chainage_start_km FLOAT NOT NULL,
    chainage_end_km FLOAT NOT NULL,
    geometry_wkt TEXT NOT NULL,
    geom geometry(MultiLineString, 4326),
    start_latitude FLOAT NOT NULL,
    start_longitude FLOAT NOT NULL,
    end_latitude FLOAT NOT NULL,
    end_longitude FLOAT NOT NULL,
    criticality_tier VARCHAR(32) NOT NULL,
    provenance_class VARCHAR(32) NOT NULL
);

-- 4. Settlements & Revenue Village Centroids
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY,
    settlement_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    population INTEGER DEFAULT 0,
    household_count INTEGER DEFAULT 0,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    geom geometry(Point, 4326),
    geometry_wkt TEXT,
    provenance_class VARCHAR(32) NOT NULL
);

-- 5. Critical Infrastructure Lifeline Facilities
CREATE TABLE IF NOT EXISTS critical_infrastructure (
    id UUID PRIMARY KEY,
    facility_code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    facility_type VARCHAR(64) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    geom geometry(Point, 4326),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    provenance_class VARCHAR(32) NOT NULL
);

-- 6. Persistent Quarantined Observations (Phase 3 Gap Resolution)
CREATE TABLE IF NOT EXISTS quarantined_observations (
    id UUID PRIMARY KEY,
    source_id VARCHAR(100) NOT NULL,
    adapter_name VARCHAR(100) NOT NULL,
    failure_reason VARCHAR(64) NOT NULL,
    raw_payload_hash VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    raw_payload_json JSONB NOT NULL,
    provenance_class VARCHAR(32) NOT NULL,
    quarantined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    review_status VARCHAR(32) DEFAULT 'PENDING_REVIEW',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP WITH TIME ZONE
);
"""

# Spatial GIST Indexes
POSTGIS_INDEXES_DDL = """
-- 7. High-Performance GIST Spatial Indexes
CREATE INDEX IF NOT EXISTS idx_admin_boundaries_geom ON admin_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_road_segments_geom ON road_segments USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_settlements_geom ON settlements USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_critical_infra_geom ON critical_infrastructure USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_quarantine_hash ON quarantined_observations (raw_payload_hash);
CREATE INDEX IF NOT EXISTS idx_quarantine_status ON quarantined_observations (review_status);
"""

# Rollback Script
POSTGIS_ROLLBACK_DDL = """
-- Rollback DDL
DROP TABLE IF EXISTS quarantined_observations CASCADE;
DROP TABLE IF EXISTS critical_infrastructure CASCADE;
DROP TABLE IF EXISTS settlements CASCADE;
DROP TABLE IF EXISTS road_segments CASCADE;
DROP TABLE IF EXISTS admin_boundaries CASCADE;
"""
