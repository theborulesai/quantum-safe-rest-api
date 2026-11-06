"""
Quantum-Safe REST API - KEM (Key Encapsulation Mechanism) Endpoints

POST /api/kem/encapsulate  - Encapsulate a shared secret using recipient's ML-KEM-768 public key
POST /api/kem/decapsulate  - Decapsulate a shared secret using the current user's ML-KEM-768 private key
"""
import time
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User, KeyPair, CryptoLog
from app.models.schemas import EncapsulateRequest, EncapsulateResponse, DecapsulateRequest, DecapsulateResponse
from app.services.auth import get_current_user
from app.crypto.kem import encapsulate, decapsulate

router = APIRouter(prefix="/api/kem", tags=["Key Encapsulation (ML-KEM-768)"])


@router.post("/encapsulate", response_model=EncapsulateResponse,
             summary="Encapsulate a shared secret using recipient's ML-KEM-768 public key")
async def kem_encapsulate(
    payload: EncapsulateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform ML-KEM-768 key encapsulation.

    **Security protocol:**
    1. Fetches the recipient's ML-KEM-768 public key from the database.
    2. Generates a random shared secret and KEM ciphertext.
    3. The shared secret is derived locally — it is **never transmitted**.
    4. Returns the KEM ciphertext (safe to transmit) and a SHA-256 hash of the
       local shared secret (for verification only — does not reveal the secret).
    
    The recipient must call `/api/kem/decapsulate` with the KEM ciphertext
    to independently recover the same shared secret.
    """
    # Look up recipient
    result = await db.execute(select(User).where(User.username == payload.recipient_username))
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, f"User '{payload.recipient_username}' not found")
    if recipient.id == current_user.id:
        raise HTTPException(400, "Cannot encapsulate to yourself in this demo")

    # Get recipient's latest KEM public key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == recipient.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    kem_kp = kp_result.scalar_one_or_none()
    if not kem_kp:
        raise HTTPException(404, f"User '{payload.recipient_username}' has no ML-KEM-768 public key. "
                                 "Ask them to call /api/keys/generate first.")

    t0 = time.perf_counter()
    kem_ciphertext_b64, shared_secret = encapsulate(kem_kp.public_key)
    duration_ms = (time.perf_counter() - t0) * 1000

    # Hash the shared secret for verification (safe to reveal — hash is one-way)
    secret_hash = hashlib.sha256(shared_secret).hexdigest()

    # Log
    log = CryptoLog(
        user_id=current_user.id,
        operation="encapsulate",
        algorithm="ML-KEM-768",
        status="success",
        duration_ms=str(round(duration_ms, 2)),
        details=f"Encapsulated for {payload.recipient_username}"
    )
    db.add(log)
    await db.commit()

    return EncapsulateResponse(
        kem_ciphertext=kem_ciphertext_b64,
        shared_secret_hash=secret_hash,
        algorithm="ML-KEM-768"
    )


@router.post("/decapsulate", response_model=DecapsulateResponse,
             summary="Decapsulate a KEM ciphertext to recover the shared secret")
async def kem_decapsulate(
    payload: DecapsulateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform ML-KEM-768 decapsulation.

    **Security protocol:**
    1. Uses the authenticated user's ML-KEM-768 private key.
    2. Decapsulates the provided KEM ciphertext to recover the shared secret.
    3. The shared secret stays on the server (or client) — never transmitted.
    4. Returns a SHA-256 hash of the recovered secret for cross-party verification.
    
    If the sender and recipient's hashes match, the same shared secret was established.
    """
    # Get current user's latest KEM private key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == current_user.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    kem_kp = kp_result.scalar_one_or_none()
    if not kem_kp:
        raise HTTPException(404, "You have no ML-KEM-768 key pair. Call /api/keys/generate first.")

    t0 = time.perf_counter()
    try:
        shared_secret = decapsulate(kem_kp.private_key, payload.kem_ciphertext)
        duration_ms = (time.perf_counter() - t0) * 1000
        secret_hash = hashlib.sha256(shared_secret).hexdigest()
        success = True
        status_str = "success"
    except Exception as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        secret_hash = ""
        success = False
        status_str = "failure"

    log = CryptoLog(
        user_id=current_user.id,
        operation="decapsulate",
        algorithm="ML-KEM-768",
        status=status_str,
        duration_ms=str(round(duration_ms, 2)),
        details="Decapsulation " + ("succeeded" if success else "failed")
    )
    db.add(log)
    await db.commit()

    if not success:
        raise HTTPException(400, "Decapsulation failed — invalid ciphertext or key mismatch")

    return DecapsulateResponse(
        shared_secret_hash=secret_hash,
        algorithm="ML-KEM-768",
        success=True
    )

