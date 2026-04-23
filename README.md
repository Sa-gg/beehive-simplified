# BEEHIVE POS System

A full-stack Point-of-Sale system for café/restaurant management, featuring an admin dashboard, order tracking, inventory, sales analytics, menu management, and staff accounts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 22, TypeScript, Express 5, Prisma 7 |
| Database | PostgreSQL 16 |
| Frontend | React 19, Vite 7, Tailwind CSS 4 |
| Auth | JWT + bcrypt |

---

## Step 1 — Install Prerequisites

This must be done once on every new machine before anything else.

### 1.1 — Git

1. Go to **https://git-scm.com/download/win**
2. Download the installer and run it — click **Next** on everything (defaults are fine)
3. Open **Command Prompt** and verify:
   ```
   git --version
   ```

### 1.2 — Node.js

1. Go to **https://nodejs.org/en/download**
2. Download the **LTS** installer for Windows (`.msi`)
3. Run it — click **Next** on everything
4. Verify in Command Prompt:
   ```
   node --version
   npm --version
   ```
   You should see `v22.x.x` or higher.

### 1.3 — PostgreSQL

1. Go to **https://www.postgresql.org/download/windows/**
2. Click **Download the installer** (use the EDB installer)
3. Download **version 16** for Windows x86-64
4. Run the installer:
   - When asked for a **password** for the `postgres` user — set one and **write it down**, you will need it
   - Leave **port** as `5432`
   - Leave **locale** as default
   - Leave **Stack Builder** unchecked at the end
5. PostgreSQL installs as a **Windows service** that starts automatically on boot — no manual start needed
6. Verify (optional): open **pgAdmin** from the Start menu and connect using your password

---

## Step 2 — Get the Project

Open **Command Prompt** and run:

```bash
git clone https://github.com/Sa-gg/beehive-simplified.git BEEHIVE
cd BEEHIVE
```

---

## Step 3 — Backend Setup

```bash
cd BEEHIVE-BACKEND
npm install
```

### Create the `.env` file

Create a new file named `.env` inside `BEEHIVE-BACKEND/` with this content:

```env
DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/beehive?schema=public"
JWT_SECRET="change-this-to-a-long-random-string"
PORT=3000
```

> Replace `YOUR_POSTGRES_PASSWORD` with the password you chose during PostgreSQL installation.
> Replace the `JWT_SECRET` value with any long random string — this secures user sessions.

### Run database migrations

This creates all the tables in PostgreSQL:

```bash
npx prisma migrate deploy
```

### Generate the Prisma client

```bash
npx prisma generate
```

### Seed initial data

This loads the default menu items, categories, and staff accounts:

```bash
npx tsx prisma/seed.ts
```

### Build the backend

```bash
npm run build
```

---

## Step 4 — Frontend Setup

Open a **new** Command Prompt window:

```bash
cd BEEHIVE\BEEHIVE-FRONTEND
npm install
```

### Create the `.env` file

Create a new file named `.env` inside `BEEHIVE-FRONTEND/` with this content:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=BEEHIVE
```

> **Note for QR / customer phone ordering**: If customers will scan a QR code from their phones on the same WiFi network, replace `localhost` with the server machine's **local IP address** (e.g., `http://192.168.1.10:3000`). Find the IP by running `ipconfig` in Command Prompt and looking for **IPv4 Address** under your WiFi adapter.

### Build the frontend

```bash
npm run build
```

### Copy built files to the backend

Run in Command Prompt from the `BEEHIVE-FRONTEND/` folder:

```bat
xcopy /E /I /Y dist ..\ BEEHIVE-BACKEND\public\dist
```

Or manually: copy everything inside `BEEHIVE-FRONTEND/dist/` into a new folder at `BEEHIVE-BACKEND/public/dist/`.

---

## Step 5 — Configure Backend to Serve the Frontend

Open `BEEHIVE-BACKEND/index.ts` and find this block (around line 189):

```typescript
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Welcome to BEEHIVE API',
    ...
  });
});
```

**Replace it entirely** with the static file server:

```typescript
// Serve built frontend
app.use(express.static(path.join(__dirname, 'public/dist')));

// SPA fallback — let React Router handle all non-API routes
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public/dist', 'index.html'));
});
```

Then rebuild the backend:

```bash
cd BEEHIVE-BACKEND
npm run build
```

---

## Step 6 — Run the System

```bash
cd BEEHIVE-BACKEND
node dist/index.js
```

Open your browser and go to: **http://localhost:3000**

The system is ready. Keep this terminal window open — closing it stops the server.

---

## Default Login Credentials

Created automatically by the seed:

| Role | Email | Password |
|---|---|---|
| Admin | admin@beehive.com | password123 |
| Manager | manager@beehive.com | password123 |
| Cashier | cashier@beehive.com | password123 |
| Cook | cook@beehive.com | password123 |
| Customer | customer@beehive.com | password123 |

> **Important**: Change these passwords after first login in the Accounts section.

---

## Developer Mode (Hot Reload)

For active development, skip the build steps and use the dev servers instead:

```bash
# Terminal 1 — Backend with hot reload
cd BEEHIVE-BACKEND
npm run dev       # runs on http://localhost:3000

# Terminal 2 — Frontend with hot reload
cd BEEHIVE-FRONTEND
npm run dev       # runs on http://localhost:5173
```

> In dev mode, use port `5173` for the frontend. The `.env` file in `BEEHIVE-FRONTEND/` should point to `http://localhost:3000`.

---

## Useful Commands

```bash
# View and edit database records in the browser
npx prisma studio

# Re-run seed (safe — uses upsert, won't duplicate)
npx tsx prisma/seed.ts

# Apply any new migrations after a git pull
npx prisma migrate deploy

# Regenerate Prisma client after schema changes
npx prisma generate
```

---

## Environment Variables Reference

### Backend (`BEEHIVE-BACKEND/.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:mypass@localhost:5432/beehive?schema=public` |
| `JWT_SECRET` | Secret key for JWT tokens — keep this private | `a-very-long-random-string` |
| `PORT` | Port the API server listens on | `3000` |

### Frontend (`BEEHIVE-FRONTEND/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:3000` |
| `VITE_APP_NAME` | App name shown in the UI | `BEEHIVE` |

---

## License

ISC
