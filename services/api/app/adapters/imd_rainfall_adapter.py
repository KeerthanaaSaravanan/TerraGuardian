"""IMD Precipitation & Automated Weather Station (AWS) Ingestion Adapter.

SOURCE REALITY STATUS: REPLAY / SYNTHETIC
Live institutional integration with IMD National Data Centre (NDC) requires formal
government data-sharing authorization and bilateral API token infrastructure.
This adapter provides the authoritative ingestion boundary, schema normalization,
and data-quality filtering against historical or simulated IMD AWS data feeds.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.adapters.base import (
    ExternalDataAdapter,
    IngestionFailureReason,
    SourceAccessStatus,
)
from app.adapters.canonical_schemas import CanonicalPrecipitationObservation
from app.domain.enums import EvidenceInterpretation, EvidenceSource


# Geographic bounding box for North Eastern Region (NER), Sikkim & North Bengal
NER_BOUNDS = {
    "min_lat": 21.0,
    "max_lat": 30.5,
    "min_lon": 87.5,
    "max_lon": 98.0,
}

MAX_PHYSICAL_RAIN_1H_MM = 300.0  # Above 300 mm/hr exceeds Cherrapunji world cloudburst records; triggers quarantine


class IMDRainfallAdapter(ExternalDataAdapter[CanonicalPrecipitationObservation]):
    """Ingestion adapter for IMD Automated Weather Stations (AWS) and Doppler Radar precipitation."""

    adapter_name: str = "IMDRainfallAdapter"
    source_type: EvidenceSource = EvidenceSource.WEATHER
    access_status: SourceAccessStatus = SourceAccessStatus.REPLAY

    def validate_raw(self, raw_payload: dict[str, Any]) -> tuple[bool, IngestionFailureReason, str]:
        """Validate structure, coordinate limits, timestamps, and metric ranges."""
        # 1. Structural schema validation
        required_fields = ["station_id", "timestamp", "latitude", "longitude", "rainfall_1h_mm"]
        for field in required_fields:
            if field not in raw_payload:
                return False, IngestionFailureReason.SCHEMA_INVALID, f"Missing required payload field: '{field}'"

        # 2. Type validation
        try:
            lat = float(raw_payload["latitude"])
            lon = float(raw_payload["longitude"])
            rain_1h = float(raw_payload["rainfall_1h_mm"])
        except (ValueError, TypeError) as exc:
            return False, IngestionFailureReason.SCHEMA_INVALID, f"Numeric parse error: {str(exc)}"

        # 3. Spatial Bounds Check (NER Bounding Box)
        if not (NER_BOUNDS["min_lat"] <= lat <= NER_BOUNDS["max_lat"] and NER_BOUNDS["min_lon"] <= lon <= NER_BOUNDS["max_lon"]):
            return (
                False,
                IngestionFailureReason.SPATIAL_OUT_OF_BOUNDS,
                f"Coordinates ({lat}, {lon}) outside valid North Eastern Region bounding box ({NER_BOUNDS})",
            )

        # 4. Temporal Validation (Future timestamp rejection)
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
                f"Future observation timestamp ({obs_dt.isoformat()}) exceeds server time ({now_utc.isoformat()})",
            )

        # 5. Metric Physical Range Check
        if rain_1h < 0.0:
            return False, IngestionFailureReason.QUALITY_REJECTED, f"Negative rainfall ({rain_1h} mm) is physically impossible"

        if rain_1h > MAX_PHYSICAL_RAIN_1H_MM:
            return (
                False,
                IngestionFailureReason.QUARANTINED,
                f"Rainfall rate ({rain_1h} mm/hr) exceeds maximum physical threshold ({MAX_PHYSICAL_RAIN_1H_MM} mm/hr); quarantined for sensor inspection",
            )

        return True, IngestionFailureReason.NONE, "Valid payload"

    def transform(
        self,
        raw_payload: dict[str, Any],
        provenance: Optional[SourceAccessStatus] = None,
    ) -> CanonicalPrecipitationObservation:
        """Transform raw IMD payload into canonical precipitation schema."""
        raw_hash = self.compute_payload_hash(raw_payload)
        station_id = str(raw_payload["station_id"])
        lat = float(raw_payload["latitude"])
        lon = float(raw_payload["longitude"])
        rain_1h = float(raw_payload["rainfall_1h_mm"])
        rain_24h = float(raw_payload["rainfall_24h_mm"]) if "rainfall_24h_mm" in raw_payload and raw_payload["rainfall_24h_mm"] is not None else None
        intensity = float(raw_payload.get("intensity_rate_mm_hr", rain_1h))

        ts_str = str(raw_payload["timestamp"])
        obs_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        if obs_dt.tzinfo is None:
            obs_dt = obs_dt.replace(tzinfo=timezone.utc)

        now_utc = datetime.now(timezone.utc)
        freshness_sec = max(0, int((now_utc - obs_dt).total_seconds()))

        prov = provenance or self.access_status
        # Rule: cannot upgrade synthetic/replay to LIVE
        if prov == SourceAccessStatus.LIVE and self.access_status != SourceAccessStatus.LIVE:
            prov = self.access_status

        quality = "VALID"
        if freshness_sec > 86400:  # Older than 24 hours
            quality = "STALE"

        rain_3h = float(raw_payload["rainfall_3h_mm"]) if "rainfall_3h_mm" in raw_payload and raw_payload["rainfall_3h_mm"] is not None else None
        rain_6h = float(raw_payload["rainfall_6h_mm"]) if "rainfall_6h_mm" in raw_payload and raw_payload["rainfall_6h_mm"] is not None else None
        rain_72h = float(raw_payload["rainfall_72h_mm"]) if "rainfall_72h_mm" in raw_payload and raw_payload["rainfall_72h_mm"] is not None else None
        rain_7d = float(raw_payload["rainfall_7d_mm"]) if "rainfall_7d_mm" in raw_payload and raw_payload["rainfall_7d_mm"] is not None else None
        ari_7 = float(raw_payload["antecedent_rainfall_index_7d"]) if "antecedent_rainfall_index_7d" in raw_payload and raw_payload["antecedent_rainfall_index_7d"] is not None else None
        anomaly = float(raw_payload["anomaly_pct_vs_normal"]) if "anomaly_pct_vs_normal" in raw_payload and raw_payload["anomaly_pct_vs_normal"] is not None else None

        return CanonicalPrecipitationObservation(
            source_id=f"IMD-AWS-{station_id}",
            source_name=raw_payload.get("station_name", f"IMD Station {station_id}"),
            source_type=EvidenceSource.WEATHER,
            provenance_class=prov,
            observed_at=obs_dt,
            ingested_at=now_utc,
            latitude=lat,
            longitude=lon,
            spatial_reference="EPSG:4326",
            spatial_resolution_meters=1000.0,
            temporal_resolution_seconds=3600,
            raw_payload_hash=raw_hash,
            metric_name="cumulative_precipitation_1h",
            raw_value=rain_1h,
            normalized_value=rain_1h,
            unit="mm",
            quality_status=quality,
            freshness_seconds=freshness_sec,
            verification_status=EvidenceInterpretation.UNVERIFIED,
            station_id=station_id,
            station_name=raw_payload.get("station_name"),
            rainfall_1h_mm=rain_1h,
            rainfall_3h_mm=rain_3h,
            rainfall_6h_mm=rain_6h,
            rainfall_24h_mm=rain_24h,
            rainfall_72h_mm=rain_72h,
            rainfall_7d_mm=rain_7d,
            antecedent_rainfall_index_7d=ari_7,
            rainfall_intensity_rate_mm_hr=intensity,
            anomaly_pct_vs_normal=anomaly,
            temperature_c=float(raw_payload["temperature_c"]) if "temperature_c" in raw_payload else None,
            relative_humidity_pct=float(raw_payload["relative_humidity_pct"]) if "relative_humidity_pct" in raw_payload else None,
            wind_speed_mps=float(raw_payload["wind_speed_mps"]) if "wind_speed_mps" in raw_payload else None,
            data_quality_flag=quality,
            metadata_json=raw_payload.get("metadata", {}),
        )
