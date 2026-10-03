"""External data source adapters."""

from app.adapters.base import ExternalDataAdapter, IngestionResult, SourceAccessStatus
from app.adapters.canonical_schemas import (
    CanonicalInclinometerTelemetry,
    CanonicalInSARDeformation,
    CanonicalOpticalObservation,
    CanonicalPrecipitationObservation,
    CanonicalSoilMoistureObservation,
)
from app.adapters.copernicus_insar_adapter import CopernicusInSARAdapter
from app.adapters.imd_rainfall_adapter import IMDRainfallAdapter
from app.adapters.iot_inclinometer_adapter import IoTInclinometerAdapter
from app.adapters.soil_moisture_adapter import SoilMoistureAdapter

__all__ = [
    "ExternalDataAdapter",
    "IngestionResult",
    "SourceAccessStatus",
    "CanonicalPrecipitationObservation",
    "CanonicalSoilMoistureObservation",
    "CanonicalOpticalObservation",
    "CanonicalInSARDeformation",
    "CanonicalInclinometerTelemetry",
    "IMDRainfallAdapter",
    "SoilMoistureAdapter",
    "CopernicusInSARAdapter",
    "IoTInclinometerAdapter",
]
