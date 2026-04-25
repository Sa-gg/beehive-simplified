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
echo Checking for existing server on port !PORT!...
set "OLD_PID="
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":!PORT! " ^| findstr "LISTENING"') do (
    if not defined OLD_PID set "OLD_PID=%%a"
)
if defined OLD_PID (
    echo    Found existing server ^(PID !OLD_PID!^). Stopping it...
    taskkill /f /pid !OLD_PID! >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo    No existing server found.
)

echo Starting server in background...
set "VBS=%TEMP%\beehive-start.vbs"
echo Set oShell = WScript.CreateObject("WScript.Shell") > "!VBS!"
echo oShell.CurrentDirectory = "!BACKEND_DIR!" >> "!VBS!"
echo oShell.Run "cmd /c node dist\index.js ^>^> server.log 2^>^&1", 0, False >> "!VBS!"
wscript //nologo "!VBS!"

echo Waiting for server to be ready...
powershell -NoProfile -Command "for($i=0;$i-lt60;$i++){ try{ $t=New-Object System.Net.Sockets.TcpClient; $t.Connect('localhost',!PORT!); $t.Close(); exit 0 }catch{ Start-Sleep 1 } }; exit 1" >nul 2>&1
if errorlevel 1 (
    echo WARNING: Server did not respond in 60 seconds.
    echo Check BEEHIVE-BACKEND\server.log for errors.
    pause
    exit /b 1
)
echo Server is ready!

echo.
echo ============================================
echo  BEEHIVE is running at http://localhost:!PORT!
echo  The server runs in the background.
echo  This window can be safely closed.
echo  To stop: Task Manager ^> end node.exe
echo  Logs: BEEHIVE-BACKEND\server.log
echo ============================================
echo.

start "" "http://localhost:!PORT!"

echo Press any key to close this window...
pause >nul
exit /b 0

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
