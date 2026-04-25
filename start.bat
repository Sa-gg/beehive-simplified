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

rem Detect absolute path to node.exe so it works even if not in system PATH
set "NODE_EXE=node"
for /f "delims=" %%n in ('where node 2^>nul') do (
    if not defined _NODE_FOUND set "NODE_EXE=%%n" & set "_NODE_FOUND=1"
)

rem Write a launcher batch file - avoids VBScript PATH inheritance issues
set "LAUNCHER=%TEMP%\beehive_launcher.bat"
> "!LAUNCHER!" echo @echo off
>> "!LAUNCHER!" echo cd /d "!BACKEND_DIR!"
>> "!LAUNCHER!" echo "!NODE_EXE!" "!BACKEND_DIR!\node_modules\tsx\dist\cli.mjs" index.ts ^>^> "!BACKEND_DIR!\server.log" 2^>^&1

rem Clear old log so we can check for fresh errors
if exist "!BACKEND_DIR!\server.log" del "!BACKEND_DIR!\server.log" >nul 2>&1

rem Run launcher hidden via VBScript
set "VBS=%TEMP%\beehive_launch.vbs"
> "!VBS!" echo CreateObject("WScript.Shell").Run "cmd /c """"!LAUNCHER!""""", 0, False
wscript //nologo "!VBS!"

echo Waiting for server to be ready on port !PORT!...
set "READY=0"
for /l %%i in (1,1,60) do (
    if "!READY!"=="0" (
        powershell -NoProfile -Command "try{$t=New-Object Net.Sockets.TcpClient;$t.Connect('localhost',!PORT!);$t.Close();exit 0}catch{exit 1}" >nul 2>&1
        if not errorlevel 1 set "READY=1"
        if "!READY!"=="0" (
            timeout /t 1 /nobreak >nul 2>&1
        )
    )
)

if "!READY!"=="0" (
    echo.
    echo ERROR: Server did not start after 60 seconds.
    echo.
    if exist "!BACKEND_DIR!\server.log" (
        echo Last log output:
        echo ----------------------------------------
        powershell -NoProfile -Command "if(Test-Path '!BACKEND_DIR!\server.log'){Get-Content '!BACKEND_DIR!\server.log' -Tail 20}"
        echo ----------------------------------------
    ) else (
        echo No log file found. node.exe may not be in PATH.
        echo Try running: where node
    )
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
if exist "!BACKEND_DIR!\node_modules\.bin\tsx.cmd" exit /b 0

echo Installing backend dependencies (first run may take a few minutes)...
pushd "!BACKEND_DIR!"
call npm install
set "INSTALL_RC=!errorlevel!"
if not "!INSTALL_RC!"=="0" (
    echo ERROR: npm install failed for backend.
    popd
    exit /b 1
)
echo Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo WARNING: prisma generate had issues. Continuing anyway...
)
popd
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
