@echo off
cd /d C:\Users\Administrator\Documents\Aurum\web\backend
echo Starting Aurum Backend API...
venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000
