"""
Quantum-Safe REST API - Pydantic Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    user_id: int


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Keys
# ---------------------------------------------------------------------------

class KeyGenRequest(BaseModel):
    algorithm: str = Field("both", description="'kem', 'dsa', or 'both'")


class KeyGenResponse(BaseModel):
    kem_public_key: Optional[str] = None
    dsa_public_key: Optional[str] = None
    kem_key_id: Optional[int] = None
    dsa_key_id: Optional[int] = None
    message: str


class PublicKeyResponse(BaseModel):
    user_id: int
    username: str
    kem_public_key: Optional[str]
    dsa_public_key: Optional[str]


# ---------------------------------------------------------------------------
# KEM
# ---------------------------------------------------------------------------

class EncapsulateRequest(BaseModel):
    recipient_username: str = Field(..., description="Username of the key holder")


class EncapsulateResponse(BaseModel):
    kem_ciphertext: str = Field(..., description="KEM ciphertext (base64) — send to recipient")
    shared_secret_hash: str = Field(..., description="SHA-256 of local shared secret for verification")
    algorithm: str = "ML-KEM-768"


class DecapsulateRequest(BaseModel):
    kem_ciphertext: str = Field(..., description="KEM ciphertext received from sender (base64)")


class DecapsulateResponse(BaseModel):
    shared_secret_hash: str = Field(..., description="SHA-256 of decapsulated shared secret")
    algorithm: str = "ML-KEM-768"
    success: bool


# ---------------------------------------------------------------------------
# Encrypt / Decrypt
# ---------------------------------------------------------------------------

class EncryptRequest(BaseModel):
    plaintext: str = Field(..., description="Message to encrypt")
    recipient_username: str = Field(..., description="Recipient — their KEM public key is used")


class EncryptResponse(BaseModel):
    nonce: str
    ciphertext: str
    kem_ciphertext: str
    algorithm: str = "AES-256-GCM + ML-KEM-768"


class DecryptRequest(BaseModel):
    nonce: str
    ciphertext: str
    kem_ciphertext: str


class DecryptResponse(BaseModel):
    plaintext: str
    algorithm: str = "AES-256-GCM + ML-KEM-768"
    decryption_success: bool = True


# ---------------------------------------------------------------------------
# Sign / Verify
# ---------------------------------------------------------------------------

class SignRequest(BaseModel):
    message: str = Field(..., description="Message to sign")


class SignResponse(BaseModel):
    signature: str
    message_hash: str
    algorithm: str = "ML-DSA-65"


class VerifyRequest(BaseModel):
    signer_username: str
    message: str
    signature: str


class VerifyResponse(BaseModel):
    valid: bool
    algorithm: str = "ML-DSA-65"
    message: str


# ---------------------------------------------------------------------------
# Secure Messaging
# ---------------------------------------------------------------------------

class SendMessageRequest(BaseModel):
    recipient_username: str
    plaintext: str = Field(..., description="Plaintext message (will be encrypted server-side for demo)")


class MessageOut(BaseModel):
    id: int
    sender_username: str
    recipient_username: str
    is_verified: bool
    is_tampered: bool
    created_at: datetime
    # Note: ciphertext returned (not plaintext) unless you are the recipient
    ciphertext_preview: str


class SecureMessageDetail(BaseModel):
    id: int
    sender_username: str
    plaintext: str
    is_verified: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Crypto Log
# ---------------------------------------------------------------------------

class CryptoLogOut(BaseModel):
    id: int
    operation: str
    algorithm: str
    status: str
    duration_ms: Optional[str]
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Security Status
# ---------------------------------------------------------------------------

class SecurityStatus(BaseModel):
    pqc_active: bool
    kem_algorithm: str
    dsa_algorithm: str
    symmetric_algorithm: str
    kdf_algorithm: str
    transport: str
    quantum_resistance: str
    nist_standards: List[str]


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------

class BenchmarkResponse(BaseModel):
    pqc: dict
    traditional: dict
    comparison_notes: List[str]

