"""TerraGuardian Intelligence — Visual Evidence Metadata Contracts.

STATUS: DESIGN / FUTURE
RUNTIME: NOT ACTIVE
CURRENT RUNTIME IMPLEMENTATION: Field patrol photographic verification

Defines architectural contracts for visual evidence metadata, provenance, and quality indicators.
Contains ZERO computer vision models and ZERO fabricated inference.
"""

from intelligence.vision.contracts import (
    VisualEvidenceCategory,
    VisualEvidenceMetadataContract,
    VisualEvidenceQuality,
    VisualObservationLocation,
)

__all__ = [
    "VisualEvidenceCategory",
    "VisualEvidenceMetadataContract",
    "VisualEvidenceQuality",
    "VisualObservationLocation",
]
