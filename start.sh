#!/bin/bash
echo "============================================================"
echo "  Quantum-Safe REST API - Startup Script (Linux/macOS)"
echo "  ML-KEM-768 (FIPS 203) + ML-DSA-65 (FIPS 204)"
echo "============================================================"

# Start Backend in background
echo "[1/2] Starting FastAPI Backend on http://localhost:8000..."
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

sleep 2

# Start Frontend in background
echo "[2/2] Starting React Frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================================"
echo "  Application started!"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Frontend: http://localhost:5173"
echo "============================================================"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for Ctrl+C
wait

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null

