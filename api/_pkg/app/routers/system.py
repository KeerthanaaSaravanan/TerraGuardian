"""System & Operational Model Metadata Router.

Exposes authoritative backend operational status, model capabilities,
and truthful validation metadata without hardcoded claims.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

router = APIRouter(prefix="/system", tags=["System & Model Metadata"])


class FeatureWeight(BaseModel):
    name: str
    weight: float
    description: str
    threshold: Optional[str] = None


class RegionalCoverageItem(BaseModel):
    region: str
    state: str
    status: str  # GEOGRAPHICALLY_GROUNDED_FIXTURE | INTEGRATION_READY_NO_LOCAL_FEED | NO_LIVE_FEED
    details: str


class SystemModelMetadata(BaseModel):
    active_model_name: str = "Deterministic Heuristic Baseline"
    model_version: str = "heuristic-v1.0"
    model_type: str = "DETERMINISTIC_HEURISTIC"
    training_status: str = "UNTRAINED_HEURISTIC"
    calibration_status: str = "UNVALIDATED_PRIOR"
    validation_status: str = "NOT_VALIDATED"
    validation_dataset: Optional[str] = None
    evaluation_metric: Optional[str] = None
    evaluation_value: Optional[float] = None
    evaluation_timestamp: Optional[str] = None
    methodology_note: str = (
        "Deterministic physical slope-stability and antecedent precipitation heuristic. "
        "Ground truth validation has not been performed against historical landslide catalogs. "
        "Empirical calibration is scheduled for Phase 5 data fabric integration."
    )
    active_features: list[FeatureWeight] = Field(default_factory=list)
    regional_coverage: list[RegionalCoverageItem] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


@router.get(
    "/model-metadata",
    response_model=SystemModelMetadata,
    status_code=status.HTTP_200_OK,
    summary="Retrieve authoritative, truthful model metadata and operational coverage",
)
async def get_system_model_metadata() -> SystemModelMetadata:
    """Return truthful system model metadata without unsupported claims (TG-002)."""
    return SystemModelMetadata(
        active_features=[
            FeatureWeight(
                name="antecedent_rainfall_7d_mm",
                weight=0.35,
                description="7-day cumulative rainfall from IMD AWS",
                threshold="> 120mm triggers saturation alert",
            ),
            FeatureWeight(
                name="slope_gradient_deg",
                weight=0.30,
                description="Terrain slope angle derived from SRTM DEM 30m (Horn finite-difference)",
                threshold="> 32° represents critical shear angle",
            ),
            FeatureWeight(
                name="geological_susceptibility",
                weight=0.20,
                description="Lithological susceptibility basemap (GSI NLSM)",
                threshold="Zone IV weathered mica-schist",
            ),
            FeatureWeight(
                name="soil_saturation_index",
                weight=0.15,
                description="Hydrological saturation index derived from rainfall/porosity ratio",
                threshold="> 0.80 indicates near-pore-water-pressure failure",
            ),
        ],
        regional_coverage=[
            RegionalCoverageItem(
                region="West Kameng (NH-13 Corridor)",
                state="Arunachal Pradesh",
                status="GEOGRAPHICALLY_GROUNDED_FIXTURE",
                details="Active demonstration corridor with grounded terrain fixtures",
            ),
            RegionalCoverageItem(
                region="Tawang District",
                state="Arunachal Pradesh",
                status="INTEGRATION_READY_NO_LOCAL_FEED",
                details="Awaiting local sensor telemetry",
            ),
            RegionalCoverageItem(
                region="East Kameng District",
                state="Arunachal Pradesh",
                status="INTEGRATION_READY_NO_LOCAL_FEED",
                details="Awaiting local sensor telemetry",
            ),
            RegionalCoverageItem(
                region="Papum Pare District",
                state="Arunachal Pradesh",
                status="INTEGRATION_READY_NO_LOCAL_FEED",
                details="Awaiting local sensor telemetry",
            ),
            RegionalCoverageItem(
                region="Assam Border Corridor",
                state="Assam",
                status="NO_LIVE_FEED",
                details="NER corridor coverage planned for Phase 5",
            ),
            RegionalCoverageItem(
                region="Sikkim NH-10 Corridor",
                state="Sikkim",
                status="NO_LIVE_FEED",
                details="NER corridor coverage planned for Phase 5",
            ),
            RegionalCoverageItem(
                region="Nagaland Trans-Highway",
                state="Nagaland",
                status="NO_LIVE_FEED",
                details="NER corridor coverage planned for Phase 5",
            ),
            RegionalCoverageItem(
                region="Meghalaya Shillong Bypass",
                state="Meghalaya",
                status="NO_LIVE_FEED",
                details="NER corridor coverage planned for Phase 5",
            ),
        ],
    )
