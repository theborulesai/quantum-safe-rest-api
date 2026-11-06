"""
Quantum-Safe REST API - Comprehensive Test Suite

Tests cover:
  1.  User registration and authentication
  2.  Key generation
  3.  ML-KEM-768 encapsulation and decapsulation
  4.  AES-256-GCM encryption and decryption
  5.  ML-DSA-65 signing and verification
  6.  Invalid signature detection
  7.  Tampered ciphertext detection
  8.  Invalid API request rejection
  9.  Unauthorized access rejection
  10. End-to-end secure messaging

Run with:
    cd backend
    python -m pytest app/tests/test_api.py -v

NOTE: ML-KEM-768 and ML-DSA-65 operations use pure-Python reference
implementations; key generation/signing may each take 1-30 seconds.
"""

import pytest
import asyncio
import os
import base64
import hashlib

# ------------------------------------------------------------------ environment
# Must be set BEFORE importing app so it uses the test database
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_quantum_v2.db"

from httpx import AsyncClient, ASGITransport  # noqa: E402
from app.main import app  # noqa: E402
from app.core.database import init_db, engine  # noqa: E402

# ------------------------------------------------------------------ constants
ALICE = {"username": "alice_test", "email": "alice@test.com", "password": "alice_pass123"}
BOB   = {"username": "bob_test",   "email": "bob@test.com",   "password": "bob_pass123"}

DB_PATH = "test_quantum_v2.db"

# ------------------------------------------------------------------ shared state (populated by setup)
_state: dict = {}


# ================================================================== SETUP
# pytest-asyncio 1.x (asyncio_mode=auto, asyncio_default_fixture_loop_scope=session):
# - Do NOT define a custom event_loop fixture — it conflicts with the auto-managed session loop.
# - Session-scoped async fixtures just work when asyncio_default_fixture_loop_scope=session.

def _get_client():
    """Return a configured ASGI test client (used as context manager)."""
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture(scope="session")
async def client():
    """Session-scoped async client + DB initialization."""
    # Clean up any leftover DB from previous runs
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    await init_db()

    async with _get_client() as c:
        # Register both users (ignore 400 if already exists from prior partial run)
        await c.post("/api/register", json=ALICE)
        await c.post("/api/register", json=BOB)
        yield c

    # Teardown: dispose engine to release SQLite file lock, then delete
    await engine.dispose()
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)


async def _login(c: AsyncClient, creds: dict) -> str:
    r = await c.post("/api/login", json={"username": creds["username"], "password": creds["password"]})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["access_token"]


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ================================================================== 1. HEALTH
@pytest.mark.asyncio
async def test_root_health(client):
    r = await client.get("/")
    assert r.status_code == 200
    d = r.json()
    assert d["pqc_active"] is True
    assert "ML-KEM-768" in d["algorithms"]["kem"]


# ================================================================== 2. REGISTRATION
@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    """Duplicate username rejected with 400."""
    r = await client.post("/api/register", json=ALICE)
    assert r.status_code == 400
    assert "already registered" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_short_password(client):
    """Password shorter than 6 chars rejected with 422."""
    r = await client.post("/api/register",
                          json={"username": "shortpw_user", "email": "s@x.com", "password": "12"})
    assert r.status_code == 422


