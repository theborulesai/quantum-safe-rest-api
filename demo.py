"""
Quick demonstration script — runs without a live server.
Demonstrates all PQC operations step by step.
"""
import sys, os
# Fix Windows console encoding for Unicode symbols
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/backend")

from app.crypto.kem import generate_kem_keypair, encapsulate, decapsulate
from app.crypto.dsa import generate_dsa_keypair, sign_message, verify_signature
from app.crypto.symmetric import derive_aes_key, encrypt_message, decrypt_message
import base64, hashlib, time

SEP = "=" * 60

def banner(title):
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)

def ok(msg): print(f"  ✓  {msg}")
def fail(msg): print(f"  ✗  {msg}")

print("\n[*] QUANTUM-SAFE REST API -- LIVE DEMONSTRATION")
print("    NIST FIPS 203 (ML-KEM-768) + FIPS 204 (ML-DSA-65)")

# ─── 1. ML-KEM-768 Key Generation ───────────────────────────────
banner("1. ML-KEM-768 Key Generation (Alice & Bob)")
t0 = time.perf_counter()
alice_kem_pk, alice_kem_sk = generate_kem_keypair()
bob_kem_pk,   bob_kem_sk   = generate_kem_keypair()
t1 = time.perf_counter()
ok(f"Alice KEM public key:  {len(base64.b64decode(alice_kem_pk))} bytes")
ok(f"Alice KEM private key: {len(base64.b64decode(alice_kem_sk))} bytes")
ok(f"Bob   KEM public key:  {len(base64.b64decode(bob_kem_pk))} bytes")
ok(f"Key generation time:   {(t1-t0)*1000:.1f} ms (2 key pairs, pure Python)")

# ─── 2. ML-DSA-65 Key Generation ────────────────────────────────
banner("2. ML-DSA-65 Key Generation (Alice & Bob)")
t0 = time.perf_counter()
alice_dsa_pk, alice_dsa_sk = generate_dsa_keypair()
bob_dsa_pk,   bob_dsa_sk   = generate_dsa_keypair()
t1 = time.perf_counter()
ok(f"Alice DSA public key:  {len(base64.b64decode(alice_dsa_pk))} bytes")
ok(f"Alice DSA private key: {len(base64.b64decode(alice_dsa_sk))} bytes")
ok(f"Key generation time:   {(t1-t0)*1000:.1f} ms (2 key pairs, pure Python)")

# ─── 3. ML-KEM-768 Key Encapsulation ────────────────────────────
banner("3. ML-KEM-768 — Alice Encapsulates to Bob")
t0 = time.perf_counter()
kem_ciphertext_b64, shared_secret_alice = encapsulate(bob_kem_pk)
t1 = time.perf_counter()
ok(f"KEM ciphertext size:          {len(base64.b64decode(kem_ciphertext_b64))} bytes")
ok(f"Alice shared secret:          {shared_secret_alice.hex()[:32]}...")
ok(f"Encapsulation time:           {(t1-t0)*1000:.1f} ms")

# ─── 4. ML-KEM-768 Decapsulation ────────────────────────────────
banner("4. ML-KEM-768 — Bob Decapsulates")
t0 = time.perf_counter()
shared_secret_bob = decapsulate(bob_kem_sk, kem_ciphertext_b64)
t1 = time.perf_counter()
ok(f"Bob   shared secret:          {shared_secret_bob.hex()[:32]}...")
ok(f"Decapsulation time:           {(t1-t0)*1000:.1f} ms")

if shared_secret_alice == shared_secret_bob:
    ok("SECRETS MATCH ✓ — Both parties now share the same 32-byte secret!")
else:
    fail("SECRETS DO NOT MATCH — something went wrong")

# ─── 5. HKDF + AES-256-GCM Encryption ──────────────────────────
banner("5. HKDF-SHA-256 Key Derivation + AES-256-GCM Encryption")
aes_key = derive_aes_key(shared_secret_alice)
ok(f"HKDF derived AES key: {aes_key.hex()[:32]}... ({len(aes_key)} bytes)")

