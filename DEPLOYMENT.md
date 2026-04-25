# BEEHIVE POS — Client Machine Setup Guide

This guide walks through setting up BEEHIVE POS on a brand new Windows machine.

---

## Part 1 — Install Required Software

Do these steps **once** before anything else. All software is free.

---

### 1. Git

Git is needed to download the project from GitHub.

1. Go to **https://git-scm.com/download/win**
2. Download the installer and run it
3. Click **Next** on every screen — all defaults are fine
4. When done, open **Command Prompt** and verify:
   ```
   git --version
   ```
   You should see something like `git version 2.x.x`

---

### 2. Node.js

Node.js runs the backend server.

1. Go to **https://nodejs.org/en/download**
2. Download the **LTS** version for Windows (the `.msi` file)
3. Run the installer — click **Next** on every screen
4. Verify in Command Prompt:
   ```
   node --version
   npm --version
   ```
   Both should show a version number (Node should be v22 or higher)

---

### 3. PostgreSQL + pgAdmin

PostgreSQL is the database. pgAdmin is a visual tool to manage it (installed automatically).

1. Go to **https://www.postgresql.org/download/windows/**
2. Click **Download the installer** (EDB installer)
3. Select **Version 16** for Windows x86-64
4. Run the installer:
   - Set a **password** for the `postgres` user — **write this down**, you will need it
   - Leave **Port** as `5432`
   - Leave **Locale** as default
   - Uncheck **Stack Builder** at the end (not needed)
5. PostgreSQL will install as a Windows service and **start automatically on every boot**
6. To verify: open **pgAdmin** from the Start menu, connect with your password — if it connects, everything is working

---

## Part 2 — Get the Project

Open **Command Prompt** and run:

```
git clone https://github.com/Sa-gg/beehive-simplified.git BEEHIVE
```

This creates a `BEEHIVE` folder in whatever directory you ran the command from.  
Recommended location: your Desktop.

---

## Part 3 — Create the Environment File

Before running setup, you need to tell the app your database password.

1. Open the `BEEHIVE` folder
2. Go into `BEEHIVE-BACKEND`
3. Create a new text file named **`.env`** (just `.env`, no other name)
4. Paste this inside it:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/beehive?schema=public"
JWT_SECRET="beehive-secret-change-this"
PORT=3000
```

5. Replace `YOUR_PASSWORD` with the PostgreSQL password you set during installation
6. Save the file

> **Tip:** To create `.env`, open Notepad, paste the content, then go to **File → Save As**, set **Save as type** to **All Files**, and type `.env` as the filename.

---

## Part 4 — Run Setup (One Time Only)

Double-click **`setup.bat`** inside the `BEEHIVE` folder.

What it does automatically:
- Installs all dependencies
- Creates the database and all tables
- Loads default menu items, categories, and staff accounts

When it finishes you will see:

```
============================================
 Setup complete! You can now run start.bat

 Default admin login:
   Email   : admin@beehive.com
   Password: password123

 IMPORTANT: Change the admin password after first login!
