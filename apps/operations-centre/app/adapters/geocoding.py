"""Authoritative Real-Time Geocoding & NER Spatial Resolution Provider.

Resolves real device GPS coordinates to Indian administrative units (State, District, Locality, Road)
and determines North Eastern Region (NER) operational eligibility.
"""

from __future__ import annotations

import logging
from typing import Any, Optional
import httpx
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

NER_STATES = {
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura",
}

# State bounding boxes (min_lat, max_lat, min_lon, max_lon) for fallback boundary resolution
NER_BOUNDING_BOXES: dict[str, tuple[float, float, float, float]] = {
    "Arunachal Pradesh": (26.6, 29.5, 91.5, 97.5),
    "Assam": (24.1, 28.1, 89.7, 96.0),
    "Meghalaya": (25.0, 26.2, 89.8, 92.8),
    "Manipur": (23.8, 25.7, 93.0, 94.8),
    "Mizoram": (21.9, 24.5, 92.2, 93.5),
    "Nagaland": (25.1, 27.1, 93.3, 95.3),
    "Sikkim": (27.0, 28.2, 88.0, 88.9),
    "Tripura": (22.9, 24.6, 91.1, 92.5),
}


class GeocodingResult(BaseModel):
    """Normalized reverse geocoding result."""
    latitude: float
    longitude: float
    state: str
    district: str
    locality: Optional[str] = None
    road_corridor: Optional[str] = None
    country: str = "India"
    is_ner_region: bool = False
    provider: str = "Nominatim"
    raw_address: dict[str, Any] = Field(default_factory=dict)


class GeocodingProvider:
    """Reverse geocoding provider using OpenStreetMap Nominatim with boundary fallback."""

    USER_AGENT = "TerraGuardian-Disaster-Intelligence/1.0"
    NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"

    @classmethod
    def check_ner_bounding_box(cls, lat: float, lng: float) -> Optional[str]:
        """Estimate NER state based on geographic bounding box coordinates."""
        for state, (min_lat, max_lat, min_lon, max_lon) in NER_BOUNDING_BOXES.items():
            if min_lat <= lat <= max_lat and min_lon <= lng <= max_lon:
                return state
        return None

    @classmethod
    async def reverse_geocode(cls, latitude: float, longitude: float) -> GeocodingResult:
        """Resolve WGS-84 coordinates into administrative geography in real-time."""
        # 1. Attempt real-time reverse geocoding via OpenStreetMap Nominatim
        try:
            async with httpx.AsyncClient(timeout=4.5) as client:
                resp = await client.get(
                    cls.NOMINATIM_URL,
                    params={
                        "lat": latitude,
                        "lon": longitude,
                        "format": "json",
                        "zoom": 18,
                        "addressdetails": 1,
                    },
                    headers={"User-Agent": cls.USER_AGENT},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    addr = data.get("address", {})
                    state = (
                        addr.get("state")
                        or addr.get("province")
                        or addr.get("region")
                        or "Unknown"
                    )
                    district = (
                        addr.get("state_district")
                        or addr.get("district")
                        or addr.get("county")
                        or addr.get("city")
                        or "Unknown District"
                    )
                    locality = (
                        addr.get("village")
                        or addr.get("town")
                        or addr.get("suburb")
                        or addr.get("neighbourhood")
                        or addr.get("hamlet")
                        or addr.get("road")
                    )
                    road = addr.get("road") or addr.get("highway")

                    is_ner = state in NER_STATES
                    if not is_ner:
                        # Double-check bounding box in case state name format differs
                        bbox_state = cls.check_ner_bounding_box(latitude, longitude)
                        if bbox_state:
                            state = bbox_state
                            is_ner = True

                    return GeocodingResult(
                        latitude=latitude,
                        longitude=longitude,
                        state=state,
                        district=district,
                        locality=locality,
                        road_corridor=road,
                        country=addr.get("country", "India"),
                        is_ner_region=is_ner,
                        provider="OpenStreetMap-Nominatim",
                        raw_address=addr,
                    )
        except Exception as e:
            logger.warning(f"Nominatim reverse geocoding unreachable ({e}); falling back to boundary analysis.")

        # 2. Resilient boundary resolution fallback
        bbox_state = cls.check_ner_bounding_box(latitude, longitude)
        if bbox_state:
            return GeocodingResult(
                latitude=latitude,
                longitude=longitude,
                state=bbox_state,
                district="Regional District (Boundary Derived)",
                locality=None,
                road_corridor=None,
                country="India",
                is_ner_region=True,
                provider="Boundary-Fallback",
                raw_address={},
            )

        # 3. Known Indian non-NER regions fallback check (e.g. South India / Delhi / Western India)
        # 13.0°N, 80.0°E is Chennai, Tamil Nadu
        if 8.0 <= latitude <= 14.0 and 76.0 <= longitude <= 81.0:
            fallback_state = "Tamil Nadu"
            fallback_dist = "Chennai / Thiruvallur"
        elif 28.0 <= latitude <= 29.0 and 76.8 <= longitude <= 77.5:
            fallback_state = "Delhi"
            fallback_dist = "National Capital Region"
        else:
            fallback_state = "Outside Supported Region"
            fallback_dist = "Non-NER"

        return GeocodingResult(
            latitude=latitude,
            longitude=longitude,
            state=fallback_state,
            district=fallback_dist,
            locality=None,
            road_corridor=None,
            country="India",
            is_ner_region=False,
            provider="Coordinate-Region-Fallback",
            raw_address={},
        )
