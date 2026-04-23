@echo off
title BEEHIVE - First Time Setup
echo ============================================
echo    BEEHIVE - First Time Database Setup
echo ============================================
echo.

cd /d "%~dp0BEEHIVE-BACKEND"

echo [1/4] Checking Node.js...
node --version || (echo ERROR: Node.js is not installed. & pause & exit /b 1)

echo [2/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause & exit /b 1
)

echo [3/4] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed.
    pause & exit /b 1
)

echo [4/4] Running database migrations...
call npx prisma migrate deploy
if errorlevel 1 (
    echo ERROR: Migration failed. Is PostgreSQL running?
    pause & exit /b 1
)

echo.
echo ============================================
echo  Setup complete!
echo.
echo  Optional: seed default menu and accounts:
echo    npx tsx prisma/seed.ts
echo ============================================
pause
