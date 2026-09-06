"""Incident endpoints (stub).

These endpoints define the API contract for incident operations.
Actual database integration will be added in a later phase.
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.domain.incident import IncidentStatus

router = APIRouter(tags=["incidents"])


# --- Request/Response schemas ---

class IncidentCreate(BaseModel):
    """Schema for creating a new incident."""
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    incident_type: str = "landslide"


class IncidentResponse(BaseModel):
    """Schema for incident API responses."""
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    status: IncidentStatus
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    incident_type: str


class IncidentListResponse(BaseModel):
    """Paginated incident list."""
    items: list[IncidentResponse]
    total: int
    page: int
    page_size: int


# --- Endpoints (stubs — no DB yet) ---

@router.get("/incidents", response_model=IncidentListResponse)
async def list_incidents(
    page: int = 1,
    page_size: int = 20,
    status: Optional[IncidentStatus] = None,
) -> IncidentListResponse:
    """List incidents with optional status filter."""
    # Stub: returns empty list until database is connected
    return IncidentListResponse(items=[], total=0, page=page, page_size=page_size)


@router.get("/incidents/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: uuid.UUID) -> IncidentResponse:
    """Get a single incident by ID."""
    # Stub: no database yet
    raise HTTPException(status_code=404, detail="Incident not found")


@router.post("/incidents", response_model=IncidentResponse, status_code=201)
async def create_incident(body: IncidentCreate) -> IncidentResponse:
    """Create a new incident."""
    # Stub: no database yet
    raise HTTPException(status_code=501, detail="Not implemented — database not connected")
