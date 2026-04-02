@echo off
cd /d %USERPROFILE%\Documents\git-repo\Aurum

:: Activate venv ONCE
call venv\Scripts\activate

:loop
echo ======================================
echo Starting bot...
echo ======================================

python src\main.py >> logs\bot.log 2>&1

echo ======================================
echo Bot crashed. Restarting...
echo ======================================

timeout /t 5
goto loop