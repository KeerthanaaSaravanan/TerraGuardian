"""Reproducible Feature Extraction Pipeline for Landslide Predictive Intelligence.

Extracts typed, standardized feature vectors from Incident Twins and their
associated multi-source Evidence Fabric. Supports both real environmental
substrate (Copernicus DEM, ERA5/GPM reanalysis, GSI NLSM landslides)
and controlled demonstration fixtures with complete provenance lineage.
"""

from __future__ import annotations

import math
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

from app.db.models import EvidenceModel, IncidentModel
from app.domain.enums import EvidenceConflictStatus, EvidenceInterpretation, EvidenceSource
from app.domain.risk import DataQualitySummary, EvidenceLineageItem, FeatureSnapshotItem


@dataclass
class ExtractedFeatureVector:
    """Standardized numerical and categorical feature vector for model inference."""

    # Hydrometeorological Predictors
    antecedent_rainfall_7d_mm: float
    short_window_rainfall_24h_mm: float
    rainfall_intensity_mmh: float

    # Geomorphological & Geological Predictors
    slope_gradient_deg: float
    geological_susceptibility: float  # 0.0 (stable) to 1.0 (highly sheared/weathered)
    soil_saturation_index: float      # 0.0 (dry) to 1.0 (fully saturated)

    # Remote Sensing & Spaceborne Telemetry
    optical_obscuration_pct: float    # 0.0 to 100.0 (% cloud/fog cover)
    radar_coherence_anomaly: float    # 0.0 to 1.0 (phase change / interferometric decorrelation)

    # Historical & Observational Context
    historical_landslide_count: int
    citizen_reports_count: int
    field_verification_count: int

    # Quality & Provenance Metadata
    data_quality: DataQualitySummary
    raw_feature_map: dict[str, Any] = field(default_factory=dict)

    # Complete Prediction -> Feature -> Evidence Lineage
    input_evidence_ids: list[uuid.UUID] = field(default_factory=list)
    evidence_lineage: list[EvidenceLineageItem] = field(default_factory=list)
    feature_to_evidence_map: dict[str, list[uuid.UUID]] = field(default_factory=dict)
    feature_snapshot: list[FeatureSnapshotItem] = field(default_factory=list)
    feature_schema_version: str = "v1.0"

    # Real Environmental Substrate Additions
    elevation_msl_m: Optional[float] = None
    aspect_deg: Optional[float] = None
    nearest_historical_landslide_dist_m: Optional[float] = None
    nearest_historical_landslide_name: Optional[str] = None
    terrain_provenance: str = "CONTROLLED_FIXTURE"
    rainfall_provenance: str = "CONTROLLED_FIXTURE"
    historical_provenance: str = "CONTROLLED_FIXTURE"


