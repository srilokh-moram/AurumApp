@echo off
cd /d %USERPROFILE%\Documents\git-repo\Aurum

:loop
echo ===============================
echo Starting bot...
echo ===============================

call venv\Scripts\activate
python src\main.py

echo ===============================
echo Bot crashed. Restarting...
echo ===============================

timeout /t 5
goto loop