# ================================================================== 3. AUTHENTICATION
@pytest.mark.asyncio
async def test_login_success(client):
    r = await client.post("/api/login",
                          json={"username": ALICE["username"], "password": ALICE["password"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    r = await client.post("/api/login",
                          json={"username": ALICE["username"], "password": "wrongpassword"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauthorized_no_token(client):
    r = await client.post("/api/keys/generate", json={"algorithm": "both"})
    # HTTPBearer returns 401 (missing credentials) or 403 — both are acceptable
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_invalid_jwt_token(client):
    r = await client.get("/api/me", headers={"Authorization": "Bearer bad.token.xyz"})
    assert r.status_code == 401


# ================================================================== 4. KEY GENERATION
@pytest.mark.asyncio
async def test_key_generation_alice(client):
    """ML-KEM-768 + ML-DSA-65 key generation for Alice."""
    token = await _login(client, ALICE)
    r = await client.post("/api/keys/generate",
                          json={"algorithm": "both"},
                          headers=auth_header(token))
    assert r.status_code == 200
    d = r.json()
    assert "kem_public_key" in d
    assert "dsa_public_key" in d
    # ML-KEM-768 public key is 1184 bytes → base64 is ~1580 chars
    pk_bytes = base64.b64decode(d["kem_public_key"])
    assert len(pk_bytes) == 1184, f"Expected 1184B KEM pk, got {len(pk_bytes)}"
    _state["alice_kem_pk"] = d["kem_public_key"]


@pytest.mark.asyncio
async def test_key_generation_bob(client):
    """ML-KEM-768 + ML-DSA-65 key generation for Bob."""
    token = await _login(client, BOB)
    r = await client.post("/api/keys/generate",
                          json={"algorithm": "both"},
                          headers=auth_header(token))
    assert r.status_code == 200
    d = r.json()
    assert "kem_public_key" in d


@pytest.mark.asyncio
async def test_get_public_keys_alice(client):
    r = await client.get(f"/api/keys/public?username={ALICE['username']}")
    assert r.status_code == 200
    d = r.json()
    assert d["username"] == ALICE["username"]
    assert d["kem_public_key"] is not None


@pytest.mark.asyncio
async def test_get_public_keys_nonexistent(client):
    r = await client.get("/api/keys/public?username=no_such_user_xyz")
    assert r.status_code == 404


# ================================================================== 5. KEM
@pytest.mark.asyncio
async def test_kem_encapsulate_decapsulate(client):
    """Alice encapsulates using Bob's key; Bob decapsulates — secrets must match."""
    alice_tok = await _login(client, ALICE)
    bob_tok   = await _login(client, BOB)

    # Alice encapsulates using Bob's KEM public key
    r_enc = await client.post("/api/kem/encapsulate",
                              json={"recipient_username": BOB["username"]},
                              headers=auth_header(alice_tok))
    assert r_enc.status_code == 200, r_enc.text
    enc = r_enc.json()
    assert "kem_ciphertext" in enc
    assert "shared_secret_hash" in enc
    alice_hash = enc["shared_secret_hash"]

    # Bob decapsulates
    r_dec = await client.post("/api/kem/decapsulate",
                              json={"kem_ciphertext": enc["kem_ciphertext"]},
                              headers=auth_header(bob_tok))
    assert r_dec.status_code == 200, r_dec.text
    dec = r_dec.json()
    assert dec["success"] is True
    bob_hash = dec["shared_secret_hash"]

    # Critical: Both sides must derive the same shared secret
    assert alice_hash == bob_hash, \
        f"Shared secret mismatch!\nAlice: {alice_hash}\nBob:   {bob_hash}"

    # Save for later tests
    _state["kem_ciphertext"] = enc["kem_ciphertext"]


@pytest.mark.asyncio
async def test_kem_invalid_ciphertext(client):
    """Garbage ciphertext must return 400."""
    bob_tok = await _login(client, BOB)
    r = await client.post("/api/kem/decapsulate",
                          json={"kem_ciphertext": "aGVsbG93b3JsZA=="},  # too short
                          headers=auth_header(bob_tok))
    assert r.status_code == 400


# ================================================================== 6. ENCRYPT / DECRYPT
@pytest.mark.asyncio
async def test_encrypt_returns_ciphertext(client):
    """Encrypt a message; returned ciphertext must differ from plaintext."""
    token = await _login(client, ALICE)
    plaintext = "Quantum-safe hello from Alice to Bob!"

    r = await client.post("/api/encrypt",
                          json={"plaintext": plaintext, "recipient_username": BOB["username"]},
                          headers=auth_header(token))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ciphertext"] != plaintext
    assert "nonce" in d
    assert "kem_ciphertext" in d
    _state["encrypt_payload"] = d


@pytest.mark.asyncio
async def test_decrypt_valid_ciphertext(client):
    """Bob should be able to decrypt Alice's ciphertext."""
    if "encrypt_payload" not in _state:
        pytest.skip("encrypt test must run first")

    bob_tok = await _login(client, BOB)
    payload = _state["encrypt_payload"]

    r = await client.post("/api/decrypt",
                          json={
                              "ciphertext":    payload["ciphertext"],
                              "nonce":         payload["nonce"],
                              "kem_ciphertext": payload["kem_ciphertext"],
                          },
                          headers=auth_header(bob_tok))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["plaintext"] == "Quantum-safe hello from Alice to Bob!"
    assert d["decryption_success"] is True


# ================================================================== 7. SIGNATURES
@pytest.mark.asyncio
async def test_sign_verify_valid(client):
    """Alice signs; signature verified with her public key — must be True."""
    token = await _login(client, ALICE)
    msg = "I authorize payment of $500. --Alice"

    r_sign = await client.post("/api/sign", json={"message": msg}, headers=auth_header(token))
    assert r_sign.status_code == 200, r_sign.text
    sig = r_sign.json()["signature"]
    _state["alice_sig"]     = sig
    _state["alice_sig_msg"] = msg

    r_ver = await client.post("/api/verify",
                              json={"signer_username": ALICE["username"],
                                    "message": msg,
                                    "signature": sig})
    assert r_ver.status_code == 200
    assert r_ver.json()["valid"] is True


@pytest.mark.asyncio
async def test_verify_tampered_message(client):
    """Modified message must fail signature verification."""
    if "alice_sig" not in _state:
        pytest.skip("sign test must run first")

    r = await client.post("/api/verify",
                          json={"signer_username": ALICE["username"],
                                "message": "I authorize payment of $999. --Alice",  # tampered
                                "signature": _state["alice_sig"]})
    assert r.status_code == 200
    assert r.json()["valid"] is False


@pytest.mark.asyncio
async def test_verify_wrong_signer(client):
    """Alice's signature attributed to Bob must fail."""
    if "alice_sig" not in _state:
        pytest.skip("sign test must run first")

    r = await client.post("/api/verify",
                          json={"signer_username": BOB["username"],
                                "message": _state["alice_sig_msg"],
                                "signature": _state["alice_sig"]})
    assert r.status_code == 200
    assert r.json()["valid"] is False


@pytest.mark.asyncio
async def test_verify_corrupted_signature(client):
    """Random base64 as signature must fail (not raise 500)."""
    r = await client.post("/api/verify",
                          json={"signer_username": ALICE["username"],
                                "message": "any message at all",
                                "signature": "AAAAAAAAAAAAAAAAAAAAAAAAAAAA=="})
    assert r.status_code == 200
    assert r.json()["valid"] is False


# ================================================================== 8. END-TO-END MESSAGING
@pytest.mark.asyncio
async def test_send_receive_message(client):
    """Alice sends encrypted+signed message; Bob receives and decrypts it."""
    alice_tok = await _login(client, ALICE)
    bob_tok   = await _login(client, BOB)
    plaintext = "Secret quantum-safe message from Alice to Bob!"

    # Send
    r_send = await client.post("/api/messages/send",
                               json={"recipient_username": BOB["username"],
                                     "plaintext": plaintext},
                               headers=auth_header(alice_tok))
    assert r_send.status_code == 200, r_send.text
    send_data = r_send.json()
    assert send_data["encrypted"] is True
    assert send_data["signed"] is True
    msg_id = send_data["message_id"]
    _state["msg_id"] = msg_id

    # Bob inbox
    r_inbox = await client.get("/api/messages", headers=auth_header(bob_tok))
    assert r_inbox.status_code == 200
    assert any(m["id"] == msg_id for m in r_inbox.json())

    # Bob reads and decrypts
    r_read = await client.get(f"/api/messages/{msg_id}", headers=auth_header(bob_tok))
    assert r_read.status_code == 200
    rd = r_read.json()
    assert rd["plaintext"] == plaintext
    assert rd["signature_valid"] is True
    assert rd["decryption_success"] is True
    assert rd["is_tampered"] is False


@pytest.mark.asyncio
async def test_message_access_denied(client):
    """Non-recipient (Alice) cannot read Bob's message."""
    if "msg_id" not in _state:
        pytest.skip("messaging test must run first")

    alice_tok = await _login(client, ALICE)
    r = await client.get(f"/api/messages/{_state['msg_id']}", headers=auth_header(alice_tok))
    assert r.status_code == 403


# ================================================================== 9. SECURITY STATUS
@pytest.mark.asyncio
async def test_security_status(client):
    r = await client.get("/api/security/status")
    assert r.status_code == 200
    d = r.json()
    assert d["pqc_active"] is True
    assert "ML-KEM-768" in d["kem_algorithm"]
    assert "ML-DSA-65" in d["dsa_algorithm"]


# ================================================================== 10. CRYPTO UNIT TESTS
# These run standalone (no DB needed) and test the crypto modules directly.

@pytest.mark.asyncio
async def test_ml_kem_768_unit():
    """ML-KEM-768 keygen → encaps → decaps roundtrip."""
    from app.crypto.kem import generate_kem_keypair, encapsulate, decapsulate

    pk_b64, sk_b64 = generate_kem_keypair()
    pk = base64.b64decode(pk_b64)
    sk = base64.b64decode(sk_b64)
    assert len(pk) == 1184, f"Expected pk=1184B, got {len(pk)}"
    assert len(sk) == 2400, f"Expected sk=2400B, got {len(sk)}"

    ct_b64, secret1 = encapsulate(pk_b64)
    ct = base64.b64decode(ct_b64)
    assert len(ct) == 1088, f"Expected ct=1088B, got {len(ct)}"
    assert len(secret1) == 32

    secret2 = decapsulate(sk_b64, ct_b64)
    assert secret1 == secret2, "Shared secrets must match after encaps/decaps"


@pytest.mark.asyncio
async def test_ml_dsa_65_unit():
    """ML-DSA-65 keygen → sign → verify roundtrip."""
    from app.crypto.dsa import generate_dsa_keypair, sign_message, verify_signature

    pk_b64, sk_b64 = generate_dsa_keypair()
    pk = base64.b64decode(pk_b64)
    sk = base64.b64decode(sk_b64)
    assert len(pk) == 1952, f"Expected pk=1952B, got {len(pk)}"
    assert len(sk) == 4032, f"Expected sk=4032B, got {len(sk)}"

    msg = b"Unit test message for ML-DSA-65"
    sig_b64 = sign_message(sk_b64, msg)
    sig = base64.b64decode(sig_b64)
    assert len(sig) == 3309, f"Expected sig=3309B, got {len(sig)}"

    assert verify_signature(pk_b64, msg, sig_b64) is True
    assert verify_signature(pk_b64, b"different message", sig_b64) is False


@pytest.mark.asyncio
async def test_aes_gcm_unit():
    """AES-256-GCM encrypt → decrypt roundtrip + tamper detection."""
    from app.crypto.symmetric import derive_aes_key, encrypt_message, decrypt_message

    secret = bytes(range(32))
    key = derive_aes_key(secret)
    assert len(key) == 32

    pt = b"AES-256-GCM test message - authenticated encryption"
    nonce_b64, ct_b64 = encrypt_message(key, pt)
    decrypted = decrypt_message(key, nonce_b64, ct_b64)
    assert decrypted == pt, "Decrypted plaintext must match original"

    # Flip one bit in the ciphertext — AEAD must detect this
    ct_bytes = bytearray(base64.b64decode(ct_b64))
    ct_bytes[10] ^= 0xFF
    tampered = base64.b64encode(bytes(ct_bytes)).decode()
    with pytest.raises(Exception):
        decrypt_message(key, nonce_b64, tampered)
