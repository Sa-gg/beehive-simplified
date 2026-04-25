@echo off
setlocal EnableExtensions EnableDelayedExpansion
title BEEHIVE - First Time Setup
echo ============================================
echo    BEEHIVE - First Time Database Setup
echo ============================================
echo.

cd /d "%~dp0BEEHIVE-BACKEND"

REM ---- Re-run guard ----
if exist ".setup-done" (
    echo WARNING: Setup has already been run on this machine.
    echo.
    echo Re-running is safe BUT will overwrite menu items/categories
    echo with default data. Existing orders and accounts are NOT affected.
    echo.
    set /p "CONFIRM=Run setup again? (y/N): "
    if /i not "!CONFIRM!"=="y" (
        echo.
        echo Setup skipped. Run start.bat to launch the system.
        pause
        exit /b 0
    )
    echo.
)

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)
for /f %%v in ('node --version') do echo    Node.js %%v found.
echo.

echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
)
echo.

echo [3/5] Generating Prisma client...
call npx prisma generate
if errorlevel 1 (
    echo ERROR: Prisma generate failed.
    pause
    exit /b 1
)
echo.

echo [4/5] Running database migrations...
echo    Applying schema to database (resets existing schema)...
echo y| call npx prisma db push --force-reset
if errorlevel 1 (
    echo ERROR: Could not apply database schema.
    echo Make sure PostgreSQL is running and DATABASE_URL in .env is correct.
    pause
    exit /b 1
)
echo    Syncing migration history...
call npx prisma migrate resolve --applied "0_baseline" >nul 2>&1
call npx prisma migrate resolve --applied "20251213151850_initial" >nul 2>&1
call npx prisma migrate resolve --applied "20251213164836_initial_schema" >nul 2>&1
call npx prisma migrate resolve --applied "20251213195920_add_order_type" >nul 2>&1
call npx prisma migrate resolve --applied "20251214022334_add_users_and_auth" >nul 2>&1
call npx prisma migrate resolve --applied "20251214163013_add_mood_tracking" >nul 2>&1
call npx prisma migrate resolve --applied "20251214165100_add_inventory" >nul 2>&1
call npx prisma migrate resolve --applied "20251214181612_add_expenses" >nul 2>&1
call npx prisma migrate resolve --applied "20251226111308_add_smart_inventory_tracking" >nul 2>&1
call npx prisma migrate resolve --applied "20251226133952_add_linked_order_id" >nul 2>&1
call npx prisma migrate resolve --applied "20251227160306_add_mood_feedback_tracking" >nul 2>&1
echo.

echo [5/5] Seeding admin account and default menu data...
call npx tsx prisma/seed.ts
if errorlevel 1 (
    echo ERROR: Seeding failed.
    echo You can retry manually: npx tsx prisma/seed.ts
    pause
    exit /b 1
)

REM Mark setup as complete so we can warn on re-runs
echo %date% %time% > .setup-done

echo.
echo ============================================
echo  Setup complete! You can now run start.bat
echo.
echo  Default admin login:
echo    Email   : admin@beehive.com
echo    Password: password123
echo.
echo  IMPORTANT: Change the admin password after first login!
echo ============================================
pause
