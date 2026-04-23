@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BEEHIVE POS

echo ============================================
echo    BEEHIVE POS Startup
echo ============================================

set "ROOT=%~dp0"
if not "%ROOT:~-1%"=="\" set "ROOT=%ROOT%\"

call :findBackend "%ROOT%"
if not defined BACKEND_DIR (
    echo ERROR: Could not find backend folder.
    echo Expected a folder containing: index.ts, package.json, src\routes, prisma\schema.prisma
    goto :fail
)

call :findFrontend "%ROOT%"

echo Backend: !BACKEND_DIR!
if defined FRONTEND_DIR (
    echo Frontend: !FRONTEND_DIR!
) else (
    echo Frontend: not found. Continuing with existing backend public\dist
)

call :ensureBackendBuild
if errorlevel 1 goto :fail

if defined FRONTEND_DIR (
    call :prepareFrontend
    if errorlevel 1 goto :fail
)

call :startPostgresServices

set "PORT=3000"
if exist "!BACKEND_DIR!\.env" (
    for /f "tokens=1,* delims==" %%A in ('findstr /b /c:"PORT=" "!BACKEND_DIR!\.env"') do (
        set "PORT=%%B"
    )
)
set "PORT=!PORT: =!"
set "PORT=!PORT:\"=!"
if not defined PORT set "PORT=3000"

start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:!PORT!"

cd /d "!BACKEND_DIR!"
node dist\index.js
exit /b %errorlevel%

:ensureBackendBuild
if exist "!BACKEND_DIR!\dist\index.js" exit /b 0

echo Backend build not found. Building backend...
pushd "!BACKEND_DIR!"
call npm run build
set "BUILD_RC=!errorlevel!"
popd

if not "!BUILD_RC!"=="0" (
    echo ERROR: Backend build failed.
    exit /b 1
)

exit /b 0

:prepareFrontend
if not exist "!FRONTEND_DIR!\dist\index.html" (
    echo Frontend build not found. Building frontend...
    pushd "!FRONTEND_DIR!"
    call npm run build
    set "FRONTEND_BUILD_RC=!errorlevel!"
    popd
    if not "!FRONTEND_BUILD_RC!"=="0" (
        echo ERROR: Frontend build failed.
        exit /b 1
    )
) else (
    rem Rebuild stale bundles that still contain the old /api/api behavior.
    findstr /s /i /m "/api/api" "!FRONTEND_DIR!\dist\assets\*.js" >nul 2>&1
    if not errorlevel 1 (
        echo Stale frontend API bundle detected. Rebuilding frontend...
        pushd "!FRONTEND_DIR!"
        call npm run build
        set "FRONTEND_REBUILD_RC=!errorlevel!"
        popd
        if not "!FRONTEND_REBUILD_RC!"=="0" (
            echo ERROR: Frontend rebuild failed.
            exit /b 1
        )
    )
)

if not exist "!BACKEND_DIR!\public" mkdir "!BACKEND_DIR!\public" >nul 2>&1

echo Syncing frontend dist to backend public\dist...
robocopy "!FRONTEND_DIR!\dist" "!BACKEND_DIR!\public\dist" /MIR /NJH /NJS /NDL /NFL >nul
if errorlevel 8 (
    echo ERROR: Failed to sync frontend build to backend.
    exit /b 1
)

exit /b 0

:startPostgresServices
set "FOUND_POSTGRES=0"
for /f "tokens=2 delims=:" %%S in ('sc query state^= all ^| findstr /i "SERVICE_NAME: postgre"') do (
    set "SVC=%%S"
    set "SVC=!SVC: =!"
    if not "!SVC!"=="" (
        set "FOUND_POSTGRES=1"
        sc query "!SVC!" | find "RUNNING" >nul 2>&1
        if errorlevel 1 (
            echo Starting PostgreSQL service !SVC!...
            net start "!SVC!" >nul 2>&1
        )
    )
)

if "!FOUND_POSTGRES!"=="0" (
    for %%s in (postgresql-x64-18 postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql-x64-12 postgresql) do (
        sc query "%%s" >nul 2>&1
        if not errorlevel 1 (
            sc query "%%s" | find "RUNNING" >nul 2>&1
            if errorlevel 1 (
                echo Starting PostgreSQL service %%s...
                net start "%%s" >nul 2>&1
            )
        )
    )
)

exit /b 0

:findBackend
set "SEARCH_ROOT=%~1"
set "BACKEND_DIR="

for /r "%SEARCH_ROOT%" %%F in (schema.prisma) do (
    set "SCHEMA_FILE=%%~fF"
    echo !SCHEMA_FILE! | findstr /i "\\node_modules\\" >nul
    if errorlevel 1 (
        for %%I in ("%%~dpF..") do (
            if not defined BACKEND_DIR if exist "%%~fI\package.json" if exist "%%~fI\index.ts" if exist "%%~fI\src\routes" set "BACKEND_DIR=%%~fI"
        )
    )
)

if defined BACKEND_DIR if "!BACKEND_DIR:~-1!"=="\" set "BACKEND_DIR=!BACKEND_DIR:~0,-1!"
exit /b 0

:findFrontend
set "SEARCH_ROOT=%~1"
set "FRONTEND_DIR="

for /r "%SEARCH_ROOT%" %%F in (vite.config.ts) do (
    set "VITE_FILE=%%~fF"
    echo !VITE_FILE! | findstr /i "\\node_modules\\" >nul
    if errorlevel 1 (
        if not defined FRONTEND_DIR if exist "%%~dpFpackage.json" if exist "%%~dpFsrc\main.tsx" set "FRONTEND_DIR=%%~dpF"
    )
)

if defined FRONTEND_DIR if "!FRONTEND_DIR:~-1!"=="\" set "FRONTEND_DIR=!FRONTEND_DIR:~0,-1!"
exit /b 0

:fail
echo.
echo Startup failed. Fix the error above, then run start.bat again.
pause
exit /b 1
