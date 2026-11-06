# 🔐 Quantum-Safe REST API

> **Academic Project** — Post-Quantum Cryptography Demonstration  
> Build a Simple Networked Application and Develop Quantum-Safe REST APIs

---

## Overview

A complete, functional demonstration of **post-quantum cryptographic algorithms** protecting REST API communication against quantum computing attacks. Uses **NIST-standardized ML-KEM-768 (FIPS 203)** and **ML-DSA-65 (FIPS 204)** algorithms.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Tailwind CSS v3 + Recharts | Cybersecurity Dashboard UI |
| Backend | Python 3.12 + FastAPI | REST API Server |
| PQC KEM | ML-KEM-768 (kyber-py v1.2.0) | Key Encapsulation (FIPS 203) |
| PQC DSA | ML-DSA-65 (dilithium-py v1.5.1) | Digital Signatures (FIPS 204) |
| Symmetric | AES-256-GCM (cryptography v48) | Authenticated Encryption |
| KDF | HKDF-SHA-256 | Key Derivation (RFC 5869) |
| Auth | JWT (python-jose) + bcrypt | User Authentication |
| DB | SQLite + SQLAlchemy (async) | Data Storage |

## Cryptographic Key Sizes

| Algorithm | Public Key | Private Key | CT/Sig | Shared Secret |
|-----------|-----------|-------------|--------|---------------|
| ML-KEM-768 | 1,184 B | 2,400 B | 1,088 B | 32 B |
| ML-DSA-65 | 1,952 B | 4,032 B | 3,309 B (sig) | — |
| ECDH-P384 | ~120 B | ~185 B | — | 48 B |
| ECDSA-P384 | ~120 B | ~185 B | ~72 B (sig) | — |
| RSA-2048 | ~294 B | ~1,220 B | — | — |

## Quick Start

### Prerequisites
- Python 3.10+ 
- Node.js 18+
- npm or pnpm

### 1. Backend Setup

```bash
cd quantum-safe-rest-api/backend

# Install dependencies
pip install -r requirements.txt

# Create .env from example
copy .env.example .env

# Run server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: http://localhost:8000  
Swagger UI docs: http://localhost:8000/docs  
ReDoc: http://localhost:8000/redoc

### 2. Frontend Setup

```bash
cd quantum-safe-rest-api/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend at: http://localhost:5173

### 3. Run Tests

```bash
cd quantum-safe-rest-api/backend
python -m pytest app/tests/test_api.py -v
```

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/register` | Register new user | No |
| POST | `/api/login` | Login → JWT token | No |
| GET | `/api/me` | Current user | Yes |
| POST | `/api/keys/generate` | Generate ML-KEM-768 + ML-DSA-65 keys | Yes |
| GET | `/api/keys/public` | Get user's public keys | No |
| POST | `/api/kem/encapsulate` | ML-KEM-768 encapsulate | Yes |
| POST | `/api/kem/decapsulate` | ML-KEM-768 decapsulate | Yes |
| POST | `/api/encrypt` | AES-256-GCM + ML-KEM-768 encrypt | Yes |
| POST | `/api/decrypt` | Decrypt message | Yes |
| POST | `/api/sign` | ML-DSA-65 sign | Yes |
| POST | `/api/verify` | ML-DSA-65 verify | No |
| POST | `/api/messages/send` | Send encrypted signed message | Yes |
| GET | `/api/messages` | Get inbox | Yes |
| GET | `/api/messages/{id}` | Decrypt & verify message | Yes |
| GET | `/api/security/status` | Security configuration | No |
| GET | `/api/benchmark` | PQC vs Traditional benchmark | Yes |
| GET | `/api/logs` | Cryptographic operation logs | Yes |

## Security Architecture

```
Client                              Server
  |                                   |
  |-- GET /api/keys/public ---------> |
  |<-- ML-KEM-768 public key ---------|
  |                                   |
  |-- ML-KEM-768 Encapsulate          |
  |   (local: generate shared secret) |
  |-- POST /api/kem/encapsulate ----> |
  |<-- KEM ciphertext ---------------|
  |                                   |
  |-- HKDF-SHA-256(shared_secret)     |
  |   --> AES-256-GCM key             |
  |-- AES-256-GCM encrypt(plaintext)  |
  |-- ML-DSA-65 sign(ciphertext)      |
  |-- POST /api/messages/send ------> |
  |   {ciphertext, nonce, kem_ct,     |
  |    ml_dsa_signature}              |
  |                                   |
  |                 ML-DSA-65 verify  |
  |                 ML-KEM-768 decaps |
  |                 AES-256-GCM decrypt
  |<-- 200 OK message_id ------------|
```

## Demo Walkthrough

1. Register two users: `alice` and `bob`
2. Both users generate key pairs (`/api/keys/generate`)
3. Alice sends an encrypted, signed message to Bob
4. Bob reads and decrypts it — signature verified automatically
5. Try the tamper demo in the Signatures page
6. Run benchmarks to compare PQC vs Traditional performance

## Security Notes

> **Demo vs Production:** In this demo, private keys are stored server-side for educational purposes.  
> In production, private keys MUST remain on the client device and never be transmitted.

> **Algorithm Status:** ML-KEM-768 (FIPS 203) and ML-DSA-65 (FIPS 204) were finalized by NIST in August 2024. These are the official post-quantum standards.

> **Library Note:** `kyber-py` and `dilithium-py` are pure-Python reference implementations. They are slower than optimized C/hardware implementations but cryptographically correct.

## Project Structure

```
quantum-safe-rest-api/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI route handlers
│   │   │   ├── auth.py        # Register, Login
│   │   │   ├── keys.py        # Key generation/retrieval
│   │   │   ├── kem.py         # ML-KEM-768 endpoints
│   │   │   ├── encryption.py  # AES-256-GCM endpoints
│   │   │   ├── signatures.py  # ML-DSA-65 endpoints
│   │   │   ├── messages.py    # Secure messaging
│   │   │   └── security.py    # Status & benchmark
│   │   ├── core/          # Config, database, security helpers
│   │   ├── crypto/        # Cryptographic modules
│   │   │   ├── kem.py         # ML-KEM-768 wrapper
│   │   │   ├── dsa.py         # ML-DSA-65 wrapper
│   │   │   ├── symmetric.py   # AES-256-GCM + HKDF
│   │   │   └── classical.py   # RSA/ECDH/ECDSA for comparison
│   │   ├── models/        # SQLAlchemy models + Pydantic schemas
│   │   ├── services/      # Auth dependency
│   │   ├── tests/         # Automated test suite (25 tests)
│   │   └── main.py        # FastAPI app entry point
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/
│   └── src/
│       ├── components/    # Layout, sidebar navigation
│       ├── pages/         # Dashboard, Auth, Keys, KEM, etc.
│       ├── services/      # Axios API client
│       └── hooks/         # Auth context hook
├── docs/                  # Academic report
├── docker-compose.yml
├── .env.example
└── README.md
```

## References

- NIST FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard (2024)
- NIST FIPS 204: Module-Lattice-Based Digital Signature Standard (2024)
- CRYSTALS-Kyber specification: https://pq-crystals.org/kyber/
- CRYSTALS-Dilithium specification: https://pq-crystals.org/dilithium/
- RFC 5869: HMAC-based Key Derivation Function (HKDF)
- NIST SP 800-38D: AES-GCM Mode

---
*Academic Project — CSE Undergraduate | Build a Simple Networked Application and Develop Quantum-Safe REST APIs*