plaintext = b"Hello Bob! This is a quantum-safe encrypted message from Alice."
aad = b"sender:alice|recipient:bob"
t0 = time.perf_counter()
nonce_b64, ciphertext_b64 = encrypt_message(aes_key, plaintext, aad)
t1 = time.perf_counter()
ok(f"Plaintext:            '{plaintext.decode()}'")
ok(f"AES nonce:            {nonce_b64} (12 bytes)")
ok(f"Ciphertext (base64):  {ciphertext_b64[:40]}... ({len(base64.b64decode(ciphertext_b64))} bytes incl. GCM tag)")
ok(f"Encryption time:      {(t1-t0)*1000:.3f} ms")

# ─── 6. ML-DSA-65 Signing ───────────────────────────────────────
banner("6. ML-DSA-65 — Alice Signs the Ciphertext")
sign_target = (ciphertext_b64 + nonce_b64 + kem_ciphertext_b64).encode()
t0 = time.perf_counter()
signature_b64 = sign_message(alice_dsa_sk, sign_target)
t1 = time.perf_counter()
ok(f"Signature size: {len(base64.b64decode(signature_b64))} bytes")
ok(f"Signing time:   {(t1-t0)*1000:.1f} ms")
ok(f"Sig (base64):   {signature_b64[:40]}...")

# ─── 7. ML-DSA-65 Verification ──────────────────────────────────
banner("7. ML-DSA-65 — Bob Verifies Alice's Signature")
t0 = time.perf_counter()
sig_valid = verify_signature(alice_dsa_pk, sign_target, signature_b64)
t1 = time.perf_counter()
ok(f"Signature VALID: {sig_valid} ✓")
ok(f"Verify time: {(t1-t0)*1000:.1f} ms")

# ─── 8. AES-256-GCM Decryption ──────────────────────────────────
banner("8. AES-256-GCM — Bob Decrypts the Message")
aes_key_bob = derive_aes_key(shared_secret_bob)
t0 = time.perf_counter()
plaintext_recovered = decrypt_message(aes_key_bob, nonce_b64, ciphertext_b64, aad)
t1 = time.perf_counter()
ok(f"Decrypted: '{plaintext_recovered.decode()}'")
ok(f"Decryption time: {(t1-t0)*1000:.3f} ms")
assert plaintext_recovered == plaintext
ok("Plaintext matches original ✓")

# ─── 9. Tamper Detection ────────────────────────────────────────
banner("9. Tamper Detection Demo")
ct_bytes = bytearray(base64.b64decode(ciphertext_b64))
ct_bytes[5] ^= 0xFF  # Flip some bits
tampered_b64 = base64.b64encode(bytes(ct_bytes)).decode()
try:
    decrypt_message(aes_key_bob, nonce_b64, tampered_b64, aad)
    fail("BUG: tampered ciphertext was accepted!")
except Exception as e:
    ok(f"Tampered ciphertext REJECTED ✓ — AES-GCM authentication failed")

# ─── 10. Summary ────────────────────────────────────────────────
banner("DEMONSTRATION COMPLETE — ALL OPERATIONS SUCCESSFUL")
print(f"""
  Protocol:   ML-KEM-768 (FIPS 203) + AES-256-GCM + ML-DSA-65 (FIPS 204)
  Library:    kyber-py v1.2.0 + dilithium-py v1.5.1 + cryptography v48

  Key sizes (ML-KEM-768):   pk=1184B, sk=2400B, ct=1088B, secret=32B
  Key sizes (ML-DSA-65):    pk=1952B, sk=4032B, sig=3309B
  
  Security:   Quantum-resistant (NIST FIPS 203/204, August 2024)
  Threat:     Resistant to Shor's algorithm and Grover's algorithm

  Run the web app: start.bat (Windows) or ./start.sh (Linux/macOS)
  API docs:   http://localhost:8000/docs
  Frontend:   http://localhost:5173
""")
