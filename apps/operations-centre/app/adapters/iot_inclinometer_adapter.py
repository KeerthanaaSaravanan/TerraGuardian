"""In-Situ Borehole Inclinometer & Geotechnical Sensor Ingestion Adapter.

SOURCE REALITY STATUS: REPLAY / SYNTHETIC
Live integration with physical borehole IoT arrays (CSIR-CRRI / MoRTH slope monitoring sites)
requires dedicated telemetry gateway access and MQTT broker provisioning.
This adapter establishes the standard ingestion contract, kinematic validation,
and physical fault detection (tilt thresholds, sensor toppling, battery drop).
"""

from __future__ import annotations

import math
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.adapters.base import (
    ExternalDataAdapter,
    IngestionFailureReason,
    SourceAccessStatus,
)
from app.adapters.canonical_schemas import CanonicalInclinometerTelemetry
from app.domain.enums import EvidenceInterpretation, EvidenceSource


NER_BOUNDS = {
    "min_lat": 21.0,
    "max_lat": 30.5,
    "min_lon": 87.5,
    "max_lon": 98.0,
}

MAX_PHYSICAL_TILT_DEG = 45.0  # Above 45 degrees indicates sensor shear failure or physical displacement from borehole casing


class IoTInclinometerAdapter(ExternalDataAdapter[CanonicalInclinometerTelemetry]):
    """Ingestion adapter for IoT in-situ borehole inclinometers and tiltmeters."""

    adapter_name: str = "IoTInclinometerAdapter"
    source_type: EvidenceSource = EvidenceSource.SENSOR
    access_status: SourceAccessStatus = SourceAccessStatus.REPLAY

    def validate_raw(self, raw_payload: dict[str, Any]) -> tuple[bool, IngestionFailureReason, str]:
        """Validate structure, coordinate limits, tilt ranges, and sensor integrity."""
        # 1. Structural schema validation
        required_fields = ["sensor_id", "timestamp", "latitude", "longitude", "depth_meters", "tilt_axis_x_deg", "tilt_axis_y_deg"]
        for field in required_fields:
            if field not in raw_payload:
                return False, IngestionFailureReason.SCHEMA_INVALID, f"Missing required payload field: '{field}'"

        # 2. Type validation
        try:
            lat = float(raw_payload["latitude"])
            lon = float(raw_payload["longitude"])
            depth = float(raw_payload["depth_meters"])
            tilt_x = float(raw_payload["tilt_axis_x_deg"])
            tilt_y = float(raw_payload["tilt_axis_y_deg"])
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

        # 5. Kinematic / Physical Range Check
        total_tilt = math.sqrt(tilt_x**2 + tilt_y**2)
        if total_tilt > MAX_PHYSICAL_TILT_DEG:
            return (
                False,
                IngestionFailureReason.QUARANTINED,
                f"Total inclination angle ({total_tilt:.1f} deg) exceeds physical limit ({MAX_PHYSICAL_TILT_DEG} deg); sensor may be dislodged or detached",
            )

        if depth < 0.0 or depth > 200.0:
            return False, IngestionFailureReason.QUALITY_REJECTED, f"Borehole depth ({depth} m) out of physical range (0-200m)"

        return True, IngestionFailureReason.NONE, "Valid payload"

    def transform(
        self,
        raw_payload: dict[str, Any],
        provenance: Optional[SourceAccessStatus] = None,
    ) -> CanonicalInclinometerTelemetry:
        """Transform raw IoT sensor payload into canonical inclinometer schema."""
        raw_hash = self.compute_payload_hash(raw_payload)
        sensor_id = str(raw_payload["sensor_id"])
        lat = float(raw_payload["latitude"])
        lon = float(raw_payload["longitude"])
        depth = float(raw_payload["depth_meters"])
        tilt_x = float(raw_payload["tilt_axis_x_deg"])
        tilt_y = float(raw_payload["tilt_axis_y_deg"])
        disp_rate = float(raw_payload.get("displacement_rate_mm_day", 0.0))
        cum_disp = float(raw_payload.get("cumulative_displacement_mm", 0.0))
        battery = float(raw_payload["battery_voltage_v"]) if "battery_voltage_v" in raw_payload else None

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
        if battery is not None and battery < 3.2:
            quality = "BATTERY_DEGRADED"
        if freshness_sec > 43200:  # Older than 12 hours
            quality = "STALE"

        total_tilt = math.sqrt(tilt_x**2 + tilt_y**2)

        return CanonicalInclinometerTelemetry(
            source_id=f"IOT-INC-{sensor_id}",
            source_name=raw_payload.get("sensor_name", f"Borehole Inclinometer {sensor_id}"),
            source_type=EvidenceSource.SENSOR,
            provenance_class=prov,
            observed_at=obs_dt,
            ingested_at=now_utc,
            latitude=lat,
            longitude=lon,
            spatial_reference="EPSG:4326",
            spatial_resolution_meters=1.0,
            temporal_resolution_seconds=1800,
            raw_payload_hash=raw_hash,
            metric_name="borehole_tilt_vector",
            raw_value={"tilt_x": tilt_x, "tilt_y": tilt_y},
            normalized_value=total_tilt,
            unit="degrees",
            quality_status=quality,
            freshness_seconds=freshness_sec,
            verification_status=EvidenceInterpretation.UNVERIFIED,
            sensor_id=sensor_id,
            depth_meters=depth,
            tilt_axis_x_deg=tilt_x,
            tilt_axis_y_deg=tilt_y,
            displacement_rate_mm_day=disp_rate,
            cumulative_displacement_mm=cum_disp,
            battery_voltage_v=battery,
            temperature_internal_c=float(raw_payload["temperature_internal_c"]) if "temperature_internal_c" in raw_payload else None,
            stuck_value_flag=bool(raw_payload.get("stuck_value_flag", False)),
            metadata_json=raw_payload.get("metadata", {}),
        )
