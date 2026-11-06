# Screenshots

This folder contains screenshots of the running application for academic submission.

## How to Capture Screenshots

1. Run `start.bat` (Windows) or `./start.sh` (Linux/macOS) from the project root
2. Open your browser to **http://localhost:5173**
3. Capture each page listed below
4. Also open **http://localhost:8000/docs** for the Swagger UI screenshot

---

## Required Screenshots

| # | Page | URL | What to Show |
|---|------|-----|--------------|
| 1 | `01_dashboard.png` | `/` | Main dashboard with security stats |
| 2 | `02_register.png` | `/auth` | Registration form |
| 3 | `03_login.png` | `/auth` | Login form with JWT token returned |
| 4 | `04_key_management.png` | `/keys` | After generating ML-KEM-768 + ML-DSA-65 keys |
| 5 | `05_kem_demo.png` | `/kem` | KEM encapsulation/decapsulation with matching secrets |
| 6 | `06_encryption.png` | `/encryption` | AES-256-GCM encrypt + decrypt roundtrip |
| 7 | `07_signatures.png` | `/signatures` | ML-DSA-65 sign + verify (valid & tampered) |
| 8 | `08_messages.png` | `/messages` | Secure message inbox and compose |
| 9 | `09_benchmark.png` | `/benchmark` | PQC vs Traditional comparison chart |
| 10 | `10_security_status.png` | `/security` | Security configuration panel |
| 11 | `11_logs.png` | `/logs` | Cryptographic operation activity log |
| 12 | `12_swagger_docs.png` | `http://localhost:8000/docs` | Full Swagger/OpenAPI documentation |

---

## Demo Workflow for Screenshots

```
1. Register user "alice" and "bob"
2. Log in as alice → generate key pairs → screenshot Key Management
3. Navigate to KEM → encapsulate to bob → screenshot matching secrets
4. Navigate to Encryption → encrypt a message to bob → decrypt it → screenshot
5. Navigate to Signatures → sign a message → verify (valid) → tamper → verify (invalid) → screenshot
6. Navigate to Messages → send alice→bob → log in as bob → read & decrypt → screenshot
7. Navigate to Benchmark → click Run → wait ~5s → screenshot chart
8. Navigate to Security Status → screenshot
9. Navigate to Logs → screenshot activity history
10. Open localhost:8000/docs → screenshot full API list
```
