@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BEEHIVE POS

echo ============================================
echo    BEEHIVE POS Startup
echo ============================================

set "ROOT=%~dp0"
if not "%ROOT:~-1%"=="\" set "ROOT=%ROOT%\"

echo Locating backend...
call :findBackend
if not defined BACKEND_DIR (
    echo ERROR: Could not find backend folder.
    echo Checked: BEEHIVE-BACKEND, beehive-backend, backend, server
    goto :fail
)

echo Locating frontend...
call :findFrontend

echo Backend : !BACKEND_DIR!
if defined FRONTEND_DIR (
    echo Frontend: !FRONTEND_DIR!
) else (
    echo Frontend: not found. Using existing backend public\dist
)

call :startPostgresServices

call :ensureBackendBuild
if errorlevel 1 goto :fail

if defined FRONTEND_DIR (
    call :prepareFrontend
    if errorlevel 1 goto :fail
)

set "PORT=3000"
if exist "!BACKEND_DIR!\.env" (
    for /f "tokens=1,* delims==" %%A in ('findstr /b "PORT=" "!BACKEND_DIR!\.env"') do (
        set "PORT=%%B"
    )
)
set "PORT=!PORT: =!"
if not defined PORT set "PORT=3000"

echo.
echo Starting server on port !PORT!...
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:!PORT!"

cd /d "!BACKEND_DIR!"
node dist\index.js
exit /b %errorlevel%

rem -------------------------------------------------------
:findBackend
set "BACKEND_DIR="
for %%N in (BEEHIVE-BACKEND beehive-backend backend server) do (
    if not defined BACKEND_DIR (
        if exist "!ROOT!%%N\prisma\schema.prisma" (
            if exist "!ROOT!%%N\package.json" (
                if exist "!ROOT!%%N\index.ts" (
                    set "BACKEND_DIR=!ROOT!%%N"
                )
            )
        )
    )
)
rem Strip trailing backslash
if defined BACKEND_DIR if "!BACKEND_DIR:~-1!"=="\" set "BACKEND_DIR=!BACKEND_DIR:~0,-1!"
exit /b 0

rem -------------------------------------------------------
:findFrontend
set "FRONTEND_DIR="
for %%N in (BEEHIVE-FRONTEND beehive-frontend frontend client) do (
    if not defined FRONTEND_DIR (
        if exist "!ROOT!%%N\vite.config.ts" (
            if exist "!ROOT!%%N\src\main.tsx" (
                set "FRONTEND_DIR=!ROOT!%%N"
            )
        )
    )
)
if defined FRONTEND_DIR if "!FRONTEND_DIR:~-1!"=="\" set "FRONTEND_DIR=!FRONTEND_DIR:~0,-1!"
exit /b 0

rem -------------------------------------------------------
:ensureBackendBuild
if exist "!BACKEND_DIR!\dist\index.js" exit /b 0

echo Backend not built. Building backend, please wait...
pushd "!BACKEND_DIR!"
if not exist "node_modules" (
    echo Installing backend dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: npm install failed for backend.
        popd
        exit /b 1
    )
)
call npm run build
set "BUILD_RC=!errorlevel!"
popd
if not "!BUILD_RC!"=="0" (
    echo ERROR: Backend build failed.
    exit /b 1
)
exit /b 0

rem -------------------------------------------------------
:prepareFrontend
if not exist "!FRONTEND_DIR!\dist\index.html" (
    echo Frontend not built. Building frontend, please wait...
    pushd "!FRONTEND_DIR!"
    if not exist "node_modules" (
        echo Installing frontend dependencies...
        call npm install
        if errorlevel 1 (
            echo ERROR: npm install failed for frontend.
            popd
            exit /b 1
        )
    )
    call npm run build
    set "FRONTEND_BUILD_RC=!errorlevel!"
    popd
    if not "!FRONTEND_BUILD_RC!"=="0" (
        echo ERROR: Frontend build failed.
        exit /b 1
    )
)

if not exist "!BACKEND_DIR!\public" mkdir "!BACKEND_DIR!\public" >nul 2>&1

echo Syncing frontend dist to backend public\dist...
robocopy "!FRONTEND_DIR!\dist" "!BACKEND_DIR!\public\dist" /MIR /NJH /NJS /NDL /NFL >nul
if errorlevel 8 (
    echo ERROR: robocopy failed to sync frontend build.
    exit /b 1
)
exit /b 0

rem -------------------------------------------------------
:startPostgresServices
echo Checking PostgreSQL service...
for %%s in (postgresql-x64-17 postgresql-x64-16 postgresql-x64-15 postgresql-x64-14 postgresql-x64-13 postgresql-x64-12 postgresql) do (
    call :tryStartPostgres "%%s"
)
exit /b 0

:tryStartPostgres
sc query %~1 >nul 2>&1
if errorlevel 1 exit /b 0
net start %~1 >nul 2>&1
exit /b 0

rem -------------------------------------------------------
:fail
echo.
echo Startup failed. Fix the error above and run start.bat again.
pause
exit /b 1
