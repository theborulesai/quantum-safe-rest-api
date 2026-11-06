"""
Quantum-Safe REST API — FastAPI Application Entry Point

This application demonstrates post-quantum cryptography (PQC) protecting REST API
communication using NIST-standardized algorithms:
  - ML-KEM-768 (FIPS 203): Key Encapsulation Mechanism
  - ML-DSA-65  (FIPS 204): Digital Signatures
  - AES-256-GCM           : Symmetric authenticated encryption
  - HKDF-SHA-256          : Key derivation

Cryptographic libraries:
  - kyber-py v1.2.0:      Pure-Python ML-KEM-768 implementation
  - dilithium-py v1.5.1:  Pure-Python ML-DSA-65 implementation
  - cryptography v48.0.0: AES-GCM, HKDF, RSA, ECDH, ECDSA

NOTE: kyber-py and dilithium-py are reference implementations intended for 
educational and research purposes. For production, use hardware-accelerated 
implementations such as liboqs or platform-native PQC APIs.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api import auth, keys, kem, encryption, signatures, messages, security


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="Quantum-Safe REST API",
    description="""
## 🔐 Post-Quantum Cryptography Demonstration

A complete demonstration of quantum-safe REST API communication using **NIST-standardized
post-quantum cryptographic algorithms** (FIPS 203/204).

### Cryptographic Algorithms
| Algorithm | Standard | Purpose |
|-----------|----------|---------|
| **ML-KEM-768** | NIST FIPS 203 | Key Encapsulation (replaces ECDH) |
| **ML-DSA-65** | NIST FIPS 204 | Digital Signatures (replaces ECDSA) |
| **AES-256-GCM** | NIST FIPS 197 | Symmetric Encryption |
| **HKDF-SHA-256** | RFC 5869 | Key Derivation |

### Security Architecture
1. ML-KEM-768 establishes a shared secret without transmitting it
2. HKDF-SHA-256 derives an AES-256-GCM key
3. AES-256-GCM encrypts with authentication (tamper detection)
4. ML-DSA-65 provides non-repudiation via signatures

### Authentication
Use `POST /api/login` to get a JWT Bearer token, then click **Authorize** above.
""",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware — allows React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(keys.router)
app.include_router(kem.router)
app.include_router(encryption.router)
app.include_router(signatures.router)
app.include_router(messages.router)
app.include_router(security.router)


@app.get("/", tags=["Root"])
async def root():
    """API health check and information."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "pqc_active": True,
        "algorithms": {
            "kem": "ML-KEM-768 (NIST FIPS 203)",
            "dsa": "ML-DSA-65 (NIST FIPS 204)",
            "symmetric": "AES-256-GCM",
            "kdf": "HKDF-SHA-256",
        },
        "docs": "/docs",
        "redoc": "/redoc",
    }

