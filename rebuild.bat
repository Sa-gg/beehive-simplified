@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BEEHIVE POS - Rebuild

echo ============================================
echo    BEEHIVE POS Rebuild
echo ============================================

set "ROOT=%~dp0"
if not "%ROOT:~-1%"=="\" set "ROOT=%ROOT%\"

rem -------------------------------------------------------
rem Locate backend
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
if defined BACKEND_DIR if "!BACKEND_DIR:~-1!"=="\" set "BACKEND_DIR=!BACKEND_DIR:~0,-1!"

if not defined BACKEND_DIR (
    echo ERROR: Could not find backend folder.
    echo Checked: BEEHIVE-BACKEND, beehive-backend, backend, server
    goto :fail
)

rem -------------------------------------------------------
rem Locate frontend
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

if not defined FRONTEND_DIR (
    echo ERROR: Could not find frontend folder.
    echo Checked: BEEHIVE-FRONTEND, beehive-frontend, frontend, client
    goto :fail
)

echo Backend : !BACKEND_DIR!
echo Frontend: !FRONTEND_DIR!
echo.

rem -------------------------------------------------------
echo [1/4] Installing backend dependencies...
pushd "!BACKEND_DIR!"
call npm install
if errorlevel 1 (
    echo ERROR: Backend npm install failed.
    popd
    goto :fail
)
popd
echo        Done.
echo.

rem -------------------------------------------------------
echo [2/4] Generating Prisma client...
pushd "!BACKEND_DIR!"
call npx prisma generate
if errorlevel 1 (
    echo WARNING: prisma generate reported issues. Continuing...
)
popd
echo        Done.
echo.

rem -------------------------------------------------------
echo [3/4] Installing and building frontend...
pushd "!FRONTEND_DIR!"
call npm install
if errorlevel 1 (
    echo ERROR: Frontend npm install failed.
    popd
    goto :fail
)
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed.
    popd
    goto :fail
)
popd
echo        Done.
echo.

rem -------------------------------------------------------
echo [4/4] Syncing frontend build to backend...
if not exist "!BACKEND_DIR!\public" mkdir "!BACKEND_DIR!\public" >nul 2>&1
robocopy "!FRONTEND_DIR!\dist" "!BACKEND_DIR!\public\dist" /MIR /NJH /NJS /NDL /NFL >nul
if errorlevel 8 (
    echo ERROR: Failed to copy frontend build to backend.
    goto :fail
)
echo        Done.
echo.

echo ============================================
echo  Rebuild complete!
echo  Run start.bat to launch BEEHIVE POS.
echo ============================================
echo.
pause
exit /b 0

rem -------------------------------------------------------
:fail
echo.
echo Rebuild failed. Fix the error above and try again.
pause
exit /b 1
