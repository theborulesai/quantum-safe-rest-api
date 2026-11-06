"""
Quantum-Safe REST API - ML-KEM-768 (Post-Quantum Key Encapsulation Mechanism)

Uses kyber-py library which implements the NIST-standardized ML-KEM-768 (FIPS 203).
ML-KEM-768 replaces the earlier Kyber-768 submission with minor tweaks per NIST's
finalization process.

Key sizes:
  - Public key:  1184 bytes
  - Private key: 2400 bytes
  - Ciphertext:  1088 bytes
  - Shared key:    32 bytes
"""

import base64
import time
from kyber_py.ml_kem import ML_KEM_768


def generate_kem_keypair() -> tuple[str, str]:
    """
    Generate an ML-KEM-768 key pair.
    Returns (public_key_b64, private_key_b64).
    """
    pk, sk = ML_KEM_768.keygen()
    return base64.b64encode(pk).decode(), base64.b64encode(sk).decode()


def encapsulate(public_key_b64: str) -> tuple[str, bytes]:
    """
    Encapsulate a shared secret using the recipient's public key.
    Returns (ciphertext_b64, shared_secret_bytes).
    The shared_secret_bytes must NOT be transmitted; it stays local.
    """
    pk = base64.b64decode(public_key_b64)
    shared_secret, ciphertext = ML_KEM_768.encaps(pk)
    return base64.b64encode(ciphertext).decode(), shared_secret


def decapsulate(private_key_b64: str, ciphertext_b64: str) -> bytes:
    """
    Decapsulate to recover the shared secret from a ciphertext.
    Returns shared_secret_bytes.
    """
    sk = base64.b64decode(private_key_b64)
    ct = base64.b64decode(ciphertext_b64)
    shared_secret = ML_KEM_768.decaps(sk, ct)
    return shared_secret


def benchmark_kem() -> dict:
    """Benchmark ML-KEM-768 operations (key gen, encaps, decaps)."""
    iterations = 10

    # Key generation
    times_keygen = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        pk, sk = ML_KEM_768.keygen()
        times_keygen.append((time.perf_counter() - t0) * 1000)

    # Encapsulation
    times_encaps = []
    pk_last = pk
    for _ in range(iterations):
        t0 = time.perf_counter()
        _, ct = ML_KEM_768.encaps(pk_last)
        times_encaps.append((time.perf_counter() - t0) * 1000)

    # Decapsulation
    shared_key, ct = ML_KEM_768.encaps(pk_last)
    times_decaps = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ML_KEM_768.decaps(sk, ct)
        times_decaps.append((time.perf_counter() - t0) * 1000)

    return {
        "algorithm": "ML-KEM-768",
        "standard": "NIST FIPS 203",
        "public_key_size_bytes": 1184,
        "private_key_size_bytes": 2400,
        "ciphertext_size_bytes": 1088,
        "shared_secret_size_bytes": 32,
        "keygen_ms_avg": round(sum(times_keygen) / iterations, 3),
        "encaps_ms_avg": round(sum(times_encaps) / iterations, 3),
        "decaps_ms_avg": round(sum(times_decaps) / iterations, 3),
        "iterations": iterations,
    }

