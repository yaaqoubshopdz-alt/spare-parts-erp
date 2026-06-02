@echo off
cd /d "%~dp0"
echo [SYSTEM] Starting Spare Parts ERP (Bulbul Core)...
npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Application failed to start.
    pause
)
