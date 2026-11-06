"""
Quantum-Safe REST API - Key Management Endpoints

POST /api/keys/generate  - Generate ML-KEM-768 and ML-DSA-65 key pairs
GET  /api/keys/public    - Get a user's public keys
"""
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User, KeyPair, CryptoLog
from app.models.schemas import KeyGenRequest, KeyGenResponse, PublicKeyResponse
from app.services.auth import get_current_user
from app.crypto.kem import generate_kem_keypair
from app.crypto.dsa import generate_dsa_keypair

router = APIRouter(prefix="/api/keys", tags=["Key Management"])


async def _log_operation(db, user_id, operation, algorithm, status, duration_ms, details=""):
    log = CryptoLog(
        user_id=user_id,
        operation=operation,
        algorithm=algorithm,
        status=status,
        duration_ms=str(round(duration_ms, 2)),
        details=details
    )
    db.add(log)
    await db.commit()


@router.post("/generate", response_model=KeyGenResponse,
             summary="Generate post-quantum key pairs (ML-KEM-768 and/or ML-DSA-65)")
async def generate_keys(
    payload: KeyGenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate post-quantum cryptographic key pairs for the authenticated user.
    
    - **algorithm**: `kem` (ML-KEM-768 only), `dsa` (ML-DSA-65 only), or `both` (default)
    
    Keys are stored server-side for demonstration purposes.
    **In production, private keys must never leave the client device.**
    
    Returns public keys (base64). Private keys are stored securely and never exposed via API.
    """
    algo = payload.algorithm.lower()
    if algo not in ("kem", "dsa", "both"):
        raise HTTPException(400, "algorithm must be 'kem', 'dsa', or 'both'")

    response_data = {"message": "Key pair(s) generated successfully"}
    t0 = time.perf_counter()

    if algo in ("kem", "both"):
        pk_b64, sk_b64 = generate_kem_keypair()
        kp = KeyPair(
            user_id=current_user.id,
            algorithm="ML-KEM-768",
            purpose="kem",
            public_key=pk_b64,
            private_key=sk_b64
        )
        db.add(kp)
        await db.flush()
        response_data["kem_public_key"] = pk_b64
        response_data["kem_key_id"] = kp.id

    if algo in ("dsa", "both"):
        pk_b64, sk_b64 = generate_dsa_keypair()
        kp = KeyPair(
            user_id=current_user.id,
            algorithm="ML-DSA-65",
            purpose="dsa",
            public_key=pk_b64,
            private_key=sk_b64
        )
        db.add(kp)
        await db.flush()
        response_data["dsa_public_key"] = pk_b64
        response_data["dsa_key_id"] = kp.id

    await db.commit()
    duration_ms = (time.perf_counter() - t0) * 1000
    await _log_operation(db, current_user.id, "keygen", algo.upper(), "success", duration_ms,
                         f"Generated {algo} key pair(s)")

    return KeyGenResponse(**response_data)


@router.get("/public", response_model=PublicKeyResponse,
            summary="Get a user's public keys by username")
async def get_public_keys(
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the latest public keys for any registered user.
    Public keys can be fetched without authentication — they are meant to be shared.
    
    - **username**: The username to look up
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, f"User '{username}' not found")

    # Get latest KEM key
    kem_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == user.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    kem_kp = kem_result.scalar_one_or_none()

    # Get latest DSA key
    dsa_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == user.id, KeyPair.purpose == "dsa")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    dsa_kp = dsa_result.scalar_one_or_none()

    return PublicKeyResponse(
        user_id=user.id,
        username=user.username,
        kem_public_key=kem_kp.public_key if kem_kp else None,
        dsa_public_key=dsa_kp.public_key if dsa_kp else None
    )

