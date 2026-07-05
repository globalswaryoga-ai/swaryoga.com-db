@echo off
REM WhatsApp Bridge Quick Startup Script (Windows)
REM Starts the Baileys WhatsApp bridge on port 3333
REM Usage: start-bridge.bat

setlocal enabledelayedexpansion

echo.
echo 🚀 Starting WhatsApp Bridge...
echo.

REM Check if node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Install it first:
    echo    https://nodejs.org/
    pause
    exit /b 1
)

REM Check if port 3333 is in use and kill it
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3333.*LISTENING"') do (
    echo ⚠️  Port 3333 already in use. Killing process %%a...
    taskkill /PID %%a /F >nul 2>&1
)

timeout /t 2 /nobreak >nul

REM Find bridge directory
set BRIDGE_DIR=
if exist "whatsapp-bridge\package.json" set BRIDGE_DIR=whatsapp-bridge
if exist "..\whatsapp-bridge\package.json" set BRIDGE_DIR=..\whatsapp-bridge
if exist "%USERPROFILE%\whatsapp-bridge\package.json" set BRIDGE_DIR=%USERPROFILE%\whatsapp-bridge
if exist "C:\whatsapp-bridge\package.json" set BRIDGE_DIR=C:\whatsapp-bridge

if "!BRIDGE_DIR!"=="" (
    echo ❌ WhatsApp bridge not found.
    echo.
    echo Please clone it:
    echo   git clone https://github.com/globalswaryoga-ai/whatsapp-bridge.git
    echo   cd whatsapp-bridge
    echo   npm install
    echo.
    pause
    exit /b 1
)

echo ✓ Found bridge at: !BRIDGE_DIR!
echo.

REM Change to bridge directory
cd /d "!BRIDGE_DIR!"

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM Check .env
if not exist ".env" (
    if exist ".env.example" (
        echo 📝 Creating .env from .env.example...
        copy ".env.example" ".env" >nul
        echo ⚠️  Update .env with your WhatsApp credentials
    )
)

REM Start bridge
echo ✓ Starting bridge on http://localhost:3333
echo Press Ctrl+C to stop
echo.

REM Set environment variables
set NODE_ENV=production
set PORT=3333

REM Run with memory optimization
node --max-old-space-size=4096 app.js

pause
