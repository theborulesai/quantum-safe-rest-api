@echo off
echo ============================================================
echo   Quantum-Safe REST API - Startup Script (Windows)
echo   ML-KEM-768 (FIPS 203) + ML-DSA-65 (FIPS 204)
echo ============================================================
echo.

REM Start Backend
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Quantum-Safe Backend" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/2] Starting React Frontend on http://localhost:5173 ...
start "Quantum-Safe Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo   Application started!
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo ============================================================
echo.
echo Press any key to close this window...
pause >nul

