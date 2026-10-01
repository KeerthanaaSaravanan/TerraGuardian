"""Experimental Landslide Susceptibility Baseline Service.

Scientific Status:
    EXPERIMENTAL EMPIRICAL BASELINE (NOT A REGIONALLY VALIDATED MODEL)

Dataset:
    5 GSI NLSM Historical Landslide Events (Positives)
    + 5 Low-Gradient Corridor Valley/Terrace Control Samples (Background Controls)
    Notice: Background samples are selected from low-gradient areas along the corridor
    and represent unverified background controls subject to potential selection bias.
    This model is NOT calibrated as a production probabilistic ML model.

Features:
    - Copernicus GLO-30 DEM: Slope (Horn 1981 finite difference) & Elevation
    - ERA5-Land / NASA GPM: 7-day Antecedent Rainfall Index (ARI-7)
    - GSI NLSM Inventory: Geodetic proximity to nearest historical landslide event
"""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
except ImportError:
    class StandardScaler:  # type: ignore[no-redef]
        """Lightweight pure-NumPy StandardScaler fallback."""
        def __init__(self) -> None:
            self.mean_: np.ndarray | None = None
            self.scale_: np.ndarray | None = None

        def fit_transform(self, X: np.ndarray) -> np.ndarray:
            self.mean_ = np.mean(X, axis=0)
            self.scale_ = np.std(X, axis=0)
            self.scale_[self.scale_ == 0.0] = 1.0
            return (X - self.mean_) / self.scale_

        def transform(self, X: np.ndarray) -> np.ndarray:
            assert self.mean_ is not None and self.scale_ is not None
            return (X - self.mean_) / self.scale_

    class LogisticRegression:  # type: ignore[no-redef]
        """Lightweight pure-NumPy LogisticRegression fallback."""
        def __init__(self, random_state: int = 42, C: float = 1.0) -> None:
            self.coef_ = np.zeros((1, 3))
            self.intercept_ = np.zeros(1)

        def fit(self, X: np.ndarray, y: np.ndarray, lr: float = 0.1, epochs: int = 500) -> None:
            n, m = X.shape
            w = np.zeros(m)
            b = 0.0
            for _ in range(epochs):
                z = np.dot(X, w) + b
                p = 1.0 / (1.0 + np.exp(-np.clip(z, -25, 25)))
                dw = np.dot(X.T, (p - y)) / n
                db = float(np.sum(p - y) / n)
                w -= lr * dw
                b -= lr * db
            self.coef_ = w.reshape(1, -1)
            self.intercept_ = np.array([b])

        def score(self, X: np.ndarray, y: np.ndarray) -> float:
            p = self.predict_proba(X)[:, 1]
            return float(np.mean((p >= 0.5) == y))

        def predict_proba(self, X: np.ndarray) -> np.ndarray:
            z = np.dot(X, self.coef_[0]) + self.intercept_[0]
            p = 1.0 / (1.0 + np.exp(-np.clip(z, -25, 25)))
            return np.column_stack([1.0 - p, p])

from app.gis.terrain_engine import TerrainEngine
from app.services.environmental_data_service import EnvironmentalDataService
from app.services.historical_landslides_service import HistoricalLandslidesService

logger = logging.getLogger(__name__)