class FeaturePipeline:
    """Extracts reproducible features from Incident and Evidence entities."""

    EXPECTED_CORE_FEATURES = [
        "antecedent_rainfall_7d_mm",
        "short_window_rainfall_24h_mm",
        "rainfall_intensity_mmh",
        "slope_gradient_deg",
        "geological_susceptibility",
        "soil_saturation_index",
        "optical_obscuration_pct",
    ]

    @classmethod
    def extract_features(
        cls, incident: IncidentModel, use_real_substrate: bool = False
    ) -> ExtractedFeatureVector:
        """Extract standardized feature vector from an incident twin and its evidence items.
        
        Args:
            incident: The incident twin containing coordinates, metadata, and evidence.
            use_real_substrate: When True, or when incident.is_simulated is False,
                                queries the real Copernicus GLO-30 DEM, historical rainfall,
                                and GSI landslide inventory for ground truth.
        """
        evidence_items: list[EvidenceModel] = getattr(incident, "evidence_items", []) or []
        meta = incident.metadata_json or {}

        missing_features: list[str] = []
        stale_features: list[str] = []
        conflicted_features: list[str] = []

        now = datetime.now(timezone.utc)

        # 1. Rainfall / Meteorological Extraction
        rain_7d: Optional[float] = None
        rain_24h: Optional[float] = None
        rain_rate: Optional[float] = meta.get("rainfall_peak_rate_mm_hr")

        # 2. Terrain / Geomorphology Extraction
        slope_deg: Optional[float] = meta.get("slope_angle_deg")
        geo_susc: Optional[float] = None
        saturation: Optional[float] = None

        # 3. Satellite / Remote Sensing Extraction
        optical_obscuration: Optional[float] = None
        radar_anomaly: Optional[float] = None

        # 4. Observational Ingest
        historical_count = 0
        citizen_count = 0
        field_verified_count = 0

        # Provenance tracking
        terrain_prov = "CONTROLLED_FIXTURE"
        rainfall_prov = "CONTROLLED_FIXTURE"
        historical_prov = "CONTROLLED_FIXTURE"
        elevation_msl: Optional[float] = None
        aspect_val: Optional[float] = None
        nearest_ls_dist: Optional[float] = None
        nearest_ls_name: Optional[str] = None

        # Initialize Lineage Tracking
        input_evidence_ids: list[uuid.UUID] = []
        evidence_lineage: list[EvidenceLineageItem] = []
        feature_to_evidence_map: dict[str, list[uuid.UUID]] = {f: [] for f in cls.EXPECTED_CORE_FEATURES}

        def extract_first_float(text: str | None) -> Optional[float]:
            if not text:
                return None
            m = re.search(r"[-+]?\d*\.?\d+", text)
            if m:
                try:
                    return float(m.group(0))
                except ValueError:
                    return None
            return None

        # Scan evidence items
        for ev in evidence_items:
            input_evidence_ids.append(ev.id)
            contributed_for_ev: list[str] = []

            # Check freshness (stale if > 24 hours / 86400s)
            if ev.freshness_seconds and ev.freshness_seconds > 86400:
                stale_features.append(f"{ev.source}_{ev.evidence_type}")

            # Check conflict
            if ev.conflict_status in (
                EvidenceConflictStatus.CONFLICTED.value,
                EvidenceConflictStatus.PARTIALLY_CONFLICTED.value,
            ):
                conflicted_features.append(f"{ev.source}_{ev.evidence_type}")

            raw = ev.raw_data or {}

            # Match Weather Evidence
            if ev.source == EvidenceSource.WEATHER.value:
                raw_7d = raw.get("antecedent_rainfall_7d_mm") or raw.get("rainfall_7d_mm")
                raw_24h = raw.get("rainfall_mm_24h") or raw.get("rain_24h_mm")
                raw_rate = raw.get("rainfall_peak_rate_mm_hr") or raw.get("peak_intensity_mmh")

                if raw_7d is not None:
                    rain_7d = float(raw_7d)
                if raw_24h is not None:
                    rain_24h = float(raw_24h)
                if raw_rate is not None:
                    rain_rate = float(raw_rate)

                # Generalized fallback if not typed in raw_data
                if rain_7d is None or rain_24h is None:
                    val = extract_first_float(ev.metric) or extract_first_float(ev.observation)
                    if val is not None and val > 0:
                        if "/24" in ev.metric.lower() or "24h" in ev.metric.lower():
                            if rain_24h is None:
                                rain_24h = val
                            if rain_7d is None:
                                rain_7d = val * 2.85
                        else:
                            if rain_7d is None:
                                rain_7d = val
                            if rain_24h is None:
                                rain_24h = val * 0.35

                contributed_for_ev.extend(["antecedent_rainfall_7d_mm", "short_window_rainfall_24h_mm"])
                feature_to_evidence_map["antecedent_rainfall_7d_mm"].append(ev.id)
                feature_to_evidence_map["short_window_rainfall_24h_mm"].append(ev.id)
                if rain_rate is not None:
                    contributed_for_ev.append("rainfall_intensity_mmh")
                    feature_to_evidence_map["rainfall_intensity_mmh"].append(ev.id)

            # Match Terrain Evidence
            elif ev.source == EvidenceSource.TERRAIN.value:
                raw_slope = raw.get("slope_gradient_deg") or raw.get("slope_deg") or raw.get("slope_angle_deg")
                raw_geo = raw.get("geological_susceptibility") or raw.get("susceptibility_score")
                raw_sat = raw.get("soil_saturation_index") or raw.get("soil_saturation")

                if raw_slope is not None:
                    slope_deg = float(raw_slope)
                if raw_geo is not None:
                    geo_susc = float(raw_geo)
                if raw_sat is not None:
                    saturation = float(raw_sat)

                if slope_deg is None:
                    val = extract_first_float(ev.metric) or extract_first_float(ev.observation)
                    if val is not None and 0.0 <= val <= 90.0:
                        slope_deg = val
                if geo_susc is None:
                    obs_full = (ev.observation + " " + (ev.details or "")).lower()
                    if "high" in obs_full or "mica-schist" in obs_full or "fractured" in obs_full:
                        geo_susc = 0.88
                    elif "moderate" in obs_full:
                        geo_susc = 0.55
                    elif "low" in obs_full or "stable" in obs_full:
                        geo_susc = 0.25

                contributed_for_ev.extend(["slope_gradient_deg", "geological_susceptibility"])
                feature_to_evidence_map["slope_gradient_deg"].append(ev.id)
                feature_to_evidence_map["geological_susceptibility"].append(ev.id)
                if saturation is not None:
                    contributed_for_ev.append("soil_saturation_index")
                    feature_to_evidence_map["soil_saturation_index"].append(ev.id)

            # Match Satellite Evidence
            elif ev.source == EvidenceSource.SATELLITE.value:
                raw_opt = raw.get("optical_obscuration_pct") or raw.get("cloud_cover_pct")
                raw_rad = raw.get("radar_coherence_anomaly") or raw.get("phase_anomaly")

                if raw_opt is not None:
                    optical_obscuration = float(raw_opt)
                if raw_rad is not None:
                    radar_anomaly = float(raw_rad)

                if optical_obscuration is None:
                    val = extract_first_float(ev.metric) or extract_first_float(ev.observation)
                    if val is not None and 0.0 <= val <= 100.0 and ("cloud" in ev.metric.lower() or "%" in ev.metric.lower()):
                        optical_obscuration = val
                if radar_anomaly is None:
                    obs_full = (ev.observation + " " + (ev.details or "")).lower()
                    if "radar" in obs_full or "sar" in obs_full or "anomaly" in obs_full:
                        radar_anomaly = 0.72

                if optical_obscuration is not None:
                    contributed_for_ev.append("optical_obscuration_pct")
                    feature_to_evidence_map["optical_obscuration_pct"].append(ev.id)
                if radar_anomaly is not None:
                    contributed_for_ev.append("radar_coherence_anomaly")
                    feature_to_evidence_map.setdefault("radar_coherence_anomaly", []).append(ev.id)

            # Match Historical Evidence
            elif ev.source == EvidenceSource.HISTORICAL.value:
                raw_count = raw.get("historical_landslide_count") or raw.get("past_event_count")
                if raw_count is not None:
                    historical_count += int(raw_count)
                else:
                    val = extract_first_float(ev.metric)
                    if val is not None and val > 0:
                        historical_count += int(val)
                    else:
                        historical_count += 1
                contributed_for_ev.append("historical_landslide_count")

            # Match Citizen Evidence
            elif ev.source == EvidenceSource.CITIZEN.value:
                citizen_count += 1
                contributed_for_ev.append("citizen_reports_count")

            # Match Field Evidence
            elif ev.source == EvidenceSource.FIELD.value:
                if ev.interpretation == EvidenceInterpretation.VERIFIED.value:
                    field_verified_count += 1
                contributed_for_ev.append("field_verification_count")

            evidence_lineage.append(
                EvidenceLineageItem(
                    evidence_id=ev.id,
                    source=ev.source,
                    source_name=ev.source_name,
                    evidence_type=ev.evidence_type,
                    metric=ev.metric,
                    observed_at=ev.observed_at,
                    contributed_features=contributed_for_ev,
                    freshness_seconds=ev.freshness_seconds,
                    conflict_status=ev.conflict_status or "NONE",
                )
            )

        # ── REAL ENVIRONMENTAL SUBSTRATE INGESTION ──
        # Evaluates real environmental layers (DEM, rainfall reanalysis, historical landslides)
        # when explicitly requested (use_real_substrate=True) OR to fill missing features dynamically
        # without falling back to arbitrary default numbers.
        if incident.latitude and incident.longitude:
            try:
                from app.gis.terrain_engine import TerrainEngine
                terrain = TerrainEngine()
                if terrain.is_dem_available():
                    t_derivs = terrain.compute_terrain_derivatives(incident.latitude, incident.longitude)
                    elevation_msl = t_derivs["elevation_m"]
                    aspect_val = t_derivs["aspect_degrees"]
                    # If slope is missing from evidence/meta, OR if real substrate was explicitly requested:
                    if slope_deg is None or use_real_substrate:
                        slope_deg = t_derivs["slope_degrees"]
                        terrain_prov = t_derivs["source_dataset"]
            except Exception:
                pass

            try:
                from app.services.historical_landslides_service import HistoricalLandslidesService
                ls_svc = HistoricalLandslidesService()
                nearest_rec, dist_m = ls_svc.find_nearest_landslide(incident.latitude, incident.longitude)
                density_5k = ls_svc.compute_density_in_radius(incident.latitude, incident.longitude, 5000.0)
                if historical_count == 0 or use_real_substrate:
                    if density_5k > 0:
                        historical_count = density_5k
                if nearest_rec:
                    nearest_ls_dist = dist_m
                    nearest_ls_name = nearest_rec.get("name")
                    historical_prov = "Geological Survey of India (GSI NLSM) Field Catalog"
            except Exception:
                pass

            try:
                from app.services.environmental_data_service import EnvironmentalDataService
                env_svc = EnvironmentalDataService()
                dates = env_svc.get_observation_dates()
                if dates and (rain_24h is None or rain_7d is None or use_real_substrate):
                    w = env_svc.get_rainfall_window(dates[-1] if not rain_24h else "2024-06-25")
                    if rain_24h is None or use_real_substrate:
                        rain_24h = w["rainfall_24h_mm"]
                    if rain_7d is None or use_real_substrate:
                        rain_7d = w["antecedent_rainfall_index_7d"]
                    rainfall_prov = w["source_agency"]
            except Exception:
                pass

        # Fallbacks & Default Domain Priors (with missing feature tracking)
        if rain_7d is None:
            rain_7d = 140.0  # Regional default prior
            missing_features.append("antecedent_rainfall_7d_mm")
        if rain_24h is None:
            rain_24h = rain_7d * 0.35
            missing_features.append("short_window_rainfall_24h_mm")
        if rain_rate is None:
            rain_rate = 20.0
            missing_features.append("rainfall_intensity_mmh")

        if slope_deg is None:
            slope_deg = 38.0
            missing_features.append("slope_gradient_deg")
        if geo_susc is None:
            geo_susc = 0.75
            missing_features.append("geological_susceptibility")
        if saturation is None:
            # Derived from rainfall ratio
            saturation = min(1.0, rain_7d / 200.0)

        if optical_obscuration is None:
            optical_obscuration = 50.0
            missing_features.append("optical_obscuration_pct")
        if radar_anomaly is None:
            radar_anomaly = 0.50

        # Calculate completeness
        available_count = len(cls.EXPECTED_CORE_FEATURES) - len(missing_features)
        completeness = max(0.1, round(available_count / len(cls.EXPECTED_CORE_FEATURES), 2))

        data_quality = DataQualitySummary(
            total_expected_features=len(cls.EXPECTED_CORE_FEATURES),
            available_features=available_count,
            missing_features=missing_features,
            stale_features=stale_features,
            conflicted_features=conflicted_features,
            completeness_ratio=completeness,
            optical_obscuration_pct=optical_obscuration,
        )

        raw_map = {
            "antecedent_rainfall_7d_mm": rain_7d,
            "short_window_rainfall_24h_mm": rain_24h,
            "rainfall_intensity_mmh": rain_rate,
            "slope_gradient_deg": slope_deg,
            "geological_susceptibility": geo_susc,
            "soil_saturation_index": saturation,
            "optical_obscuration_pct": optical_obscuration,
            "radar_coherence_anomaly": radar_anomaly,
            "historical_landslide_count": historical_count,
            "citizen_reports_count": citizen_count,
            "field_verification_count": field_verified_count,
            # Substrate provenance metadata
            "elevation_msl_m": elevation_msl,
            "aspect_deg": aspect_val,
            "nearest_historical_landslide_dist_m": nearest_ls_dist,
            "nearest_historical_landslide_name": nearest_ls_name,
            "terrain_provenance": terrain_prov,
            "rainfall_provenance": rainfall_prov,
            "historical_provenance": historical_prov,
        }

        # Build Auditable Feature Snapshot
        feature_snapshot: list[FeatureSnapshotItem] = [
            FeatureSnapshotItem(
                feature_name="antecedent_rainfall_7d_mm",
                raw_value=rain_7d,
                normalized_value=round((rain_7d - 120.0) / 35.0, 2),
                is_missing="antecedent_rainfall_7d_mm" in missing_features,
                is_stale=any("WEATHER" in s for s in stale_features),
                is_conflicted=any("WEATHER" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("antecedent_rainfall_7d_mm", []),
            ),
            FeatureSnapshotItem(
                feature_name="short_window_rainfall_24h_mm",
                raw_value=rain_24h,
                normalized_value=round((rain_24h - 40.0) / 15.0, 2),
                is_missing="short_window_rainfall_24h_mm" in missing_features,
                is_stale=any("WEATHER" in s for s in stale_features),
                is_conflicted=any("WEATHER" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("short_window_rainfall_24h_mm", []),
            ),
            FeatureSnapshotItem(
                feature_name="rainfall_intensity_mmh",
                raw_value=rain_rate,
                normalized_value=round((rain_rate - 20.0) / 10.0, 2),
                is_missing="rainfall_intensity_mmh" in missing_features,
                is_stale=any("WEATHER" in s for s in stale_features),
                is_conflicted=any("WEATHER" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("rainfall_intensity_mmh", []),
            ),
            FeatureSnapshotItem(
                feature_name="slope_gradient_deg",
                raw_value=slope_deg,
                normalized_value=round((slope_deg - 32.0) / 7.5, 2),
                is_missing="slope_gradient_deg" in missing_features,
                is_stale=any("TERRAIN" in s for s in stale_features),
                is_conflicted=any("TERRAIN" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("slope_gradient_deg", []),
            ),
            FeatureSnapshotItem(
                feature_name="geological_susceptibility",
                raw_value=geo_susc,
                normalized_value=round((geo_susc - 0.5) * 4.0, 2),
                is_missing="geological_susceptibility" in missing_features,
                is_stale=any("TERRAIN" in s for s in stale_features),
                is_conflicted=any("TERRAIN" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("geological_susceptibility", []),
            ),
            FeatureSnapshotItem(
                feature_name="soil_saturation_index",
                raw_value=saturation,
                normalized_value=round((saturation - 0.5) * 3.0, 2),
                is_missing=False,
                is_stale=any("TERRAIN" in s for s in stale_features),
                is_conflicted=any("TERRAIN" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("soil_saturation_index", []),
            ),
            FeatureSnapshotItem(
                feature_name="optical_obscuration_pct",
                raw_value=optical_obscuration,
                normalized_value=round((optical_obscuration - 50.0) / 25.0, 2),
                is_missing="optical_obscuration_pct" in missing_features,
                is_stale=any("SATELLITE" in s for s in stale_features),
                is_conflicted=any("SATELLITE" in c for c in conflicted_features),
                contributing_evidence_ids=feature_to_evidence_map.get("optical_obscuration_pct", []),
            ),
        ]

        return ExtractedFeatureVector(
            antecedent_rainfall_7d_mm=rain_7d,
            short_window_rainfall_24h_mm=rain_24h,
            rainfall_intensity_mmh=rain_rate,
            slope_gradient_deg=slope_deg,
            geological_susceptibility=geo_susc,
            soil_saturation_index=saturation,
            optical_obscuration_pct=optical_obscuration,
            radar_coherence_anomaly=radar_anomaly,
            historical_landslide_count=historical_count,
            citizen_reports_count=citizen_count,
            field_verification_count=field_verified_count,
            data_quality=data_quality,
            raw_feature_map=raw_map,
            input_evidence_ids=input_evidence_ids,
            evidence_lineage=evidence_lineage,
            feature_to_evidence_map=feature_to_evidence_map,
            feature_snapshot=feature_snapshot,
            feature_schema_version="v1.0",
            elevation_msl_m=elevation_msl,
            aspect_deg=aspect_val,
            nearest_historical_landslide_dist_m=nearest_ls_dist,
            nearest_historical_landslide_name=nearest_ls_name,
            terrain_provenance=terrain_prov,
            rainfall_provenance=rainfall_prov,
            historical_provenance=historical_prov,
        )
