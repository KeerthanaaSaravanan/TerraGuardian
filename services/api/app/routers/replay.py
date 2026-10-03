"""Demonstration Event Replay API Router.

Enables judges and evaluators to step through the July 2024 West Kameng
monsoon crisis chronologically from baseline through statutory authorization
and physical confirmation.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Path, Query, status

from app.services.replay_engine_service import ReplayEngineService

router = APIRouter(prefix="/replay", tags=["Demonstration Event Replay Engine"])


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Get current state and full timeline of demonstration replay scenario",
)
async def get_replay_status() -> dict[str, Any]:
    """Retrieve the current replay timeline step, environmental metrics, and governance states."""
    return ReplayEngineService.get_status()


@router.post(
    "/step",
    status_code=status.HTTP_200_OK,
    summary="Advance or reverse replay scenario step-by-step",
)
async def step_replay(
    direction: str = Query("forward", description="Step direction: 'forward' (next) or 'backward' (prev)"),
) -> dict[str, Any]:
    """Advance or step backward through the deterministic crisis scenario."""
    if direction.lower() in ("backward", "prev", "back"):
        return ReplayEngineService.step_backward()
    return ReplayEngineService.step_forward()


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset replay scenario back to T0 baseline",
)
async def reset_replay() -> dict[str, Any]:
    """Reset the replay timeline to step 0 (T0 Pre-Monsoon Baseline)."""
    return ReplayEngineService.reset()


@router.post(
    "/jump/{step_index}",
    status_code=status.HTTP_200_OK,
    summary="Jump directly to specific step index (0 to 5)",
)
async def jump_replay(
    step_index: int = Path(..., ge=0, le=5, description="Target timeline step index"),
) -> dict[str, Any]:
    """Jump directly to T0 (0), T3 (1), T6 (2), T8 (3), T10 (4), or T14 (5)."""
    return ReplayEngineService.jump_to_step(step_index)
