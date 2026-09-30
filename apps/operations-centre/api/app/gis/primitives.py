"""Geospatial primitives, coordinate validation, and geodetic geometries.

Coordinates in TerraGuardian adhere strictly to EPSG:4326 (WGS 84).
This module enforces:
1. Coordinate range validation: Latitude [-90.0, 90.0], Longitude [-180.0, 180.0].
2. Coordinate order: Standard (lon, lat) for GeoJSON / PostGIS, (lat, lon) for human geodetics.
3. WKT and GeoJSON serialization/deserialization.
4. Haversine and geodetic distance calculations.
"""

from __future__ import annotations

import json
import math
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


EARTH_RADIUS_METERS = 6371000.0  # WGS 84 mean spherical radius


class GeoPoint(BaseModel):
    """Authoritative geodetic coordinate representation."""
    latitude: float = Field(ge=-90.0, le=90.0, description="Latitude in decimal degrees (WGS 84)")
    longitude: float = Field(ge=-180.0, le=180.0, description="Longitude in decimal degrees (WGS 84)")
    altitude_m: Optional[float] = Field(default=None, description="Orthometric height in meters above MSL")
    srid: int = Field(default=4326, description="Spatial Reference System Identifier (EPSG:4326)")

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (-90.0 <= v <= 90.0):
            raise ValueError(f"Latitude must be between -90.0 and 90.0, got {v}")
        return round(v, 7)

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (-180.0 <= v <= 180.0):
            raise ValueError(f"Longitude must be between -180.0 and 180.0, got {v}")
        return round(v, 7)

    def to_wkt(self) -> str:
        """Serialize to Well-Known Text (WKT) format: POINT(lon lat)."""
        return f"POINT({self.longitude:.7f} {self.latitude:.7f})"

    def to_geojson_geometry(self) -> dict[str, Any]:
        """Serialize to GeoJSON Geometry dictionary: [lon, lat]."""
        coords = [self.longitude, self.latitude]
        if self.altitude_m is not None:
            coords.append(self.altitude_m)
        return {
            "type": "Point",
            "coordinates": coords,
        }

    @classmethod
    def from_wkt(cls, wkt_str: str) -> GeoPoint:
        """Parse WKT POINT string."""
        cleaned = wkt_str.strip().upper()
        if not cleaned.startswith("POINT"):
            raise ValueError(f"Invalid Point WKT: {wkt_str}")
        inside = cleaned.replace("POINT", "").replace("(", "").replace(")", "").strip()
        parts = inside.split()
        if len(parts) < 2:
            raise ValueError(f"WKT POINT requires at least 2 coordinates (lon, lat): {wkt_str}")
        lon, lat = float(parts[0]), float(parts[1])
        alt = float(parts[2]) if len(parts) > 2 else None
        return cls(latitude=lat, longitude=lon, altitude_m=alt)

    def distance_to(self, other: GeoPoint) -> float:
        """Calculate great-circle Haversine distance in meters to another GeoPoint."""
        phi1 = math.radians(self.latitude)
        phi2 = math.radians(other.latitude)
        delta_phi = math.radians(other.latitude - self.latitude)
        delta_lambda = math.radians(other.longitude - self.longitude)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return EARTH_RADIUS_METERS * c


class GeoBoundingBox(BaseModel):
    """Geodetic bounding box envelope."""
    min_latitude: float = Field(ge=-90.0, le=90.0)
    max_latitude: float = Field(ge=-90.0, le=90.0)
    min_longitude: float = Field(ge=-180.0, le=180.0)
    max_longitude: float = Field(ge=-180.0, le=180.0)
    srid: int = 4326

    @field_validator("max_latitude")
    @classmethod
    def validate_latitude_order(cls, v: float, info: Any) -> float:
        min_lat = info.data.get("min_latitude")
        if min_lat is not None and v < min_lat:
            raise ValueError(f"max_latitude ({v}) cannot be less than min_latitude ({min_lat})")
        return v

    @field_validator("max_longitude")
    @classmethod
    def validate_longitude_order(cls, v: float, info: Any) -> float:
        min_lon = info.data.get("min_longitude")
        if min_lon is not None and v < min_lon:
            raise ValueError(f"max_longitude ({v}) cannot be less than min_longitude ({min_lon})")
        return v

    def contains(self, point: GeoPoint) -> bool:
        """Check whether point lies inside the bounding envelope."""
        return (
            self.min_latitude <= point.latitude <= self.max_latitude
            and self.min_longitude <= point.longitude <= self.max_longitude
        )

    def to_wkt_polygon(self) -> str:
        """Serialize bounding box to WKT Polygon."""
        return (
            f"POLYGON(({self.min_longitude} {self.min_latitude}, "
            f"{self.max_longitude} {self.min_latitude}, "
            f"{self.max_longitude} {self.max_latitude}, "
            f"{self.min_longitude} {self.max_latitude}, "
            f"{self.min_longitude} {self.min_latitude}))"
        )
