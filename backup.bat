@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BEEHIVE - Database Backup
echo ============================================
echo    BEEHIVE Database Backup
echo ============================================
echo.

REM Locate backend folder
set "BACKEND_DIR="
for %%N in (BEEHIVE-BACKEND beehive-backend backend) do (
    if not defined BACKEND_DIR (
        if exist "%~dp0%%N\package.json" (
            set "BACKEND_DIR=%~dp0%%N"
        )
    )
)
if defined BACKEND_DIR if "!BACKEND_DIR:~-1!"=="\" set "BACKEND_DIR=!BACKEND_DIR:~0,-1!"

if not defined BACKEND_DIR (
    echo ERROR: Could not find BEEHIVE-BACKEND folder.
    pause
    exit /b 1
)

if not exist "!BACKEND_DIR!\.env" (
    echo ERROR: .env file not found in backend.
    echo Run setup.bat first to configure the system.
    pause
    exit /b 1
)

REM Start PostgreSQL if not running
echo Checking PostgreSQL service...
for %%s in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql-x64-12 postgresql) do (
    sc query "%%s" >nul 2>&1
    if not errorlevel 1 net start "%%s" >nul 2>&1
)

cd /d "!BACKEND_DIR!"

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed.
        pause
        exit /b 1
    )
    echo.
)

echo Starting backup, please wait...
echo.

call npx tsx scripts/backup-database.ts
if errorlevel 1 (
    echo.
    echo ERROR: Backup failed. Make sure PostgreSQL is running.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Backup complete!
echo  Saved to: !BACKEND_DIR!\backups\
echo ============================================
echo.

set /p "OPEN=Open backup folder? (y/N): "
if /i "!OPEN!"=="y" (
    explorer "!BACKEND_DIR!\backups"
)
pause
