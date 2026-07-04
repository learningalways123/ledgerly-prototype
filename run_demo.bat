@echo off
echo ===================================================
echo Ledgerly Demo Environment Bootstrap
echo ===================================================
echo.
echo Make sure Python and Node.js are installed on your PATH.
echo.
echo [1/2] Launching FastAPI Backend (Port 8001)...
start "Ledgerly Backend Server" cmd /k "cd backend && python -m venv venv && call .\venv\Scripts\activate && pip install -r requirements.txt && set PORT=8001 && python app/main.py"

echo [2/2] Launching Next.js Frontend (Port 3000)...
start "Ledgerly Frontend DevServer" cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ===================================================
echo Ledgerly is running:
echo - Web Dashboard: http://localhost:3000
echo - Interactive API Docs: http://localhost:8001/docs
echo.
echo To terminate all running servers, run stop_demo.bat
echo ===================================================
echo.
pause
