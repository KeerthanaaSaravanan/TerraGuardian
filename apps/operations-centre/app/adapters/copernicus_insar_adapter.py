"""Copernicus Sentinel-1 InSAR Surface Deformation Ingestion Adapter.

SOURCE REALITY STATUS: REPLAY / SYNTHETIC
Live operational processing of Copernicus Sentinel-1 Single Look Complex (SLC) SAR
interferograms requires high-throughput interferometric processing clusters (InSAR processors).
This adapter provides the authoritative ingestion boundary, phase coherence validation,
and LOS velocity normalization for pre-processed SAR products or replay datasets.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.adapters.base import (
    ExternalDataAdapter,
    IngestionFailureReason,
    SourceAccessStatus,
)
from app.adapters.canonical_schemas import CanonicalInSARDeformation
from app.domain.enums import EvidenceInterpretation, EvidenceSource


NER_BOUNDS = {
    "min_lat": 21.0,
    "max_lat": 30.5,
    "min_lon": 87.5,
    "max_lon": 98.0,
}

MAX_PHYSICAL_LOS_VELOCITY_MM_YR = 600.0  # Velocities exceeding 600 mm/year typically reflect phase unwrapping artifacts in steep topography


class CopernicusInSARAdapter(ExternalDataAdapter[CanonicalInSARDeformation]):
    """Ingestion adapter for Sentinel-1 InSAR surface deformation velocity and coherence."""

    adapter_name: str = "CopernicusInSARAdapter"
    source_type: EvidenceSource = EvidenceSource.SATELLITE
    access_status: SourceAccessStatus = SourceAccessStatus.REPLAY

    def validate_raw(self, raw_payload: dict[str, Any]) -> tuple[bool, IngestionFailureReason, str]:
        """Validate structure, coordinate limits, coherence, and phase velocity ranges."""
        # 1. Structural schema validation
        required_fields = ["timestamp", "latitude", "longitude", "coherence", "line_of_sight_velocity_mm_yr"]
        for field in required_fields:
            if field not in raw_payload:
                return False, IngestionFailureReason.SCHEMA_INVALID, f"Missing required payload field: '{field}'"

        # 2. Type validation
        try:
            lat = float(raw_payload["latitude"])
            lon = float(raw_payload["longitude"])
            coherence = float(raw_payload["coherence"])
            velocity = float(raw_payload["line_of_sight_velocity_mm_yr"])
        except (ValueError, TypeError) as exc:
            return False, IngestionFailureReason.SCHEMA_INVALID, f"Numeric parse error: {str(exc)}"

        # 3. Spatial Bounds Check
        if not (NER_BOUNDS["min_lat"] <= lat <= NER_BOUNDS["max_lat"] and NER_BOUNDS["min_lon"] <= lon <= NER_BOUNDS["max_lon"]):
            return (
                False,
                IngestionFailureReason.SPATIAL_OUT_OF_BOUNDS,
                f"Coordinates ({lat}, {lon}) outside valid North Eastern Region bounding box",
            )

        # 4. Temporal Validation (Future timestamp check)
        try:
            ts_str = str(raw_payload["timestamp"])
            obs_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if obs_dt.tzinfo is None:
                obs_dt = obs_dt.replace(tzinfo=timezone.utc)
        except Exception as exc:
            return False, IngestionFailureReason.SCHEMA_INVALID, f"Invalid ISO 8601 timestamp: {str(exc)}"

        now_utc = datetime.now(timezone.utc)
        if obs_dt > now_utc + timedelta(minutes=5):
            return (
                False,
                IngestionFailureReason.TEMPORAL_OUT_OF_BOUNDS,
                f"Future observation timestamp ({obs_dt.isoformat()}) exceeds server time",
            )

        # 5. Coherence Check (Physical bounds: 0.0 to 1.0)
        if not (0.0 <= coherence <= 1.0):
            return (
                False,
                IngestionFailureReason.QUALITY_REJECTED,
                f"Interferometric coherence ({coherence}) must be between 0.0 and 1.0",
            )

        # 6. LOS Velocity Physical Range Check
        if abs(velocity) > MAX_PHYSICAL_LOS_VELOCITY_MM_YR:
            return (
                False,
                IngestionFailureReason.QUARANTINED,
                f"Line-of-sight velocity ({velocity} mm/yr) exceeds physical threshold ({MAX_PHYSICAL_LOS_VELOCITY_MM_YR} mm/yr); suspected phase unwrapping error or steep layover artifact",
            )

        return True, IngestionFailureReason.NONE, "Valid payload"

    def transform(
        self,
        raw_payload: dict[str, Any],
        provenance: Optional[SourceAccessStatus] = None,
    ) -> CanonicalInSARDeformation:
        """Transform raw InSAR observation into canonical SAR deformation schema."""
        raw_hash = self.compute_payload_hash(raw_payload)
        lat = float(raw_payload["latitude"])
        lon = float(raw_payload["longitude"])
        coherence = float(raw_payload["coherence"])
        velocity = float(raw_payload["line_of_sight_velocity_mm_yr"])
        mission = str(raw_payload.get("satellite_mission", "Sentinel-1"))
        orbit = str(raw_payload.get("orbit_direction", "DESCENDING"))
        baseline_days = int(raw_payload.get("baseline_days", 12))
        vel_err = float(raw_payload.get("velocity_standard_error_mm_yr", 2.5))

        ts_str = str(raw_payload["timestamp"])
        obs_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if obs_dt.tzinfo is None:
            obs_dt = obs_dt.replace(tzinfo=timezone.utc)

        now_utc = datetime.now(timezone.utc)
        freshness_sec = max(0, int((now_utc - obs_dt).total_seconds()))

        prov = provenance or self.access_status
        if prov == SourceAccessStatus.LIVE and self.access_status != SourceAccessStatus.LIVE:
            prov = self.access_status

        quality = "VALID"
        if coherence < 0.35:
            quality = "LOW_COHERENCE_DEGRADED"
        if freshness_sec > 86400 * 30:  # Older than 30 days
            quality = "STALE"

        return CanonicalInSARDeformation(
            source_id=f"SAR-{mission}-{orbit}-{lat:.3f}-{lon:.3f}",
            source_name=f"{mission} InSAR ({orbit})",
            source_type=EvidenceSource.SATELLITE,
            provenance_class=prov,
            observed_at=obs_dt,
            ingested_at=now_utc,
            latitude=lat,
            longitude=lon,
            spatial_reference="EPSG:4326",
            spatial_resolution_meters=14.0,  # 14m ground resolution for 10x10 Sentinel-1 multilook
            temporal_resolution_seconds=baseline_days * 86400,
            raw_payload_hash=raw_hash,
            metric_name="los_surface_velocity_mm_yr",
            raw_value=velocity,
            normalized_value=velocity,
            unit="mm/year",
            quality_status=quality,
            freshness_seconds=freshness_sec,
            verification_status=EvidenceInterpretation.UNVERIFIED,
            satellite_mission=mission,
            orbit_direction=orbit,
            relative_orbit=raw_payload.get("relative_orbit"),
            coherence=coherence,
            line_of_sight_velocity_mm_yr=velocity,
            velocity_standard_error_mm_yr=vel_err,
            reference_point_id=raw_payload.get("reference_point_id"),
            baseline_days=baseline_days,
            metadata_json=raw_payload.get("metadata", {}),
        )
