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
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=BEEHIVE
```

> **QR code / phone access**: If customers scan QR codes from their phones (ordering from their own devices on the same WiFi), change this to the server's **LAN IP** (e.g., `http://192.168.1.10:3000/api`). Set a **static IP** on the client laptop's WiFi adapter so this never changes.

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