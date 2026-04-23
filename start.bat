@echo off
title BEEHIVE POS

cd /d "%~dp0BEEHIVE-BACKEND"

echo Starting BEEHIVE...

:: Auto-detect and start PostgreSQL if not running
for %%s in (postgresql-x64-16 postgresql-x64-17 postgresql-x64-15 postgresql) do (
    sc query "%%s" >nul 2>&1
    if not errorlevel 1 (
        sc query "%%s" | find "RUNNING" >nul 2>&1
        if errorlevel 1 (
            echo Starting PostgreSQL...
            net start "%%s" >nul 2>&1
            timeout /t 3 /nobreak >nul
        )
    )
)

:: Open browser after 4 seconds (background)
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Start the server (this stays open - closing this window stops the server)
node dist/index.js