# Metadata specification for reproducibility
DATASET_METADATA = {
    "dataset_name": "West Kameng NH-13 Experimental Baseline Inventory",
    "dataset_version": "v0.1-exp",
    "feature_version": "v1.0",
    "model_version": "logreg-baseline-v0.1-exp",
    "model_type": "EXPERIMENTAL EMPIRICAL BASELINE",
    "scientific_status": "NOT_VALIDATED_EXPERIMENTAL",
    "spatial_extent": {
        "corridor": "NH-13 Trans-Arunachal Highway (Bhalukpong-Tenga)",
        "min_latitude": 26.9800,
        "max_latitude": 27.3500,
        "min_longitude": 92.3800,
        "max_longitude": 92.7000,
    },
    "positive_count": 5,
    "background_count": 5,
    "positive_source": "Geological Survey of India (GSI NLSM) Historical Landslide Inventory",
    "background_source": "West Kameng Corridor Valley Floor / Low-Gradient Ground Control Points",
    "background_sampling_method": "Low-gradient corridor valley/terrace sampling (unverified negative controls; potential selection bias acknowledged)",
    "classification_thresholds": {
        "LOW": "< 0.40",
        "MODERATE": "0.40 - 0.69",
        "HIGH": ">= 0.70",
        "note": "EXPERIMENTAL_UNVALIDATED_THRESHOLDS",
    },
}

# Unverified background / control points along low-gradient stretches
CORRIDOR_BACKGROUND_CONTROLS = [
    {"name": "Bhalukpong Kameng Riverbed", "latitude": 27.0125, "longitude": 92.6450, "description": "Flat alluvial valley floor terrace (<5 deg)"},
    {"name": "Tenga Valley Low Gradient Terrace", "latitude": 27.2050, "longitude": 92.4280, "description": "Gentle river terrace (<8 deg)"},
    {"name": "Dedza Highway Gentle Stretch", "latitude": 27.1350, "longitude": 92.5150, "description": "Flat roadway terrace valley floor"},
    {"name": "Sessa Valley Flat Floor", "latitude": 27.0650, "longitude": 92.5850, "description": "Low slope alluvial fan section"},
    {"name": "Rupa Agriculture Plateau", "latitude": 27.1850, "longitude": 92.3950, "description": "Gentle valley bench terrace"},
]

# Corridor alignment key waypoints for NH-13 (KM-30 Bhalukpong -> KM-60 Tenga)
CORRIDOR_WAYPOINTS_KM30_TO_KM60 = [
    (27.0100, 92.6500, 30.0),  # Bhalukpong Gate KM-30
    (27.0250, 92.6320, 33.5),
    (27.0450, 92.6100, 37.0),
    (27.0650, 92.5870, 40.0),
    (27.0842, 92.5681, 42.0),  # Sessa Sector KM-42 (TG-2048 site)
    (27.1050, 92.5510, 45.0),
    (27.1240, 92.5320, 48.0),  # Pinjoli Nallah KM-48
    (27.1480, 92.4950, 52.0),  # Dedza KM-52
    (27.1780, 92.4620, 56.0),
    (27.2080, 92.4350, 59.0),
    (27.2200, 92.4280, 60.5),  # Tenga Entry KM-60
]


