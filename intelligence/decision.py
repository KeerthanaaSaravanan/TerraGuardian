"""Decision Support and Next-Best-Information Interface.

Exposes the authoritative DecisionIntelligenceService from the domain services layer.
Ensures zero code duplication.
"""

from __future__ import annotations

import sys
from pathlib import Path

_api_path = Path(__file__).resolve().parent.parent / "services" / "api"
if _api_path.exists() and str(_api_path) not in sys.path:
    sys.path.insert(0, str(_api_path))

from app.domain.decision import DecisionSupportAssessment, NextBestInformationItem
from app.services.decision_intelligence import DecisionIntelligenceService

__all__ = [
    "DecisionIntelligenceService",
    "DecisionSupportAssessment",
    "NextBestInformationItem",
]
