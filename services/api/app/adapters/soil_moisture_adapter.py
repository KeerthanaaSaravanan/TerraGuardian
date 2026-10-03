"""Soil Moisture & Saturation Ingestion Adapter.

SOURCE REALITY STATUS: REPLAY / HISTORICAL REANALYSIS / SENSOR IN-SITU
Supports multi-depth FDR/TDR borehole probe telemetry, NASA SMAP / ESA SMOS
satellite soil moisture observations, and ERA5-Land volumetric soil moisture layers.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.adapters.base import (
    ExternalDataAdapter,
    IngestionFailureReason,
    SourceAccessStatus,
)
from app.adapters.canonical_schemas import CanonicalSoilMoistureObservation
from app.domain.enums import EvidenceInterpretation, EvidenceSource


NER_BOUNDS = {
    "min_lat": 21.0,
    "max_lat": 30.5,
    "min_lon": 87.5,
    "max_lon": 98.0,
}

MAX_PHYSICAL_VWC = 0.75  # Saturated peat/clay porosity rarely exceeds 0.75 m3/m3
MAX_MATRIC_SUCTION_KPA = 1500.0  # Wilting point threshold ~ 1500 kPa


class SoilMoistureAdapter(ExternalDataAdapter[CanonicalSoilMoistureObservation]):
    """Ingestion adapter for in-situ dielectric soil probes and satellite soil moisture."""

    adapter_name: str = "SoilMoistureAdapter"
    source_type: EvidenceSource = EvidenceSource.TERRAIN
    access_status: SourceAccessStatus = SourceAccessStatus.REPLAY

    def validate_raw(self, raw_payload: dict[str, Any]) -> tuple[bool, IngestionFailureReason, str]:
        """Validate schema structure, coordinate bounds, timestamps, and physical metric ranges."""
        # 1. Structural schema validation
        required_fields = ["sensor_id", "timestamp", "latitude", "longitude"]
        for field in required_fields:
            if field not in raw_payload:
                return False, IngestionFailureReason.SCHEMA_INVALID, f"Missing required payload field: '{field}'"

        if "volumetric_water_content_m3_m3" not in raw_payload and "soil_saturation_index" not in raw_payload:
            return (
                False,
                IngestionFailureReason.SCHEMA_INVALID,
                "Payload must provide either 'volumetric_water_content_m3_m3' or 'soil_saturation_index'",
            )

        # 2. Type validation
        try:
            lat = float(raw_payload["latitude"])
            lon = float(raw_payload["longitude"])
            vwc = float(raw_payload.get("volumetric_water_content_m3_m3", 0.35))
            sat = float(raw_payload.get("soil_saturation_index", vwc / 0.50))
        except (ValueError, TypeError) as exc:
            return False, IngestionFailureReason.SCHEMA_INVALID, f"Numeric parse error: {str(exc)}"

        # 3. Spatial Bounds Check (NER Bounding Box)
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

        # 5. Metric Physical Range Check
        if not (0.0 <= vwc <= MAX_PHYSICAL_VWC):
            return (
                False,
                IngestionFailureReason.QUALITY_REJECTED,
                f"Volumetric water content ({vwc} m3/m3) exceeds physical limits [0.0, {MAX_PHYSICAL_VWC}]",
            )

        if not (0.0 <= sat <= 1.0):
            return (
                False,
                IngestionFailureReason.QUALITY_REJECTED,
                f"Soil saturation index ({sat}) must be within [0.0, 1.0]",
            )

        if "matric_suction_kpa" in raw_payload and raw_payload["matric_suction_kpa"] is not None:
            suction = float(raw_payload["matric_suction_kpa"])
            if suction < 0.0 or suction > MAX_MATRIC_SUCTION_KPA:
                return (
                    False,
                    IngestionFailureReason.QUALITY_REJECTED,
                    f"Matric suction ({suction} kPa) outside physical range [0.0, {MAX_MATRIC_SUCTION_KPA}]",
                )

        return True, IngestionFailureReason.NONE, "Valid payload"

    def transform(
        self,
        raw_payload: dict[str, Any],
        provenance: Optional[SourceAccessStatus] = None,
    ) -> CanonicalSoilMoistureObservation:
        """Transform raw soil moisture payload into canonical observation schema."""
        raw_hash = self.compute_payload_hash(raw_payload)
        sensor_id = str(raw_payload["sensor_id"])
        lat = float(raw_payload["latitude"])
        lon = float(raw_payload["longitude"])
        vwc = float(raw_payload.get("volumetric_water_content_m3_m3", 0.35))
        sat = float(raw_payload.get("soil_saturation_index", min(1.0, vwc / 0.50)))
        sensor_type = str(raw_payload.get("sensor_type", "TDR_PROBE"))
        depth = str(raw_payload.get("depth_layer_cm", "0-10"))

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
        if freshness_sec > 86400 * 3:  # Stale if older than 3 days
            quality = "STALE"

        return CanonicalSoilMoistureObservation(
            source_id=f"SOIL-{sensor_type}-{sensor_id}",
            source_name=raw_payload.get("sensor_name", f"Soil Moisture Sensor {sensor_id}"),
            source_type=EvidenceSource.TERRAIN,
            provenance_class=prov,
            observed_at=obs_dt,
            ingested_at=now_utc,
            latitude=lat,
            longitude=lon,
            spatial_reference="EPSG:4326",
            spatial_resolution_meters=10.0 if "PROBE" in sensor_type else 1000.0,
            temporal_resolution_seconds=3600,
            raw_payload_hash=raw_hash,
            metric_name="soil_saturation_index",
            raw_value=sat,
            normalized_value=sat,
            unit="ratio_0_1",
            quality_status=quality,
            freshness_seconds=freshness_sec,
            verification_status=EvidenceInterpretation.UNVERIFIED,
            sensor_id=sensor_id,
            sensor_type=sensor_type,
            depth_layer_cm=depth,
            volumetric_water_content_m3_m3=vwc,
            soil_saturation_index=sat,
            matric_suction_kpa=float(raw_payload["matric_suction_kpa"]) if "matric_suction_kpa" in raw_payload and raw_payload["matric_suction_kpa"] is not None else None,
            soil_temperature_c=float(raw_payload["soil_temperature_c"]) if "soil_temperature_c" in raw_payload and raw_payload["soil_temperature_c"] is not None else None,
            rate_of_change_pct_hr=float(raw_payload["rate_of_change_pct_hr"]) if "rate_of_change_pct_hr" in raw_payload and raw_payload["rate_of_change_pct_hr"] is not None else None,
            data_quality_flag=quality,
            metadata_json=raw_payload.get("metadata", {}),
        )