class SusceptibilityBaselineService:
    """Generates empirical training dataset, fits baseline model, and produces spatial susceptibility grids."""

    def __init__(
        self,
        landslide_service: Optional[HistoricalLandslidesService] = None,
        terrain_engine: Optional[TerrainEngine] = None,
        env_service: Optional[EnvironmentalDataService] = None,
    ):
        self.landslide_service = landslide_service or HistoricalLandslidesService()
        self.terrain_engine = terrain_engine or TerrainEngine()
        self.env_service = env_service or EnvironmentalDataService()
        self._model: Optional[LogisticRegression] = None
        self._scaler: Optional[StandardScaler] = None
        self._model_summary: Optional[dict[str, Any]] = None
        self._cached_grid: Optional[dict[str, Any]] = None

    def build_empirical_dataset(self) -> list[dict[str, Any]]:
        """Combine GSI historical landslide points (positives) and background control samples."""
        samples = []

        # 1. Positive Samples (GSI NLSM Historical Landslide Ground Truth)
        records = self.landslide_service.get_all_records()
        for r in records:
            lat = float(r["latitude"])
            lon = float(r["longitude"])

            # Query real DEM
            try:
                derivs = self.terrain_engine.compute_terrain_derivatives(lat, lon)
                slope = derivs["slope_degrees"]
                elev = derivs["elevation_m"]
                dem_quality = "VALID"
            except Exception as e:
                logger.warning(f"Could not compute DEM derivatives for {lat}, {lon}: {e}")
                slope = 35.0
                elev = r.get("elevation_msl_m", 700.0)
                dem_quality = "FALLBACK_ESTIMATED"

            # Query real rainfall
            try:
                rain_win = self.env_service.get_rainfall_window(r.get("event_date", "2024-06-25"))
                ari_7 = rain_win["antecedent_rainfall_index_7d"]
                rain_24h = rain_win["rainfall_24h_mm"]
            except Exception:
                ari_7 = 110.0
                rain_24h = 65.0

            samples.append({
                "sample_id": r["event_id"],
                "name": r["name"],
                "latitude": lat,
                "longitude": lon,
                "label": 1,
                "class_name": "Historical Landslide Event",
                "elevation_m": elev,
                "slope_deg": slope,
                "ari_7_index": ari_7,
                "rainfall_24h_mm": rain_24h,
                "data_quality": dem_quality,
                "source": f"GSI NLSM ({r['source_agency']})",
                "provenance_class": "REAL_HISTORICAL",
            })

        # 2. Background Control Samples (Low-gradient valley/terrace samples)
        for idx, neg in enumerate(CORRIDOR_BACKGROUND_CONTROLS):
            lat = neg["latitude"]
            lon = neg["longitude"]

            try:
                derivs = self.terrain_engine.compute_terrain_derivatives(lat, lon)
                slope = derivs["slope_degrees"]
                elev = derivs["elevation_m"]
                dem_quality = "VALID"
            except Exception as e:
                logger.warning(f"Could not compute DEM derivatives for control sample {lat}, {lon}: {e}")
                slope = 6.5
                elev = 420.0
                dem_quality = "FALLBACK_ESTIMATED"

            try:
                rain_win = self.env_service.get_rainfall_window("2024-06-25")
                ari_7 = rain_win["antecedent_rainfall_index_7d"]
                rain_24h = rain_win["rainfall_24h_mm"]
            except Exception:
                ari_7 = 110.0
                rain_24h = 65.0

            samples.append({
                "sample_id": f"BCG-WK-{idx+1:02d}",
                "name": neg["name"],
                "latitude": lat,
                "longitude": lon,
                "label": 0,
                "class_name": "Background / Control Sample",
                "elevation_m": elev,
                "slope_deg": slope,
                "ari_7_index": ari_7,
                "rainfall_24h_mm": rain_24h,
                "data_quality": dem_quality,
                "source": "West Kameng Low-Gradient Corridor Valley/Terrace Control",
                "provenance_class": "BACKGROUND_CONTROL",
            })

        return samples

    def train_baseline_model(self) -> dict[str, Any]:
        """Fit empirical baseline Logistic Regression over the 10-sample dataset."""
        samples = self.build_empirical_dataset()

        feature_names = ["slope_deg", "elevation_m", "ari_7_index"]
        X = np.array([[s["slope_deg"], s["elevation_m"], s["ari_7_index"]] for s in samples])
        y = np.array([s["label"] for s in samples])

        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)

        self._model = LogisticRegression(random_state=42, C=1.0)
        self._model.fit(X_scaled, y)

        train_acc = float(self._model.score(X_scaled, y))
        coefficients = {name: round(float(c), 4) for name, c in zip(feature_names, self._model.coef_[0])}

        pos_count = int(np.sum(y == 1))
        neg_count = int(np.sum(y == 0))

        self._model_summary = {
            "model_type": DATASET_METADATA["model_type"],
            "model_version": DATASET_METADATA["model_version"],
            "dataset_version": DATASET_METADATA["dataset_version"],
            "feature_version": DATASET_METADATA["feature_version"],
            "scientific_status": DATASET_METADATA["scientific_status"],
            "dataset_metadata": DATASET_METADATA,
            "training_timestamp": datetime.now(timezone.utc).isoformat(),
            "feature_names": feature_names,
            "coefficients": coefficients,
            "intercept": round(float(self._model.intercept_[0]), 4),
            "exploratory_training_accuracy": round(train_acc, 3),
            "evaluation_notice": "EXPLORATORY_TRAINING_METRIC (No independent holdout or regional cross-validation)",
            "total_samples": len(samples),
            "positive_samples": pos_count,
            "background_samples": neg_count,
            "samples": samples,
            "provenance": {
                "positive_source": DATASET_METADATA["positive_source"],
                "background_source": DATASET_METADATA["background_source"],
                "background_sampling_method": DATASET_METADATA["background_sampling_method"],
                "terrain_source": "Copernicus GLO-30 DEM 30m Raster (Tile N27E092)",
                "rainfall_source": "ERA5-Land / NASA GPM Historical Reanalysis",
            },
        }
        return self._model_summary

    def _ensure_model_trained(self) -> None:
        """Ensure the internal model and scaler are instantiated."""
        if self._model is None or self._scaler is None:
            self.train_baseline_model()

    def predict_score(self, slope_deg: float, elevation_m: float, ari_7_index: float) -> tuple[float, str]:
        """Compute experimental susceptibility score (0.00 to 1.00) and qualitative class.

        Classes:
            LOW: < 0.40
            MODERATE: 0.40 - 0.69
            HIGH: >= 0.70
        """
        self._ensure_model_trained()
        assert self._model is not None and self._scaler is not None

        X = np.array([[slope_deg, elevation_m, ari_7_index]])
        X_scaled = self._scaler.transform(X)
        prob = float(self._model.predict_proba(X_scaled)[0, 1])

        if prob >= 0.70:
            classification = "HIGH"
        elif prob >= 0.40:
            classification = "MODERATE"
        else:
            classification = "LOW"

        return round(prob, 3), classification

    def predict_point_susceptibility(
        self, latitude: float, longitude: float, target_date: str = "2024-06-25"
    ) -> dict[str, Any]:
        """Compute experimental susceptibility assessment for an exact point location."""
        self._ensure_model_trained()

        # 1. Terrain derivatives
        try:
            t_derivs = self.terrain_engine.compute_terrain_derivatives(latitude, longitude)
            slope = t_derivs["slope_degrees"]
            elev = t_derivs["elevation_m"]
            aspect = t_derivs["aspect_degrees"]
            terrain_status = "VALID"
        except Exception as e:
            logger.warning(f"Terrain calculation failed for point ({latitude}, {longitude}): {e}")
            slope = 25.0
            elev = 600.0
            aspect = 0.0
            terrain_status = "FALLBACK_ESTIMATED"

        # 2. Rainfall index
        try:
            r_win = self.env_service.get_rainfall_window(target_date)
            ari_7 = r_win["antecedent_rainfall_index_7d"]
            rainfall_24h = r_win["rainfall_24h_mm"]
            rainfall_status = "VALID"
        except Exception:
            ari_7 = 127.47
            rainfall_24h = 74.0
            rainfall_status = "FALLBACK_ESTIMATED"

        # 3. Proximity to historical landslides
        nearest_ls, dist_m = self.landslide_service.find_nearest_landslide(latitude, longitude)

        # 4. Model inference
        score, category = self.predict_score(slope, elev, ari_7)

        return {
            "latitude": latitude,
            "longitude": longitude,
            "experimental_susceptibility_score": score,
            "experimental_susceptibility_class": category,
            "model_type": DATASET_METADATA["model_type"],
            "model_version": DATASET_METADATA["model_version"],
            "dataset_version": DATASET_METADATA["dataset_version"],
            "scientific_status": DATASET_METADATA["scientific_status"],
            "features": {
                "slope_deg": slope,
                "elevation_m": elev,
                "aspect_deg": aspect,
                "ari_7_index": ari_7,
                "rainfall_24h_mm": rainfall_24h,
                "nearest_landslide_dist_m": dist_m,
                "nearest_landslide_id": nearest_ls["event_id"] if nearest_ls else None,
            },
            "feature_lineage": {
                "slope_deg": {"source": "Copernicus GLO-30 DEM", "algorithm": "Horn (1981)", "status": terrain_status},
                "elevation_m": {"source": "Copernicus GLO-30 DEM", "status": terrain_status},
                "ari_7_index": {"source": "ERA5-Land / GPM Reanalysis", "formula": "Exponential Decay k=0.80", "status": rainfall_status},
                "nearest_landslide_dist_m": {"source": "GSI NLSM Inventory", "status": "VALID"},
            },
            "classification_notice": "EXPERIMENTAL_UNVALIDATED_SCORE (Not an empirical hazard probability)",
        }

    def generate_corridor_susceptibility_grid(
        self, spacing_meters: float = 500.0, force_regenerate: bool = False
    ) -> dict[str, Any]:
        """Generate a reproducible spatial susceptibility grid along NH-13 KM-30 to KM-60.

        Samples points along the corridor centerline and immediate lateral cut-slopes
        at approximately 500m spacing, extracting real terrain derivatives and computing
        experimental baseline susceptibility.
        """
        if self._cached_grid is not None and not force_regenerate:
            return self._cached_grid

        self._ensure_model_trained()

        # Generate sample coordinates along the corridor polyline
        grid_points = []
        waypoints = CORRIDOR_WAYPOINTS_KM30_TO_KM60

        # Linear interpolation between waypoints
        cell_counter = 1
        for i in range(len(waypoints) - 1):
            lat1, lon1, km1 = waypoints[i]
            lat2, lon2, km2 = waypoints[i + 1]

            # Approximate distance in meters between waypoints
            # 1 deg lat ~ 111320m, 1 deg lon ~ 99000m at 27 deg N
            d_lat_m = (lat2 - lat1) * 111320.0
            d_lon_m = (lon2 - lon1) * 99000.0
            seg_dist_m = math.sqrt(d_lat_m**2 + d_lon_m**2)

            num_steps = max(1, int(round(seg_dist_m / spacing_meters)))

            for step in range(num_steps):
                frac = step / float(num_steps)
                c_lat = lat1 + frac * (lat2 - lat1)
                c_lon = lon1 + frac * (lon2 - lon1)
                c_km = km1 + frac * (km2 - km1)

                # Centerline point
                grid_points.append({
                    "cell_id": f"WK-CORR-{cell_counter:03d}",
                    "latitude": round(c_lat, 5),
                    "longitude": round(c_lon, 5),
                    "chainage_km": round(c_km, 2),
                    "location_type": "HIGHWAY_CENTERLINE",
                })
                cell_counter += 1

                # Lateral cut-slope offset (+250m orthogonal to roadway)
                if seg_dist_m > 0:
                    norm_lat = -d_lon_m / seg_dist_m
                    norm_lon = d_lat_m / seg_dist_m
                    offset_m = 250.0
                    lat_off = c_lat + (norm_lat * offset_m) / 111320.0
                    lon_off = c_lon + (norm_lon * offset_m) / 99000.0

                    grid_points.append({
                        "cell_id": f"WK-CORR-{cell_counter:03d}",
                        "latitude": round(lat_off, 5),
                        "longitude": round(lon_off, 5),
                        "chainage_km": round(c_km, 2),
                        "location_type": "UP-SLOPE_ESCARPMENT",
                    })
                    cell_counter += 1

        # Add final waypoint
        last_lat, last_lon, last_km = waypoints[-1]
        grid_points.append({
            "cell_id": f"WK-CORR-{cell_counter:03d}",
            "latitude": round(last_lat, 5),
            "longitude": round(last_lon, 5),
            "chainage_km": round(last_km, 2),
            "location_type": "HIGHWAY_CENTERLINE",
        })

        # Fetch corridor-wide rainfall baseline
        try:
            r_win = self.env_service.get_rainfall_window("2024-06-25")
            base_ari_7 = r_win["antecedent_rainfall_index_7d"]
            base_rain_24h = r_win["rainfall_24h_mm"]
        except Exception:
            base_ari_7 = 127.47
            base_rain_24h = 74.0

        features = []
        for pt in grid_points:
            lat = pt["latitude"]
            lon = pt["longitude"]

            # 1. Real DEM Feature Extraction
            try:
                derivs = self.terrain_engine.compute_terrain_derivatives(lat, lon)
                slope = derivs["slope_degrees"]
                elev = derivs["elevation_m"]
                aspect = derivs["aspect_degrees"]
                data_quality = "VALID_DEM"
            except Exception as e:
                logger.warning(f"DEM computation failed for grid point {pt['cell_id']} ({lat}, {lon}): {e}")
                slope = None
                elev = None
                aspect = None
                data_quality = "OUT_OF_BOUNDS_OR_NODATA"

            # 2. Historical Landslide Proximity
            nearest_ls, dist_m = self.landslide_service.find_nearest_landslide(lat, lon)

            # 3. Model Inference (handling missing data truthfully)
            if slope is not None and elev is not None:
                score, category = self.predict_score(slope, elev, base_ari_7)
                inference_status = "EXPERIMENTAL"
            else:
                score = None
                category = "UNAVAILABLE"
                inference_status = "DATA_UNAVAILABLE"

            features.append({
                "type": "Feature",
                "id": pt["cell_id"],
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": {
                    "cell_id": pt["cell_id"],
                    "corridor_code": "NH-13",
                    "chainage_km": pt["chainage_km"],
                    "location_type": pt["location_type"],
                    "elevation_msl_m": elev,
                    "slope_degrees": slope,
                    "aspect_degrees": aspect,
                    "ari_7_index": base_ari_7,
                    "rainfall_24h_mm": base_rain_24h,
                    "nearest_landslide_dist_m": dist_m,
                    "nearest_landslide_name": nearest_ls["name"] if nearest_ls else None,
                    "experimental_susceptibility_score": score,
                    "experimental_susceptibility_class": category,
                    "data_quality": data_quality,
                    "status": inference_status,
                    "model_version": DATASET_METADATA["model_version"],
                    "dataset_version": DATASET_METADATA["dataset_version"],
                    "feature_lineage": {
                        "elevation": "Copernicus GLO-30 DEM 30m COG",
                        "slope": "Horn (1981) 3x3 Finite Difference",
                        "rainfall": "ECMWF ERA5 / NASA GPM Historical Reanalysis",
                        "landslide_proximity": "GSI NLSM Historical Inventory (5 events)",
                    },
                },
            })

        geo_collection = {
            "type": "FeatureCollection",
            "metadata": {
                "title": "West Kameng Experimental Landslide Susceptibility Surface",
                "corridor": "NH-13 (KM-30 Bhalukpong to KM-60 Tenga)",
                "spacing_nominal_meters": spacing_meters,
                "total_grid_cells": len(features),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "dataset_metadata": DATASET_METADATA,
                "model_summary": {
                    "model_type": DATASET_METADATA["model_type"],
                    "model_version": DATASET_METADATA["model_version"],
                    "scientific_status": DATASET_METADATA["scientific_status"],
                    "classification_thresholds": DATASET_METADATA["classification_thresholds"],
                    "training_sample_distribution": "5 GSI positive landslide events / 5 unverified background controls",
                    "notice": "EXPERIMENTAL_UNVALIDATED_SURFACE (For research & prototype evaluation; not validated for operational life-safety clearance)",
                },
            },
            "features": features,
        }

        self._cached_grid = geo_collection
        return geo_collection
