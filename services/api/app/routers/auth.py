"""Authoritative Authentication Router."""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import UserModel
from app.db.session import get_db_session
from app.services.auth_service import (
    AuthService,
    create_access_token,
    require_authenticated_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    """Payload to authenticate user and receive bearer token."""
    username: str
    password: str


class UserResponse(BaseModel):
    """Sanitized user identity representation. Password hash is strictly excluded."""
    id: uuid.UUID
    username: str
    email: str
    full_name: str
    role: str
    agency: Optional[str] = None
    badge_number: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """JWT bearer token response."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    session: AsyncSession = Depends(get_db_session),
) -> TokenResponse:
    """Authenticate with username or email and password."""
    auth_service = AuthService(session)
    user = await auth_service.authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        user_id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name,
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: UserModel = Depends(require_authenticated_user),
) -> UserResponse:
    """Retrieve the currently authenticated user's server-verified profile."""
    return UserResponse.model_validate(current_user)


@router.post("/seed-demo-users", response_model=list[UserResponse], status_code=status.HTTP_200_OK)
async def seed_demo_users_endpoint(
    session: AsyncSession = Depends(get_db_session),
) -> list[UserResponse]:
    """Seed or update deterministic demonstration accounts (LOCAL / DEMO ONLY)."""
    if settings.environment == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo user seeding is strictly prohibited in production environments.",
        )
    auth_service = AuthService(session)
    users = await auth_service.seed_demo_users()
    return [UserResponse.model_validate(u) for u in users]
