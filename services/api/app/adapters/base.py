"""Base connector interface for external data sources.

All external API integrations must implement this protocol.
Pattern: FETCH → VALIDATE → NORMALIZE → GEOREFERENCE → TIMESTAMP → PROVENANCE → CACHE → STORE → PUBLISH EVENT
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class DataConnector(ABC):
    """Abstract base class for external data source connectors.

    Subclasses must implement the connector pipeline stages.
    """

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Human-readable name of the data source."""

    @property
    @abstractmethod
    def source_id(self) -> str:
        """Machine identifier for the data source."""

    @abstractmethod
    async def fetch(self, **params: Any) -> Any:
        """Fetch raw data from the external source."""

    @abstractmethod
    async def validate(self, raw_data: Any) -> Any:
        """Validate the raw response structure and content."""

    @abstractmethod
    async def normalize(self, validated_data: Any) -> Any:
        """Normalize into TerraGuardian internal schema."""
