"""Canonical observation schemas for normalized multi-modal data domains."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import Field

from app.adapters.base import CanonicalObservation


class CanonicalPrecipitationObservation(CanonicalObservation):
    """Canonical schema for meteorological rainfall and automated weather station telemetry."""
    station_id: str
    station_name: Optional[str] = None
    rainfall_1h_mm: float = Field(ge=0.0, le=500.0, description="1-hour cumulative precipitation in mm")
    rainfall_3h_mm: Optional[float] = Field(default=None, ge=0.0, le=1000.0, description="3-hour cumulative precipitation in mm")
    rainfall_6h_mm: Optional[float] = Field(default=None, ge=0.0, le=1500.0, description="6-hour cumulative precipitation in mm")
    rainfall_24h_mm: Optional[float] = Field(default=None, ge=0.0, le=2000.0, description="24-hour cumulative precipitation in mm")
    rainfall_72h_mm: Optional[float] = Field(default=None, ge=0.0, le=3000.0, description="72-hour cumulative precipitation in mm")
    rainfall_7d_mm: Optional[float] = Field(default=None, ge=0.0, le=5000.0, description="7-day cumulative precipitation in mm")
    antecedent_rainfall_index_7d: Optional[float] = Field(default=None, ge=0.0, le=5000.0, description="ARI-7 antecedent index with exponential decay")
    rainfall_intensity_rate_mm_hr: float = Field(ge=0.0, le=500.0, description="Instantaneous rain rate in mm/hr")
    anomaly_pct_vs_normal: Optional[float] = Field(default=None, description="Precipitation anomaly relative to monsoon baseline")
    temperature_c: Optional[float] = Field(default=None, ge=-40.0, le=60.0)
    relative_humidity_pct: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    wind_speed_mps: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    data_quality_flag: str = "VALID"  # VALID | SUSPECT | ESTIMATED | SENSOR_FAILURE


class CanonicalSoilMoistureObservation(CanonicalObservation):
    """Canonical schema for in-situ TDR/FDR sensors, SMAP satellite, and ERA5 soil moisture."""
    sensor_id: str
    sensor_type: str = "TDR_PROBE"  # TDR_PROBE | FDR_PROBE | SMAP_SATELLITE | ERA5_REANALYSIS
    depth_layer_cm: str = "0-10"    # 0-10 | 10-40 | 40-100
    volumetric_water_content_m3_m3: float = Field(ge=0.0, le=0.75, description="Volumetric soil water content in m3/m3")
    soil_saturation_index: float = Field(ge=0.0, le=1.0, description="Normalized saturation index from 0.0 (dry) to 1.0 (saturated)")
    matric_suction_kpa: Optional[float] = Field(default=None, ge=0.0, le=1500.0, description="Soil matric potential / suction in kPa")
    soil_temperature_c: Optional[float] = Field(default=None, ge=-20.0, le=60.0)
    rate_of_change_pct_hr: Optional[float] = Field(default=None, description="Hourly rate of saturation change")
    data_quality_flag: str = "VALID"


class CanonicalOpticalObservation(CanonicalObservation):
    """Canonical schema for Sentinel-2 / Landsat optical remote sensing."""
    satellite_mission: str = "Sentinel-2"
    cloud_cover_pct: float = Field(ge=0.0, le=100.0, description="Cloud / fog obscuration percentage")
    ndvi_vegetation_index: Optional[float] = Field(default=None, ge=-1.0, le=1.0, description="Normalized Difference Vegetation Index")
    scarp_exposure_index: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Bare soil / scarp exposure index")
    scene_id: Optional[str] = None


class CanonicalInclinometerTelemetry(CanonicalObservation):
    """Canonical schema for in-situ MEMS borehole tilt and geotechnical displacement sensors."""
    sensor_id: str
    depth_meters: float = Field(ge=0.0, le=150.0, description="Borehole depth of measurement in meters")
    tilt_axis_x_deg: float = Field(ge=-45.0, le=45.0, description="X-axis inclination in degrees")
    tilt_axis_y_deg: float = Field(ge=-45.0, le=45.0, description="Y-axis inclination in degrees")
    displacement_rate_mm_day: float = Field(ge=-500.0, le=500.0, description="Computed daily deformation vector in mm/day")
    cumulative_displacement_mm: float = Field(ge=-2000.0, le=2000.0, description="Total shear displacement in mm")
    battery_voltage_v: Optional[float] = Field(default=None, ge=0.0, le=15.0)
    temperature_internal_c: Optional[float] = Field(default=None, ge=-30.0, le=70.0)
    stuck_value_flag: bool = False


class CanonicalInSARDeformation(CanonicalObservation):
    """Canonical schema for multi-temporal Synthetic Aperture Radar surface deformation measurements."""
    satellite_mission: str = "Sentinel-1"  # Sentinel-1 | NISAR | ALOS-2
    orbit_direction: str = "DESCENDING"    # ASCENDING | DESCENDING
    relative_orbit: Optional[int] = None
    coherence: float = Field(ge=0.0, le=1.0, description="Interferometric phase coherence (0.0 to 1.0)")
    line_of_sight_velocity_mm_yr: float = Field(ge=-1000.0, le=1000.0, description="LOS ground velocity in mm/year")
    velocity_standard_error_mm_yr: float = Field(ge=0.0, le=50.0)
    reference_point_id: Optional[str] = None
    baseline_days: int = Field(ge=1, le=100, description="Temporal baseline between interferometric pairs")

