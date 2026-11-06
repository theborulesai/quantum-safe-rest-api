"""
Quantum-Safe REST API - ML-DSA-65 (Post-Quantum Digital Signatures)

Uses dilithium-py library implementing NIST-standardized ML-DSA-65 (FIPS 204).
ML-DSA-65 is based on the CRYSTALS-Dilithium submission, security level 3.

Key sizes:
  - Public key:  1952 bytes
  - Private key: 4032 bytes
  - Signature:   3309 bytes
"""

import base64
import time
from dilithium_py.ml_dsa import ML_DSA_65


def generate_dsa_keypair() -> tuple[str, str]:
    """
    Generate an ML-DSA-65 key pair.
    Returns (public_key_b64, private_key_b64).
    """
    pk, sk = ML_DSA_65.keygen()
    return base64.b64encode(pk).decode(), base64.b64encode(sk).decode()


def sign_message(private_key_b64: str, message: bytes) -> str:
    """
    Sign a message using ML-DSA-65 private key.
    Returns base64-encoded signature.
    """
    sk = base64.b64decode(private_key_b64)
    signature = ML_DSA_65.sign(sk, message)
    return base64.b64encode(signature).decode()


def verify_signature(public_key_b64: str, message: bytes, signature_b64: str) -> bool:
    """
    Verify an ML-DSA-65 signature.
    Returns True if valid, False otherwise.
    """
    try:
        pk = base64.b64decode(public_key_b64)
        sig = base64.b64decode(signature_b64)
        result = ML_DSA_65.verify(pk, message, sig)
        return bool(result)
    except Exception:
        return False


def benchmark_dsa() -> dict:
    """Benchmark ML-DSA-65 operations (key gen, sign, verify)."""
    iterations = 10
    test_message = b"Quantum-safe signature benchmark message"

    # Key generation
    times_keygen = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        pk, sk = ML_DSA_65.keygen()
        times_keygen.append((time.perf_counter() - t0) * 1000)

    # Signing
    times_sign = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        sig = ML_DSA_65.sign(sk, test_message)
        times_sign.append((time.perf_counter() - t0) * 1000)

    # Verification
    times_verify = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ML_DSA_65.verify(pk, test_message, sig)
        times_verify.append((time.perf_counter() - t0) * 1000)

    return {
        "algorithm": "ML-DSA-65",
        "standard": "NIST FIPS 204",
        "public_key_size_bytes": 1952,
        "private_key_size_bytes": 4032,
        "signature_size_bytes": 3309,
        "keygen_ms_avg": round(sum(times_keygen) / iterations, 3),
        "sign_ms_avg": round(sum(times_sign) / iterations, 3),
        "verify_ms_avg": round(sum(times_verify) / iterations, 3),
        "iterations": iterations,
    }

