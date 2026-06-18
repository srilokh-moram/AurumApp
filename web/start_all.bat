@echo off
echo ============================================
echo  Starting Aurum Web Platform
echo ============================================

cd /d C:\Users\Administrator\Documents\Aurum\web

echo [1/2] Starting Backend API on http://localhost:8000 ...
start "Aurum Backend" cmd /k "cd backend && venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend on http://localhost:3000 ...
start "Aurum Frontend" cmd /k "cd frontend && set PATH=C:\Program Files\nodejs;%PATH% && npm run dev"

echo.
echo Both servers started.
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo.