============================================
```

> If you see an error, check that:
> - PostgreSQL is running (open pgAdmin and try to connect)
> - The password in `.env` matches what you set during PostgreSQL installation

---

## Part 5 — Daily Use

Double-click **`start.bat`** inside the `BEEHIVE` folder every day to start the system.

What it does automatically:
- Starts PostgreSQL if it is not already running
- Builds the app if it has not been built yet
- Stops any existing server on port 3000
- Starts the server **in the background** (no window to keep open)
- Waits until the server is ready, then opens the browser automatically

The browser will open to **http://localhost:3000** — the system is ready.

**You can close the setup window after it says the server is running.** The server keeps running in the background.

---

## Stop the Server

To stop BEEHIVE:

1. Press **Ctrl + Shift + Esc** to open Task Manager
2. Find **node.exe** in the list
3. Click it and press **End Task**

---

## Create a Desktop Shortcut (Optional)

To make it easier to start every day:

1. Right-click `start.bat` → **Create Shortcut**
2. Move the shortcut to the Desktop
3. Rename it `BEEHIVE POS`

---

## Default Staff Accounts

These are created automatically during setup:

| Role    | Email                  | Password    | Phone       |
|---------|------------------------|-------------|-------------|
| Admin   | admin@beehive.com      | password123 | 09511617396 |
| Manager | manager@beehive.com    | password123 | 09123456789 |
| Cashier | cashier@beehive.com    | password123 | 09234567890 |
| Cook    | cook@beehive.com       | password123 | 09345678901 |

> **Change all passwords after first login** in the Account Management section.

---

## Troubleshooting

### "Server did not start after 60 seconds"
- Make sure PostgreSQL is running — open pgAdmin and try to connect
- Check the log file at `BEEHIVE\BEEHIVE-BACKEND\server.log` for the exact error
- Make sure the password in `.env` is correct

### "Migration failed" during setup
- PostgreSQL is probably not running — start it via pgAdmin or the Windows Services panel
- Check the password in `.env` matches your PostgreSQL password
- Run `setup.bat` again — it will ask if you want to re-run, type `y`

### Re-running setup (reset everything)
- Double-click `setup.bat` again
- Type `y` when it asks to re-run
- **Warning:** This resets the database. All orders and data will be lost. Default accounts will be restored.

### Port 3000 already in use
- `start.bat` automatically detects and stops anything running on port 3000 before starting
- If it still fails: open Task Manager → find `node.exe` → End Task → run `start.bat` again

---

## Server Logs

If something goes wrong, check these files inside `BEEHIVE\BEEHIVE-BACKEND\`:

- `server.log` — normal server output
- `server-error.log` — error messages

---

## Architecture

```
http://localhost:3000
        │
  [Node.js Server]  ← started by start.bat, runs hidden in background
  ├── /api/*        → API routes (orders, menu, auth, inventory, etc.)
  ├── /uploads/*    → Product images
  └── /*            → React frontend (pre-built static files)
```

One server, one port, no separate processes. The browser talks directly to Node.js.

---

## Fixes Applied

**1. tsconfig.app.json** — Added `"ignoreDeprecations": "6.0"` before `baseUrl`. Error gone, verified clean.

**2. StockTransactionsPage.tsx** — Replaced both `max-h-[200px]` → `max-h-50` (lines 1138 + 1178). No errors remaining.

---

## Deployment Plan — BEEHIVE 1-Click Setup

### System Analysis Summary

| Component | Tech | Current State |
|---|---|---|
| Backend | Node.js + TypeScript, Express 5 | Dev runs via `tsx watch` — **`dist/` already exists** from prior `tsc` build |
| Frontend | React 19 + Vite, Tailwind CSS 4 | Dev server on port 5173 — **must be built** |
| Database | PostgreSQL (local) | Migrations exist, seed data ready |
| Auth | JWT (falls back to hardcoded secret if no .env) | Needs proper .env on client |

---

### Recommended Architecture for Client

**Single-process deployment**: Build the frontend once → serve its static files from the same Express backend → client only runs **one thing** on **one port (3000)**.

```
Client machine: http://localhost:3000
                    │
              [Express Backend]
              ├── /api/*        → API routes
              ├── /uploads/*    → Image files
              └── /*            → Serves React frontend (built static files)
```

No separate Vite dev server. No frontend process. One Node.js server does everything.

---

### Phase 1 — Code Changes You Make First (on your machine)

#### 1a. Serve built frontend from Express

Open `BEEHIVE-BACKEND/index.ts` and find this block around **line 189** (the JSON welcome route):

```typescript
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to BEEHIVE API',
    ...
  });
});
```

**Replace it entirely** with the static file server + SPA fallback:

```typescript
// Serve built frontend static files
app.use(express.static(path.join(__dirname, 'public/dist')));

// SPA fallback — React Router handles all non-API routes
app.get('/{*path}', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
});
```

> **Why replace, not just add**: The existing `app.get('/')` would intercept all requests to `http://localhost:3000` and return JSON instead of the React app. The `express.static` middleware handles `/` by automatically serving `index.html` from the `public/dist/` folder.
> **Express 5 note**: Use `/{*path}` (not `*`) for catch-all matching with current `path-to-regexp` behavior.

#### 1b. Create frontend production env

Create `BEEHIVE-FRONTEND/.env.production`:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=BEEHIVE
```

> **QR code / phone access**: If customers scan QR codes from their phones (ordering from their own devices on the same WiFi), change this to the server's **LAN IP** (e.g., `http://192.168.1.10:3000`). Set a **static IP** on the client laptop's WiFi adapter so this never changes.

#### 1c. Build the frontend

```bash
cd BEEHIVE-FRONTEND
npm run build
```

Output: dist — copy everything inside it to `BEEHIVE-BACKEND/public/dist/` (create that folder).

#### 1d. Rebuild backend (to pick up the new static-serving code)

```bash
cd BEEHIVE-BACKEND
npm run build    # runs tsc → dist/
```

#### 1e. Set a proper JWT secret in the .env

Currently the backend falls back to `'beehive-secret-key-change-in-production'`. Before handoff, set a real secret in .env:

```env
DATABASE_URL="postgresql://postgres:CHOSEN_PASSWORD@localhost:5432/beehive?schema=public"
JWT_SECRET="some-long-random-string-only-you-know"
PORT=3000
```

---

### Phase 2 — Deployment Package

What you hand the client (one folder, e.g., `C:\BEEHIVE\`):

```
C:\BEEHIVE\
├── BEEHIVE-BACKEND\
│   ├── dist\              ← compiled backend (from tsc)
│   ├── public\
│   │   ├── dist\          ← built frontend (from vite build)
│   │   └── uploads\       ← existing product images (copy from your machine)
│   ├── node_modules\      ← production dependencies
│   ├── prisma\
│   │   └── migrations\    ← needed for prisma migrate deploy
│   ├── generated\         ← Prisma client source (needed at runtime)
│   ├── .env               ← configured for client machine
│   └── package.json
├── setup.bat              ← run ONCE by developer
└── start.bat              ← client double-clicks this every day
```

> **`node_modules`**: On the client machine, run `npm ci --omit=dev` to install only production dependencies (~50% smaller). Alternatively copy `node_modules` from your machine (Windows-native binaries must match the client OS — same Windows = fine).

---

### Phase 3 — Client Machine Prerequisites (One-Time, Developer Present)

Install both of these before anything else:

1. **Node.js 22 LTS** — https://nodejs.org/en/download (Windows installer, just click Next)
2. **PostgreSQL 16** — https://www.postgresql.org/download/windows/ (EDB installer)
   - During install, set `postgres` user password to match what's in .env
   - Leave port as 5432
   - Let it install as a Windows service (it will auto-start on boot)

---

### Phase 4 — `setup.bat` (Run Once by Developer on Client Machine)

```batch
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
```

> **Seeding**: Run `npx tsx prisma/seed.ts` in the `BEEHIVE-BACKEND/` folder after setup to load the default menu, categories, and staff accounts. This requires the full `npm install` (already done above — `tsx` is a dev dependency). Credentials will be printed when the seed completes.

---

### Phase 5 — `start.bat` (Client's Daily 1-Click)

```batch
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

:: Start the server (this stays open — closing this window stops the server)
node dist/index.js
```

**Create desktop shortcut:**  
Right-click `start.bat` → Create Shortcut → Move to Desktop. Rename it `BEEHIVE POS`. Optionally set a custom icon.

> **Admin rights for `net start`**: If the PostgreSQL service doesn't start, the shortcut needs to run as Administrator. Fix: Right-click shortcut → Properties → Advanced → check "Run as administrator".

---

### Daily Operation Flow (Client)

```
Double-click "BEEHIVE POS" icon
        ↓
PostgreSQL service checked/started (auto)
        ↓
Node.js server starts (~2 seconds)
        ↓
Browser opens → http://localhost:3000
        ↓
System ready
```

To stop: close the terminal window that opens.

---

### Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| PostgreSQL service name varies by version | `start.bat` tries all common names |
| `net start` requires admin | Shortcut set to "Run as administrator" |
| `dist/` out of date if you update code | Re-run `npm run build` on your machine and re-copy `dist/` |
| Uploaded images missing on client | Copy `public/uploads/` folder to client |
| Frontend QR codes show localhost instead of LAN IP | Set client laptop to static LAN IP, rebuild frontend with that IP in `.env.production` |
| Database password in .env | Set a proper password during PostgreSQL install; keep .env out of version control (already in .gitignore) |

---

### What to Test Before Handing Off

Run this checklist on your own machine simulating the client setup:

1. `cd BEEHIVE-BACKEND && node dist/index.js` starts without errors
2. `http://localhost:3000` serves the React app (not a blank page or 404)
3. Login works (JWT authentication)
4. Menu items load with images (uploads path)
5. POS can create an order
6. If using QR customer ordering: scan QR from a phone on the same WiFi