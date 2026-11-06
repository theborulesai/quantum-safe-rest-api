"""
Quantum-Safe REST API - Encrypt / Decrypt Endpoints

POST /api/encrypt  - Encrypt a plaintext message using AES-256-GCM + ML-KEM-768
POST /api/decrypt  - Decrypt a ciphertext using AES-256-GCM + ML-KEM-768
"""
import time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User, KeyPair, CryptoLog
from app.models.schemas import EncryptRequest, EncryptResponse, DecryptRequest, DecryptResponse
from app.services.auth import get_current_user
from app.crypto.kem import encapsulate, decapsulate
from app.crypto.symmetric import derive_aes_key, encrypt_message, decrypt_message

router = APIRouter(prefix="/api", tags=["Encryption (AES-256-GCM + ML-KEM-768)"])


@router.post("/encrypt", response_model=EncryptResponse,
             summary="Encrypt a message using AES-256-GCM with ML-KEM-768 key establishment")
async def encrypt(
    payload: EncryptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    **Full hybrid encryption workflow:**
    
    1. Fetches recipient's ML-KEM-768 public key.
    2. Performs ML-KEM-768 encapsulation → KEM ciphertext + shared secret.
    3. Derives AES-256-GCM key from shared secret using HKDF-SHA-256.
    4. Encrypts the plaintext with AES-256-GCM (random 96-bit nonce).
    5. Returns: KEM ciphertext + AES nonce + AES ciphertext.
    
    **What is transmitted:** KEM ciphertext, AES nonce, AES ciphertext (all safe).
    **What stays local:** Plaintext shared secret (never transmitted).
    
    The recipient decrypts by decapsulating the KEM ciphertext to recover the same
    shared secret, then uses it to decrypt the AES ciphertext.
    """
    # Lookup recipient
    result = await db.execute(select(User).where(User.username == payload.recipient_username))
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, f"User '{payload.recipient_username}' not found")

    # Get recipient's KEM public key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == recipient.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    kem_kp = kp_result.scalar_one_or_none()
    if not kem_kp:
        raise HTTPException(404, f"Recipient has no KEM key pair. They must call /api/keys/generate first.")

    t0 = time.perf_counter()

    # Step 1: ML-KEM-768 encapsulation
    kem_ct_b64, shared_secret = encapsulate(kem_kp.public_key)

    # Step 2: HKDF-SHA-256 key derivation
    aes_key = derive_aes_key(shared_secret)

    # Step 3: AES-256-GCM encryption
    # Use empty AAD so the recipient can decrypt without knowing the sender
    plaintext_bytes = payload.plaintext.encode("utf-8")
    nonce_b64, ciphertext_b64 = encrypt_message(aes_key, plaintext_bytes)

    duration_ms = (time.perf_counter() - t0) * 1000

    # Log
    log = CryptoLog(
        user_id=current_user.id,
        operation="encrypt",
        algorithm="AES-256-GCM+ML-KEM-768",
        status="success",
        duration_ms=str(round(duration_ms, 2)),
        details=f"Encrypted message for {payload.recipient_username}"
    )
    db.add(log)
    await db.commit()

    return EncryptResponse(
        nonce=nonce_b64,
        ciphertext=ciphertext_b64,
        kem_ciphertext=kem_ct_b64,
        algorithm="AES-256-GCM + ML-KEM-768 (HKDF-SHA-256)"
    )


@router.post("/decrypt", response_model=DecryptResponse,
             summary="Decrypt a ciphertext using AES-256-GCM with ML-KEM-768 decapsulation")
async def decrypt(
    payload: DecryptRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    **Full hybrid decryption workflow:**
    
    1. Uses the authenticated user's ML-KEM-768 private key.
    2. Decapsulates the KEM ciphertext → recovers shared secret.
    3. Derives the same AES-256-GCM key using HKDF-SHA-256.
    4. Decrypts and authenticates the ciphertext.
    
    If the ciphertext has been tampered with, AES-GCM authentication will fail
    and an error is returned. This demonstrates integrity protection.
    """
    # Get current user's KEM private key
    kp_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == current_user.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    kem_kp = kp_result.scalar_one_or_none()
    if not kem_kp:
        raise HTTPException(404, "You have no KEM key pair. Call /api/keys/generate first.")

    t0 = time.perf_counter()
    try:
        # Step 1: ML-KEM-768 decapsulation
        shared_secret = decapsulate(kem_kp.private_key, payload.kem_ciphertext)

        # Step 2: HKDF-SHA-256 key derivation
        aes_key = derive_aes_key(shared_secret)

        # Step 3: AES-256-GCM decryption (empty AAD matches the encrypt endpoint)
        plaintext_bytes = decrypt_message(aes_key, payload.nonce, payload.ciphertext)
        plaintext = plaintext_bytes.decode("utf-8")

        duration_ms = (time.perf_counter() - t0) * 1000
        status_str = "success"

    except Exception as e:
        duration_ms = (time.perf_counter() - t0) * 1000
        log = CryptoLog(
            user_id=current_user.id,
            operation="decrypt",
            algorithm="AES-256-GCM+ML-KEM-768",
            status="failure",
            duration_ms=str(round(duration_ms, 2)),
            details=f"Decryption failed: {str(e)[:100]}"
        )
        db.add(log)
        await db.commit()
        raise HTTPException(400, f"Decryption failed: authentication tag mismatch (tampered data?) — {str(e)}")

    log = CryptoLog(
        user_id=current_user.id,
        operation="decrypt",
        algorithm="AES-256-GCM+ML-KEM-768",
        status=status_str,
        duration_ms=str(round(duration_ms, 2)),
        details="Decryption successful"
    )
    db.add(log)
    await db.commit()

    return DecryptResponse(plaintext=plaintext, algorithm="AES-256-GCM + ML-KEM-768 (HKDF-SHA-256)", decryption_success=True)

