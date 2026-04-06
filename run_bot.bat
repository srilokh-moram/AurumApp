@echo off

cd /d C:\Users\Administrator\Documents\Aurum

if not exist logs mkdir logs

:loop
echo ======================================
echo Starting bot...
echo ======================================

venv\Scripts\python.exe src\main.py >> logs\runner.log 2>&1

echo ======================================
echo Bot crashed. Restarting...
echo ======================================

ping 127.0.0.1 -n 6 > nul
goto loop