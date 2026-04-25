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

> **Setting up on a client machine?** See [DEPLOYMENT.md](DEPLOYMENT.md) for the simple step-by-step guide.

---

## Quick Start — New Machine

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for the full step-by-step client setup guide (Git, Node.js, PostgreSQL, setup.bat, start.bat).

Short version:
1. Install Git, Node.js LTS, PostgreSQL 16
2. `git clone https://github.com/Sa-gg/beehive-simplified.git BEEHIVE`
3. Create `BEEHIVE-BACKEND/.env` with your database password
4. Double-click `setup.bat` — sets up everything automatically
5. Double-click `start.bat` every day to launch

---

## Default Login Credentials

Created automatically by `setup.bat`:

| Role    | Email               | Password    | Phone       |
|---------|---------------------|-------------|-------------|
| Admin   | admin@beehive.com   | password123 | 09511617396 |
| Manager | manager@beehive.com | password123 | 09123456789 |
| Cashier | cashier@beehive.com | password123 | 09234567890 |
| Cook    | cook@beehive.com    | password123 | 09345678901 |

> **Change all passwords after first login** in the Account Management section.

---

## Developer Mode (Hot Reload)

For active development, skip the build steps and use the dev servers:

```bash
# Terminal 1 — Backend with hot reload
cd BEEHIVE-BACKEND
npm run dev       # runs on http://localhost:3000

# Terminal 2 — Frontend with hot reload
cd BEEHIVE-FRONTEND
npm run dev       # runs on http://localhost:5173
```

> In dev mode, access the app on port `5173`. The frontend `.env` file should point `VITE_API_URL` to `http://localhost:3000`.

---

## Environment Variables

### Backend — `BEEHIVE-BACKEND/.env`

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/beehive?schema=public"
JWT_SECRET="any-long-random-string"
PORT=3000
```

### Frontend — `BEEHIVE-FRONTEND/.env.production`

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=BEEHIVE
```

> For QR code / mobile customer ordering on the same WiFi: replace `localhost` with the server machine's LAN IP (e.g., `http://192.168.1.10:3000`). Run `ipconfig` to find the IPv4 address.

---

## Useful Commands

Run these from inside `BEEHIVE-BACKEND/`:

```bash
# View and edit database records in the browser
npx prisma studio

# Re-run seed (safe — uses upsert, won't duplicate)
npx tsx prisma/seed.ts

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
