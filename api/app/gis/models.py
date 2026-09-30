"""Authoritative Geospatial ORM Models & Dataset Contracts.

Tables:
- `admin_boundaries`: Authoritative administrative polygons (State, District, Sub-Division).
- `road_segments`: Linear transport infrastructure (National Highways, Border Roads).
- `settlements`: Village centroids and census settlement polygons.
- `critical_infrastructure`: Strategic lifeline facilities (Hospitals, Bridges, Towers).
- `quarantined_observations`: Persistent quarantine store resolving Phase 3 Gap COND-01.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from pydantic import BaseModel, Field
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class AdminBoundaryModel(Base):
    """Authoritative administrative boundary representation."""

    __tablename__ = "admin_boundaries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    boundary_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    admin_level: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # STATE | DISTRICT | SUBDIVISION
    state_code: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    census_code: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Geometry storage (WKT polygon in 4326; in PostGIS maps to geometry(MultiPolygon, 4326))
    geometry_wkt: Mapped[str] = mapped_column(Text, nullable=False)
    min_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    max_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    min_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    max_longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Provenance & Lineage
    source: Mapped[str] = mapped_column(String(100), default="Survey of India / NIC", nullable=False)
    provenance_class: Mapped[str] = mapped_column(String(64), default="GEOGRAPHICALLY_GROUNDED_FIXTURE", nullable=False)
    is_authoritative: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)



class RoadSegmentModel(Base):
    """Linear transport infrastructure corridor segment."""

    __tablename__ = "road_segments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    road_code: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # e.g. "NH-10", "NH-13"
    segment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    classification: Mapped[str] = mapped_column(String(64), default="NATIONAL_HIGHWAY", nullable=False)
    managing_agency: Mapped[str] = mapped_column(String(100), default="BRO / NHIDCL", nullable=False)

    chainage_start_km: Mapped[float] = mapped_column(Float, nullable=False)
    chainage_end_km: Mapped[float] = mapped_column(Float, nullable=False)

    # Geometry storage (WKT LineString / MultiLineString in 4326)
    geometry_wkt: Mapped[str] = mapped_column(Text, nullable=False)
    start_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    start_longitude: Mapped[float] = mapped_column(Float, nullable=False)
    end_latitude: Mapped[float] = mapped_column(Float, nullable=False)
    end_longitude: Mapped[float] = mapped_column(Float, nullable=False)

    criticality_tier: Mapped[str] = mapped_column(String(32), default="SOLE_LIFELINE", nullable=False)
    provenance_class: Mapped[str] = mapped_column(String(64), default="GEOGRAPHICALLY_GROUNDED_FIXTURE", nullable=False)


class SettlementModel(Base):
    """Village or urban settlement exposure entity."""

    __tablename__ = "settlements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    settlement_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    district: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    state: Mapped[str] = mapped_column(String(100), index=True, nullable=False)

    population: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    household_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Centroid coordinate
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    geometry_wkt: Mapped[str | None] = mapped_column(Text, nullable=True)

    provenance_class: Mapped[str] = mapped_column(String(64), default="GEOGRAPHICALLY_GROUNDED_FIXTURE", nullable=False)


class CriticalInfrastructureModel(Base):
    """Point critical infrastructure asset."""

    __tablename__ = "critical_infrastructure"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    facility_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    facility_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)  # HOSPITAL | BRIDGE | TELECOM | POWER
    
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    state: Mapped[str] = mapped_column(String(100), nullable=False)

    provenance_class: Mapped[str] = mapped_column(String(64), default="GEOGRAPHICALLY_GROUNDED_FIXTURE", nullable=False)



class QuarantineRecordModel(Base):
    """Persistent storage for quarantined external observations (Resolves Phase 3 Gap COND-01)."""

    __tablename__ = "quarantined_observations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    source_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    adapter_name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    failure_reason: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    raw_payload_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    details: Mapped[str] = mapped_column(Text, nullable=False)
    raw_payload_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    provenance_class: Mapped[str] = mapped_column(String(32), default="REPLAY", nullable=False)

    quarantined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    review_status: Mapped[str] = mapped_column(String(32), default="PENDING_REVIEW", index=True, nullable=False)
    reviewed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


# ── Pydantic Contracts for Terrain / DEM Lineage ──

class DEMDatasetContract(BaseModel):
    """Metadata contract governing digital elevation models."""
    dataset_name: str
    source_agency: str  # ISRO Bhuvan / JAXA / USGS
    acquisition_year: int
    spatial_resolution_meters: float = Field(gt=0.0)
    horizontal_crs: str = "EPSG:4326"
    vertical_datum: str = "EGM96 / WGS 84 Ellipsoid"
    coverage_bounding_box: dict[str, float]
    nodata_value: float = -9999.0
    processing_version: str = "v1.0"
    provenance_class: str = "REAL_HISTORICAL"


class TerrainLineageContract(BaseModel):
    """Lineage trace connecting derived slope/aspect features back to DEM source."""
    feature_id: str
    dem_source_dataset: str
    derived_slope_degrees: float = Field(ge=0.0, le=90.0)
    derived_aspect_degrees: float = Field(ge=0.0, le=360.0)
    elevation_meters_msl: float
    derivation_algorithm: str = "Horn (1981) 3x3 Finite Difference"
    threshold_classification: str = "POLICY_RULE"  # POLICY_RULE | DEMO_RULE | VALIDATED_THRESHOLD
