"""
Quantum-Safe REST API - Secure Messaging Endpoints

POST /api/messages/send  - Send an encrypted, signed message
GET  /api/messages       - List messages (inbox)
GET  /api/messages/{id}  - Retrieve and decrypt a specific message
"""
import time
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import User, KeyPair, Message, CryptoLog
from app.models.schemas import SendMessageRequest, MessageOut, SecureMessageDetail
from app.services.auth import get_current_user
from app.crypto.kem import encapsulate, decapsulate
from app.crypto.dsa import sign_message, verify_signature
from app.crypto.symmetric import derive_aes_key, encrypt_message, decrypt_message

router = APIRouter(prefix="/api/messages", tags=["Secure Messaging"])


@router.post("/send", response_model=dict,
             summary="Send an end-to-end encrypted, ML-DSA-65 signed secure message")
async def send_message(
    payload: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    **Complete secure message transmission workflow:**
    
    1. Fetches recipient's ML-KEM-768 public key.
    2. ML-KEM-768 encapsulation → KEM ciphertext + shared secret.
    3. HKDF-SHA-256 derives AES-256-GCM key from shared secret.
    4. AES-256-GCM encrypts the plaintext message.
    5. ML-DSA-65 signs the ciphertext using sender's private key.
    6. Stores the encrypted, signed message in the database.
    
    The recipient can verify the signature and decrypt using their private key.
    """
    # Validate sender has DSA key (for signing)
    sender_dsa_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == current_user.id, KeyPair.purpose == "dsa")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    sender_dsa = sender_dsa_result.scalar_one_or_none()
    if not sender_dsa:
        raise HTTPException(400, "You need to generate key pairs first. Call /api/keys/generate.")

    # Lookup recipient
    result = await db.execute(select(User).where(User.username == payload.recipient_username))
    recipient = result.scalar_one_or_none()
    if not recipient:
        raise HTTPException(404, f"Recipient '{payload.recipient_username}' not found")
    if recipient.id == current_user.id:
        raise HTTPException(400, "Cannot send message to yourself")

    # Get recipient's KEM public key
    recip_kem_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == recipient.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    recip_kem = recip_kem_result.scalar_one_or_none()
    if not recip_kem:
        raise HTTPException(400, f"Recipient '{payload.recipient_username}' has no KEM key pair. "
                                 "They must call /api/keys/generate first.")

    t0 = time.perf_counter()

    # Step 1-3: ML-KEM-768 + HKDF + AES-256-GCM encryption
    kem_ct_b64, shared_secret = encapsulate(recip_kem.public_key)
    aes_key = derive_aes_key(shared_secret)
    aad = f"sender:{current_user.username}|recipient:{payload.recipient_username}".encode()
    nonce_b64, ciphertext_b64 = encrypt_message(aes_key, payload.plaintext.encode("utf-8"), aad)

    # Step 4: ML-DSA-65 sign the ciphertext
    # We sign the ciphertext (not plaintext) — this is an authenticated encryption approach
    sign_target = (ciphertext_b64 + nonce_b64 + kem_ct_b64).encode("utf-8")
    signature_b64 = sign_message(sender_dsa.private_key, sign_target)

    # Step 5: Store in DB
    msg = Message(
        sender_id=current_user.id,
        recipient_id=recipient.id,
        ciphertext=ciphertext_b64,
        nonce=nonce_b64,
        kem_ciphertext=kem_ct_b64,
        signature=signature_b64,
        is_verified=False,  # recipient must verify
    )
    db.add(msg)
    await db.flush()
    msg_id = msg.id

    duration_ms = (time.perf_counter() - t0) * 1000

    # Log
    log = CryptoLog(
        user_id=current_user.id,
        operation="send_message",
        algorithm="ML-KEM-768+AES-256-GCM+ML-DSA-65",
        status="success",
        duration_ms=str(round(duration_ms, 2)),
        details=f"Message #{msg_id} sent to {payload.recipient_username}"
    )
    db.add(log)
    await db.commit()

    return {
        "message_id": msg_id,
        "status": "sent",
        "encrypted": True,
        "signed": True,
        "algorithms": "ML-KEM-768 + AES-256-GCM (HKDF-SHA-256) + ML-DSA-65",
        "ciphertext_preview": ciphertext_b64[:40] + "...",
        "signature_preview": signature_b64[:40] + "...",
        "duration_ms": round(duration_ms, 2),
    }


@router.get("", response_model=list,
            summary="List received messages (inbox)")
async def list_messages(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Return a list of messages sent to the authenticated user.
    Messages are stored encrypted — ciphertext is shown, not plaintext.
    Use `GET /api/messages/{id}` to decrypt a specific message.
    """
    result = await db.execute(
        select(Message, User.username.label("sender_username"))
        .join(User, User.id == Message.sender_id)
        .where(Message.recipient_id == current_user.id)
        .order_by(Message.id.desc())
    )
    rows = result.all()

    messages = []
    for msg, sender_username in rows:
        messages.append({
            "id": msg.id,
            "sender_username": sender_username,
            "ciphertext_preview": msg.ciphertext[:40] + "...",
            "is_verified": msg.is_verified,
            "is_tampered": msg.is_tampered,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })
    return messages


@router.get("/{message_id}", response_model=dict,
            summary="Retrieve, verify, and decrypt a specific message")
async def get_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    **Full message receive workflow:**
    
    1. Fetch the encrypted message from the database.
    2. Verify the ML-DSA-65 signature against the sender's public key.
    3. Use the authenticated user's ML-KEM-768 private key to decapsulate.
    4. Derive AES key via HKDF-SHA-256.
    5. Decrypt the message with AES-256-GCM.
    
    If signature verification fails, `is_tampered` is marked `true`.
    If the ciphertext has been modified, AES-GCM authentication fails.
    """
    # Fetch message
    msg_result = await db.execute(select(Message).where(Message.id == message_id))
    msg = msg_result.scalar_one_or_none()
    if not msg:
        raise HTTPException(404, "Message not found")
    if msg.recipient_id != current_user.id:
        raise HTTPException(403, "Access denied — this message is not addressed to you")

    # Get sender info
    sender_result = await db.execute(select(User).where(User.id == msg.sender_id))
    sender = sender_result.scalar_one_or_none()

    # Step 1: Verify ML-DSA-65 signature
    sender_dsa_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == msg.sender_id, KeyPair.purpose == "dsa")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    sender_dsa = sender_dsa_result.scalar_one_or_none()

    signature_valid = False
    if sender_dsa:
        sign_target = (msg.ciphertext + msg.nonce + msg.kem_ciphertext).encode("utf-8")
        signature_valid = verify_signature(sender_dsa.public_key, sign_target, msg.signature)

    # Step 2: Get recipient's KEM private key
    recip_kem_result = await db.execute(
        select(KeyPair)
        .where(KeyPair.user_id == current_user.id, KeyPair.purpose == "kem")
        .order_by(KeyPair.id.desc())
        .limit(1)
    )
    recip_kem = recip_kem_result.scalar_one_or_none()
    if not recip_kem:
        raise HTTPException(400, "You have no KEM key pair — cannot decrypt")

    t0 = time.perf_counter()
    try:
        # Step 3-5: Decapsulate → HKDF → AES Decrypt
        shared_secret = decapsulate(recip_kem.private_key, msg.kem_ciphertext)
        aes_key = derive_aes_key(shared_secret)
        aad = f"sender:{sender.username}|recipient:{current_user.username}".encode()
        plaintext_bytes = decrypt_message(aes_key, msg.nonce, msg.ciphertext, aad)
        plaintext = plaintext_bytes.decode("utf-8")
        decrypt_ok = True
    except Exception as e:
        plaintext = f"[DECRYPTION FAILED: {str(e)[:80]}]"
        decrypt_ok = False

    duration_ms = (time.perf_counter() - t0) * 1000

    # Update verification status
    msg.is_verified = signature_valid and decrypt_ok
    msg.is_tampered = not signature_valid or not decrypt_ok
    await db.commit()

    return {
        "id": msg.id,
        "sender_username": sender.username if sender else "unknown",
        "plaintext": plaintext,
        "signature_valid": signature_valid,
        "decryption_success": decrypt_ok,
        "is_tampered": msg.is_tampered,
        "algorithms": "ML-KEM-768 + AES-256-GCM + ML-DSA-65",
        "duration_ms": round(duration_ms, 2),
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }

