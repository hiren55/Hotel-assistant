@echo off
title Hotel Assistant - Dev Server
color 0B

echo.
echo ============================================
echo    Hotel Assistant - Development Server
echo ============================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if pnpm is installed
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] pnpm is not installed. Installing...
    npm install -g pnpm
)

echo [INFO] Node Version:
node --version

echo [INFO] PNPM Version:
pnpm --version

echo.
echo [STEP 1] Killing existing processes on dev ports...
node scripts\kill-ports.js

echo.
echo [STEP 2] Starting development server...
echo.

:: Run the dev server
node scripts\dev-server.js

pause
