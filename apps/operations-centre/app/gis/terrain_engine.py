"""Authoritative Terrain Analysis Engine using Copernicus GLO-30 DEM.

Computes exact elevation, slope (Horn 1981 finite difference), aspect, and corridor statistics
from real 30m Digital Elevation Model rasters with full geodetic cell scaling.
"""

from __future__ import annotations

import math
import os
from pathlib import Path
from typing import Any, Optional
import numpy as np
import tifffile


DEM_FILE_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "dem" / "Copernicus_GLO_30_N27_E092.tif"


class TerrainEngine:
    """Scientific terrain computation engine backed by Copernicus GLO-30 DEM."""

    def __init__(self, raster_path: Optional[Path] = None):
        self.raster_path = raster_path or DEM_FILE_PATH
        self._elevation_data: Optional[np.ndarray] = None
        self._tile_bounds = {
            "min_lat": 27.0,
            "max_lat": 28.0,
            "min_lon": 92.0,
            "max_lon": 93.0,
        }
        self._rows = 3600
        self._cols = 3600
        self._cellsize_deg = 1.0 / 3600.0  # 1 arcsecond (~30m)

    def is_dem_available(self) -> bool:
        """Check whether the real DEM raster file exists on disk."""
        return self.raster_path.is_file()

    def _load_raster_if_needed(self) -> None:
        """Lazy load the raster array into memory."""
        if self._elevation_data is None:
            if not self.is_dem_available():
                raise FileNotFoundError(
                    f"Copernicus DEM raster not found at {self.raster_path}. "
                    "Run data acquisition pipeline first."
                )
            with tifffile.TiffFile(str(self.raster_path)) as tif:
                self._elevation_data = tif.pages[0].asarray()

    def coord_to_pixel(self, latitude: float, longitude: float) -> tuple[int, int]:
        """Convert WGS 84 geographic coordinates to raster row and column indices."""
        if not (self._tile_bounds["min_lat"] <= latitude <= self._tile_bounds["max_lat"]):
            raise ValueError(
                f"Latitude {latitude} outside DEM coverage [{self._tile_bounds['min_lat']}, {self._tile_bounds['max_lat']}]"
            )
        if not (self._tile_bounds["min_lon"] <= longitude <= self._tile_bounds["max_lon"]):
            raise ValueError(
                f"Longitude {longitude} outside DEM coverage [{self._tile_bounds['min_lon']}, {self._tile_bounds['max_lon']}]"
            )

        # Copernicus DEM row 0 is max_lat (28.0°N), col 0 is min_lon (92.0°E)
        row = int(round((self._tile_bounds["max_lat"] - latitude) / self._cellsize_deg))
        col = int(round((longitude - self._tile_bounds["min_lon"]) / self._cellsize_deg))

        # Clamp to valid array bounds
        row = max(0, min(self._rows - 1, row))
        col = max(0, min(self._cols - 1, col))
        return row, col

    def get_elevation_meters(self, latitude: float, longitude: float) -> float:
        """Extract MSL elevation in meters for a point from the DEM."""
        self._load_raster_if_needed()
        assert self._elevation_data is not None
        row, col = self.coord_to_pixel(latitude, longitude)
        val = float(self._elevation_data[row, col])
        return round(val, 2)

    def compute_terrain_derivatives(
        self, latitude: float, longitude: float
    ) -> dict[str, Any]:
        """Derive elevation, Horn (1981) slope, and aspect at given coordinates.

        Mathematical Formulation:
        - 3x3 finite-difference convolution window.
        - Geodetic cell dimensions:
            dy = 111320 * (1/3600) meters (~30.92 m)
            dx = 111320 * cos(lat) * (1/3600) meters (~27.53 m at 27.08°N)
        - Horn slope:
            dz/dx = ((c + 2f + i) - (a + 2d + g)) / (8 * dx)
            dz/dy = ((g + 2h + i) - (a + 2b + c)) / (8 * dy)
            slope = arctan(sqrt((dz/dx)^2 + (dz/dy)^2))
        """
        self._load_raster_if_needed()
        assert self._elevation_data is not None

        row, col = self.coord_to_pixel(latitude, longitude)

        # Ensure 3x3 window is within bounds
        r_start = max(0, row - 1)
        r_end = min(self._rows, row + 2)
        c_start = max(0, col - 1)
        c_end = min(self._cols, col + 2)

        window = self._elevation_data[r_start:r_end, c_start:c_end]
        if window.shape != (3, 3):
            # Fallback for border edge
            elev = float(self._elevation_data[row, col])
            return {
                "elevation_m": round(elev, 2),
                "slope_degrees": 0.0,
                "aspect_degrees": 0.0,
                "cell_resolution_dx_m": 30.0,
                "cell_resolution_dy_m": 30.0,
                "derivation_algorithm": "Horn (1981) 3x3 Finite Difference (Border Edge Fallback)",
                "provenance_class": "REAL_HISTORICAL",
                "source_dataset": "Copernicus GLO-30 DEM (30m COG)",
            }

        # Geodetic cell size in meters
        dy = 111320.0 / 3600.0
        dx = (111320.0 * math.cos(math.radians(latitude))) / 3600.0

        a, b, c = float(window[0, 0]), float(window[0, 1]), float(window[0, 2])
        d, e, f = float(window[1, 0]), float(window[1, 1]), float(window[1, 2])
        g, h, i = float(window[2, 0]), float(window[2, 1]), float(window[2, 2])

        dz_dx = ((c + 2.0 * f + i) - (a + 2.0 * d + g)) / (8.0 * dx)
        dz_dy = ((g + 2.0 * h + i) - (a + 2.0 * b + c)) / (8.0 * dy)

        slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
        slope_deg = math.degrees(slope_rad)

        aspect_rad = math.atan2(-dz_dy, dz_dx)
        aspect_deg = (math.degrees(aspect_rad) + 360.0) % 360.0

        return {
            "latitude": latitude,
            "longitude": longitude,
            "elevation_m": round(e, 2),
            "slope_degrees": round(slope_deg, 2),
            "aspect_degrees": round(aspect_deg, 1),
            "cell_resolution_dx_m": round(dx, 2),
            "cell_resolution_dy_m": round(dy, 2),
            "dz_dx": round(dz_dx, 4),
            "dz_dy": round(dz_dy, 4),
            "derivation_algorithm": "Horn (1981) 3x3 Finite Difference",
            "provenance_class": "REAL_HISTORICAL",
            "source_dataset": "Copernicus GLO-30 DEM (30m COG, Tile N27E092)",
        }

    def compute_corridor_slope_stats(
        self, latitude: float, longitude: float, buffer_pixels: int = 7
    ) -> dict[str, float]:
        """Compute slope distribution statistics in a spatial window around coordinates."""
        self._load_raster_if_needed()
        assert self._elevation_data is not None

        row, col = self.coord_to_pixel(latitude, longitude)
        r_min = max(0, row - buffer_pixels)
        r_max = min(self._rows, row + buffer_pixels + 1)
        c_min = max(0, col - buffer_pixels)
        c_max = min(self._cols, col + buffer_pixels + 1)

        sub = self._elevation_data[r_min:r_max, c_min:c_max]
        dy = 111320.0 / 3600.0
        dx = (111320.0 * math.cos(math.radians(latitude))) / 3600.0

        slopes: list[float] = []
        for r in range(1, sub.shape[0] - 1):
            for c in range(1, sub.shape[1] - 1):
                w = sub[r - 1 : r + 2, c - 1 : c + 2]
                dz_dx = ((w[0, 2] + 2 * w[1, 2] + w[2, 2]) - (w[0, 0] + 2 * w[1, 0] + w[2, 0])) / (8.0 * dx)
                dz_dy = ((w[2, 0] + 2 * w[2, 1] + w[2, 2]) - (w[0, 0] + 2 * w[0, 1] + w[0, 2])) / (8.0 * dy)
                s_deg = math.degrees(math.atan(math.sqrt(dz_dx**2 + dz_dy**2)))
                slopes.append(s_deg)

        if not slopes:
            return {"min_slope": 0.0, "max_slope": 0.0, "mean_slope": 0.0, "median_slope": 0.0}

        arr = np.array(slopes)
        return {
            "min_slope": round(float(arr.min()), 2),
            "max_slope": round(float(arr.max()), 2),
            "mean_slope": round(float(arr.mean()), 2),
            "median_slope": round(float(np.median(arr)), 2),
        }
