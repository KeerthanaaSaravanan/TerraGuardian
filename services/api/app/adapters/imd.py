"""India Meteorological Department (IMD) connector stub.

This is a placeholder demonstrating the connector pattern.
Actual IMD API integration will be implemented in a later phase.
"""

from __future__ import annotations

from typing import Any

from app.adapters.base import DataConnector


class IMDConnector(DataConnector):
    """Connector for IMD weather and rainfall data."""

    @property
    def source_name(self) -> str:
        return "India Meteorological Department"

    @property
    def source_id(self) -> str:
        return "imd"

    async def fetch(self, **params: Any) -> Any:
        raise NotImplementedError("IMD connector not yet implemented.")

    async def validate(self, raw_data: Any) -> Any:
        raise NotImplementedError("IMD connector not yet implemented.")

    async def normalize(self, validated_data: Any) -> Any:
        raise NotImplementedError("IMD connector not yet implemented.")
