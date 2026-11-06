"""
Quantum-Safe REST API - Digital Signature Endpoints

POST /api/sign    - Sign a message using ML-DSA-65
POST /api/verify  - Verify an ML-DSA-65 signature
"""
import time
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User, KeyPair, CryptoLog
from app.models.schemas import SignRequest, SignResponse, VerifyRequest, VerifyResponse
from app.services.auth import get_current_user
from app.crypto.dsa import sign_message, verify_signature

router = APIRouter(prefix="/api", tags=["Digital Signatures (ML-DSA-65)"])


@router.post("/sign", response_model=SignResponse,
             summary="Sign a message using ML-DSA-65 (post-quantum digital signature)")
async def sign(
    payload: SignRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Sign a message using the authenticated user's ML-DSA-65 private key.
    
    **ML-DSA-65** (NIST FIPS 204) is based on CRYSTALS-Dilithium at security level 3,
    providing quantum-resistant digital signatures.
    
    Returns:
    - **signature**: Base64-encoded ML-DSA-65 signature (3309 bytes)
    - **message_hash**: SHA-256 hash of the signed message
    
    Use the signature and signer's username to verify via `/api/verify`.
    """
    # Get user's latest DSA private key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == current_user.id, KeyPair.purpose == "dsa")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    dsa_kp = kp_result.scalar_one_or_none()
    if not dsa_kp:
        raise HTTPException(404, "You have no ML-DSA-65 key pair. Call /api/keys/generate first.")

    t0 = time.perf_counter()
    message_bytes = payload.message.encode("utf-8")
    signature_b64 = sign_message(dsa_kp.private_key, message_bytes)
    duration_ms = (time.perf_counter() - t0) * 1000

    message_hash = hashlib.sha256(message_bytes).hexdigest()

    log = CryptoLog(
        user_id=current_user.id,
        operation="sign",
        algorithm="ML-DSA-65",
        status="success",
        duration_ms=str(round(duration_ms, 2)),
        details=f"Signed message hash: {message_hash[:16]}..."
    )
    db.add(log)
    await db.commit()

    return SignResponse(
        signature=signature_b64,
        message_hash=message_hash,
        algorithm="ML-DSA-65 (NIST FIPS 204)"
    )


@router.post("/verify", response_model=VerifyResponse,
             summary="Verify an ML-DSA-65 digital signature")
async def verify(
    payload: VerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify an ML-DSA-65 signature against a message and signer's public key.
    
    - **signer_username**: The user who claimed to sign the message
    - **message**: The original plaintext message
    - **signature**: Base64-encoded ML-DSA-65 signature
    
    Returns `valid: true` if the signature is authentic, `false` otherwise.
    An invalid signature could indicate:
    - Message tampering
    - Wrong signer
    - Corrupted signature
    """
    # Look up signer
    result = await db.execute(select(User).where(User.username == payload.signer_username))
    signer = result.scalar_one_or_none()
    if not signer:
        raise HTTPException(404, f"User '{payload.signer_username}' not found")

    # Get signer's latest DSA public key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == signer.id, KeyPair.purpose == "dsa")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    dsa_kp = kp_result.scalar_one_or_none()
    if not dsa_kp:
        # Return invalid instead of 404 — the signature can't be valid without a key
        return VerifyResponse(
            valid=False,
            algorithm="ML-DSA-65 (NIST FIPS 204)",
            message="Signature is INVALID ✗ — signer has no registered public key"
        )

    t0 = time.perf_counter()
    message_bytes = payload.message.encode("utf-8")
    is_valid = verify_signature(dsa_kp.public_key, message_bytes, payload.signature)
    duration_ms = (time.perf_counter() - t0) * 1000

    log = CryptoLog(
        operation="verify",
        algorithm="ML-DSA-65",
        status="success",
        duration_ms=str(round(duration_ms, 2)),
        details=f"Verification result: {'VALID' if is_valid else 'INVALID'} for signer {payload.signer_username}"
    )
    db.add(log)
    await db.commit()

    return VerifyResponse(
        valid=is_valid,
        algorithm="ML-DSA-65 (NIST FIPS 204)",
        message="Signature is valid ✓" if is_valid else "Signature is INVALID ✗ — message may be tampered"
    )

