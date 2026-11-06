"""
Quantum-Safe REST API - Traditional Cryptography (RSA-2048, ECDH, ECDSA)

Implements traditional algorithms for benchmarking and comparison purposes.
Uses Python's `cryptography` library.
"""

import time
import base64
from cryptography.hazmat.primitives.asymmetric import rsa, ec, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric.ec import (
    ECDH, SECP384R1, ECDSA
)
from cryptography.hazmat.backends import default_backend


# ---------------------------------------------------------------------------
# RSA-2048
# ---------------------------------------------------------------------------

def rsa_keygen():
    """Generate RSA-2048 key pair."""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    public_key = private_key.public_key()
    return private_key, public_key


def rsa_public_key_size(public_key) -> int:
    """Return RSA public key size in bytes (DER encoding)."""
    return len(public_key.public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo
    ))


def rsa_private_key_size(private_key) -> int:
    """Return RSA private key size in bytes (DER encoding)."""
    return len(private_key.private_bytes(
        serialization.Encoding.DER,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))


# ---------------------------------------------------------------------------
# ECDH with P-384
# ---------------------------------------------------------------------------

def ecdh_keygen():
    """Generate ECDH P-384 key pair."""
    private_key = ec.generate_private_key(SECP384R1(), default_backend())
    return private_key, private_key.public_key()


def ecdh_shared_secret(private_key, peer_public_key) -> bytes:
    """Compute ECDH shared secret."""
    return private_key.exchange(ECDH(), peer_public_key)


# ---------------------------------------------------------------------------
# ECDSA with P-384
# ---------------------------------------------------------------------------

def ecdsa_keygen():
    """Generate ECDSA P-384 key pair (same curve as ECDH for comparison)."""
    private_key = ec.generate_private_key(SECP384R1(), default_backend())
    return private_key, private_key.public_key()


def ecdsa_sign(private_key, message: bytes) -> bytes:
    """Sign message with ECDSA-P384-SHA256."""
    return private_key.sign(message, ECDSA(hashes.SHA256()))


def ecdsa_verify(public_key, message: bytes, signature: bytes) -> bool:
    """Verify ECDSA signature."""
    try:
        public_key.verify(signature, message, ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Benchmark Traditional Crypto
# ---------------------------------------------------------------------------

def benchmark_traditional() -> dict:
    """
    Benchmark RSA-2048, ECDH-P384, ECDSA-P384.
    Returns measured timings (ms) averaged over multiple iterations.
    NOTE: All measurements are actual runtime values.
    """
    iterations = 10
    test_msg = b"Traditional cryptography benchmark message for comparison"

    # --- RSA-2048 ---
    times_rsa_keygen = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        rsa_priv, rsa_pub = rsa_keygen()
        times_rsa_keygen.append((time.perf_counter() - t0) * 1000)

    # RSA encrypt (OAEP) — acts as key transport
    times_rsa_enc = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        rsa_pub.encrypt(b"32-byte-secret-key-placeholder!!", padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        ))
        times_rsa_enc.append((time.perf_counter() - t0) * 1000)

    rsa_pub_size = rsa_public_key_size(rsa_pub)
    rsa_priv_size = rsa_private_key_size(rsa_priv)

    # --- ECDH-P384 ---
    times_ecdh_keygen = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ecdh_priv, ecdh_pub = ecdh_keygen()
        times_ecdh_keygen.append((time.perf_counter() - t0) * 1000)

    # Peer keys for exchange
    peer_priv, peer_pub = ecdh_keygen()
    times_ecdh_exchange = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ecdh_shared_secret(ecdh_priv, peer_pub)
        times_ecdh_exchange.append((time.perf_counter() - t0) * 1000)

    ecdh_pub_size = len(ecdh_pub.public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    ))
    ecdh_priv_size = len(ecdh_priv.private_bytes(
        serialization.Encoding.DER,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))

    # --- ECDSA-P384 ---
    times_ecdsa_keygen = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ecdsa_priv, ecdsa_pub = ecdsa_keygen()
        times_ecdsa_keygen.append((time.perf_counter() - t0) * 1000)

    times_ecdsa_sign = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        sig = ecdsa_sign(ecdsa_priv, test_msg)
        times_ecdsa_sign.append((time.perf_counter() - t0) * 1000)

    times_ecdsa_verify = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        ecdsa_verify(ecdsa_pub, test_msg, sig)
        times_ecdsa_verify.append((time.perf_counter() - t0) * 1000)

    ecdsa_pub_size = len(ecdsa_pub.public_bytes(
        serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo
    ))
    ecdsa_priv_size = len(ecdsa_priv.private_bytes(
        serialization.Encoding.DER,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()
    ))

    return {
        "iterations": iterations,
        "rsa_2048": {
            "keygen_ms_avg": round(sum(times_rsa_keygen) / iterations, 3),
            "encrypt_ms_avg": round(sum(times_rsa_enc) / iterations, 3),
            "public_key_size_bytes": rsa_pub_size,
            "private_key_size_bytes": rsa_priv_size,
        },
        "ecdh_p384": {
            "keygen_ms_avg": round(sum(times_ecdh_keygen) / iterations, 3),
            "exchange_ms_avg": round(sum(times_ecdh_exchange) / iterations, 3),
            "public_key_size_bytes": ecdh_pub_size,
            "private_key_size_bytes": ecdh_priv_size,
        },
        "ecdsa_p384": {
            "keygen_ms_avg": round(sum(times_ecdsa_keygen) / iterations, 3),
            "sign_ms_avg": round(sum(times_ecdsa_sign) / iterations, 3),
            "verify_ms_avg": round(sum(times_ecdsa_verify) / iterations, 3),
            "public_key_size_bytes": ecdsa_pub_size,
            "private_key_size_bytes": ecdsa_priv_size,
            "signature_size_bytes": len(sig),
        },
    }

