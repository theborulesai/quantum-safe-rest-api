"""
Quantum-Safe REST API - AES-256-GCM Symmetric Encryption

Uses Python's `cryptography` library (pyca/cryptography).
Implements authenticated encryption with HKDF-SHA-256 key derivation.

AES-256-GCM provides:
  - Confidentiality (AES-256)
  - Integrity / Authentication (GCM tag, 16 bytes)
  - Nonce-based (12 bytes random nonce per message)
"""

import os
import base64
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend


def derive_aes_key(shared_secret: bytes, context: bytes = b"quantum-safe-aes-key") -> bytes:
    """
    Derive a 32-byte AES-256-GCM key from a shared secret using HKDF-SHA-256.
    
    Args:
        shared_secret: Raw shared secret from ML-KEM decapsulation (32 bytes).
        context: Optional context info for domain separation.
    Returns:
        32-byte AES key.
    """
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=context,
        backend=default_backend()
    )
    return hkdf.derive(shared_secret)


def encrypt_message(aes_key: bytes, plaintext: bytes, additional_data: bytes = b"") -> tuple[str, str]:
    """
    Encrypt plaintext using AES-256-GCM.
    
    Args:
        aes_key: 32-byte AES key.
        plaintext: Message bytes to encrypt.
        additional_data: Authenticated Additional Data (AAD) — authenticated but not encrypted.
    Returns:
        (nonce_b64, ciphertext_b64) — nonce must be sent alongside ciphertext.
        The GCM tag is appended to ciphertext automatically by the library.
    """
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(aes_key)
    ciphertext_with_tag = aesgcm.encrypt(nonce, plaintext, additional_data or None)
    return base64.b64encode(nonce).decode(), base64.b64encode(ciphertext_with_tag).decode()


def decrypt_message(aes_key: bytes, nonce_b64: str, ciphertext_b64: str, additional_data: bytes = b"") -> bytes:
    """
    Decrypt AES-256-GCM ciphertext and verify authentication tag.
    
    Args:
        aes_key: 32-byte AES key.
        nonce_b64: Base64 nonce used during encryption.
        ciphertext_b64: Base64 ciphertext (includes GCM tag).
        additional_data: Must match the AAD used during encryption.
    Returns:
        Decrypted plaintext bytes.
    Raises:
        cryptography.exceptions.InvalidTag if authentication fails (tampered data).
    """
    nonce = base64.b64decode(nonce_b64)
    ciphertext_with_tag = base64.b64decode(ciphertext_b64)
    aesgcm = AESGCM(aes_key)
    return aesgcm.decrypt(nonce, ciphertext_with_tag, additional_data or None)


def hash_sha256(data: bytes) -> str:
    """Compute SHA-256 hash, return hex string."""
    return hashlib.sha256(data).hexdigest()


def hash_sha3_256(data: bytes) -> str:
    """Compute SHA3-256 hash, return hex string."""
    return hashlib.sha3_256(data).hexdigest()

