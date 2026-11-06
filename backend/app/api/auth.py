"""
Quantum-Safe REST API - Authentication & User Management Endpoints

POST /api/register  - Register a new user
POST /api/login     - Authenticate and get JWT token
GET  /api/me        - Get current user profile
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models import User
from app.models.schemas import UserRegister, UserLogin, Token, UserOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=201,
             summary="Register a new user account")
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """
    Create a new user account.
    
    - **username**: 3–50 characters, must be unique
    - **email**: valid email, must be unique
    - **password**: minimum 6 characters (bcrypt hashed)
    """
    # Check username exists
    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already registered")

    # Check email exists
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token, summary="Login and obtain a JWT access token")
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Authenticate and return a JWT bearer token.
    Use the token in the `Authorization: Bearer <token>` header for protected endpoints.
    """
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return Token(access_token=access_token, token_type="bearer",
                 username=user.username, user_id=user.id)


@router.get("/me", response_model=UserOut, summary="Get current user profile")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user's profile."""
    return current_user

