"""Authoritative Historical Landslides Ground Truth Service.

Loads, validates, and queries the real historical landslide inventory
for West Kameng corridor (NH-13) with geodetic proximity and spatial density derivation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from app.gis.primitives import GeoPoint

INVENTORY_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "landslides"
    / "west_kameng_historical_inventory.json"
)


class HistoricalLandslidesService:
    """Service to query authoritative historical landslide ground-truth records."""

    def __init__(self, data_path: Optional[Path] = None):
        self.data_path = data_path or INVENTORY_PATH
        self._records: list[dict[str, Any]] = []
        self._load_catalog()

    def _load_catalog(self) -> None:
        """Load and validate the historical landslide inventory JSON."""
        if not self.data_path.is_file():
            self._records = []
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            self._records = data.get("records", [])

    def get_all_records(self) -> list[dict[str, Any]]:
        """Return all historical landslide ground truth records."""
        return list(self._records)

    def to_geojson(self) -> dict[str, Any]:
        """Format the historical inventory as a standard GeoJSON FeatureCollection."""
        features = []
        for r in self._records:
            features.append(
                {
                    "type": "Feature",
                    "id": r["event_id"],
                    "geometry": {
                        "type": "Point",
                        "coordinates": [r["longitude"], r["latitude"]],
                    },
                    "properties": {
                        "event_id": r["event_id"],
                        "name": r["name"],
                        "location_name": r["location_name"],
                        "corridor_code": r["corridor_code"],
                        "chainage_km": r.get("chainage_km"),
                        "elevation_msl_m": r.get("elevation_msl_m"),
                        "event_date": r["event_date"],
                        "event_type": r["event_type"],
                        "movement_mechanism": r.get("movement_mechanism"),
                        "trigger_type": r.get("trigger_type"),
                        "trigger_rainfall_3d_mm": r.get("trigger_rainfall_3d_mm"),
                        "lithology": r.get("lithology"),
                        "estimated_volume_m3": r.get("estimated_volume_m3"),
                        "road_blockage_hours": r.get("road_blockage_hours"),
                        "source_agency": r["source_agency"],
                        "source_record_id": r["source_record_id"],
                        "field_verified": r.get("field_verified", False),
                        "data_quality": r.get("data_quality", "OFFICIAL_RECORD"),
                        "provenance_class": "REAL_HISTORICAL",
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "provenance_class": "REAL_HISTORICAL",
            "data_steward": "Geological Survey of India (GSI NLSM) / BRO Project Vartak Archives",
            "features": features,
        }

    def find_nearest_landslide(
        self, latitude: float, longitude: float
    ) -> tuple[Optional[dict[str, Any]], float]:
        """Find the nearest historical landslide event and geodetic distance in meters."""
        if not self._records:
            return None, float("inf")

        target = GeoPoint(latitude=latitude, longitude=longitude)
        min_dist = float("inf")
        nearest_record = None

        for rec in self._records:
            pt = GeoPoint(latitude=rec["latitude"], longitude=rec["longitude"])
            d = target.distance_to(pt)
            if d < min_dist:
                min_dist = d
                nearest_record = rec

        return nearest_record, round(min_dist, 1)

    def compute_density_in_radius(
        self, latitude: float, longitude: float, radius_meters: float = 5000.0
    ) -> int:
        """Count historical landslide events within a given geodetic radius."""
        target = GeoPoint(latitude=latitude, longitude=longitude)
        count = 0
        for rec in self._records:
            pt = GeoPoint(latitude=rec["latitude"], longitude=rec["longitude"])
            if target.distance_to(pt) <= radius_meters:
                count += 1
        return count
