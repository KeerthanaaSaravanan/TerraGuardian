"""Unified Spatial Query Engine supporting PostGIS and geodetic math."""

from __future__ import annotations

import math
from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.gis.primitives import EARTH_RADIUS_METERS, GeoPoint


class SpatialQueryEngine:
    """Authoritative spatial query engine executing corridor, divergence, and exposure analyses."""

    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    @staticmethod
    def distance_meters(p1: GeoPoint, p2: GeoPoint) -> float:
        """Compute geodetic distance in meters between two points using WGS 84 Haversine."""
        return p1.distance_to(p2)

    @staticmethod
    def is_within_distance(p1: GeoPoint, p2: GeoPoint, threshold_m: float) -> bool:
        """Check whether distance between two points is within threshold."""
        return p1.distance_to(p2) <= threshold_m

    @staticmethod
    def detect_spatial_divergence(
        scarp_origin: GeoPoint,
        observation: GeoPoint,
        divergence_threshold_m: float = 500.0,
    ) -> tuple[bool, float]:
        """Detect whether a new ground observation diverges from original scarp centroid (>500m)."""
        dist = scarp_origin.distance_to(observation)
        is_divergent = dist > divergence_threshold_m
        return is_divergent, dist

    @staticmethod
    def point_in_polygon(point: GeoPoint, polygon_wkt: str) -> bool:
        """Evaluate point containment within a WKT polygon using ray-casting."""
        cleaned = polygon_wkt.strip().upper()
        if not cleaned.startswith("POLYGON"):
            raise ValueError(f"Expected POLYGON WKT, got {polygon_wkt[:30]}")

        # Extract ring coordinates
        coord_part = cleaned.replace("POLYGON", "").replace("(", "").replace(")", "").strip()
        pairs = coord_part.split(",")
        vertices: list[tuple[float, float]] = []
        for pair in pairs:
            parts = pair.strip().split()
            if len(parts) >= 2:
                vertices.append((float(parts[0]), float(parts[1])))  # (lon, lat)

        if not vertices:
            return False

        # Ray-casting algorithm
        x, y = point.longitude, point.latitude
        n = len(vertices)
        inside = False

        p1x, p1y = vertices[0]
        for i in range(1, n + 1):
            p2x, p2y = vertices[i % n]
            if y > min(p1y, p2y):
                if y <= max(p1y, p2y):
                    if x <= max(p1x, p2x):
                        if p1y != p2y:
                            xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                        if p1x == p2x or x <= xinters:
                            inside = not inside
            p1x, p1y = p2x, p2y

        return inside

    @staticmethod
    def point_to_linestring_distance(point: GeoPoint, linestring_wkt: str) -> float:
        """Compute minimum distance from point to a WKT LineString in meters."""
        cleaned = linestring_wkt.strip().upper()
        if not cleaned.startswith("LINESTRING"):
            raise ValueError(f"Expected LINESTRING WKT, got {linestring_wkt[:30]}")

        coord_part = cleaned.replace("LINESTRING", "").replace("(", "").replace(")", "").strip()
        points: list[GeoPoint] = []
        for pair in coord_part.split(","):
            parts = pair.strip().split()
            if len(parts) >= 2:
                points.append(GeoPoint(longitude=float(parts[0]), latitude=float(parts[1])))

        if not points:
            return float("inf")

        min_dist = float("inf")
        # Check distances to vertices
        for p in points:
            min_dist = min(min_dist, point.distance_to(p))

        # Check geodesic distance to each line segment without equirectangular planar distortion (TG-014)
        for i in range(len(points) - 1):
            p1, p2 = points[i], points[i + 1]
            seg_dist = SpatialQueryEngine._geodesic_cross_track_distance(point, p1, p2)
            min_dist = min(min_dist, seg_dist)

        return min_dist

    @classmethod
    def _geodesic_cross_track_distance(cls, point: GeoPoint, p1: GeoPoint, p2: GeoPoint) -> float:
        """Compute geodesic distance from point to great-circle segment on WGS 84 sphere (Resolves TG-014).
        
        Eliminates equirectangular planar distortion at high/sub-tropical latitudes (27°N).
        """
        d12 = p1.distance_to(p2)
        if d12 < 1e-3:
            return point.distance_to(p1)

        d13 = p1.distance_to(point) / EARTH_RADIUS_METERS
        if d13 < 1e-9:
            return 0.0

        lat1 = math.radians(p1.latitude)
        lat2 = math.radians(p2.latitude)
        lat3 = math.radians(point.latitude)
        lon1 = math.radians(p1.longitude)
        lon2 = math.radians(p2.longitude)
        lon3 = math.radians(point.longitude)

        # Initial bearing p1 -> p2
        y12 = math.sin(lon2 - lon1) * math.cos(lat2)
        x12 = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(lon2 - lon1)
        theta12 = (math.atan2(y12, x12) + 2.0 * math.pi) % (2.0 * math.pi)

        # Initial bearing p1 -> point (p3)
        y13 = math.sin(lon3 - lon1) * math.cos(lat3)
        x13 = math.cos(lat1) * math.sin(lat3) - math.sin(lat1) * math.cos(lat3) * math.cos(lon3 - lon1)
        theta13 = (math.atan2(y13, x13) + 2.0 * math.pi) % (2.0 * math.pi)

        # Spherical cross-track distance
        d_xt = math.asin(max(-1.0, min(1.0, math.sin(d13) * math.sin(theta13 - theta12))))
        cos_xt = math.cos(d_xt)
        if abs(cos_xt) < 1e-9:
            return abs(d_xt) * EARTH_RADIUS_METERS

        cos_at = max(-1.0, min(1.0, math.cos(d13) / cos_xt))
        d_at = math.acos(cos_at)
        d12_rad = d12 / EARTH_RADIUS_METERS

        # If projection falls behind p1 or past p2 along the great-circle
        if math.cos(theta13 - theta12) < 0:
            return p1.distance_to(point)
        if d_at > d12_rad:
            return p2.distance_to(point)

        return abs(d_xt) * EARTH_RADIUS_METERS


    def is_within_corridor(
        self,
        target_point: GeoPoint,
        road_wkt: str,
        buffer_meters: float = 5000.0,
    ) -> bool:
        """Check whether a target point falls within the linear infrastructure corridor envelope (5km)."""
        dist = self.point_to_linestring_distance(target_point, road_wkt)
        return dist <= buffer_meters
