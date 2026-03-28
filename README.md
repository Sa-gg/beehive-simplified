# 🐝 BEEHIVE POS System

A full-stack Point-of-Sale system for café/restaurant management, featuring an admin dashboard with order tracking, inventory, sales analytics, menu management, and staff accounts.

---

## Tech Stack

### Backend
| Tool | Version |
|---|---|
| Node.js | ≥ 20.x |
| TypeScript | 5.9.x |
| Express.js | 5.2.x |
| Prisma ORM | 7.1.x |
| PostgreSQL | 15+ recommended |
| Bcrypt | 6.0.x |
| JSON Web Token | 9.0.x |
| Multer | 2.0.x |
| tsx (dev runner) | 4.21.x |

### Frontend
| Tool | Version |
|---|---|
| React | 19.2.x |
| TypeScript | 5.9.x |
| Vite | 7.2.x |
| Tailwind CSS | 4.1.x |
| React Router DOM | 7.10.x |
| Zustand | 5.0.x |
| Recharts | 3.5.x |
| Radix UI | various |
| Lucide React | 0.556.x |
| Axios | 1.13.x |

---

## Project Structure

```
BEEHIVE/
├── BEEHIVE-BACKEND/     # Express + Prisma REST API
├── BEEHIVE-FRONTEND/    # React + Vite admin dashboard
└── DOCUMENTS/           # System diagrams
```

---

## Prerequisites

- **Node.js** v20 or higher — [nodejs.org](https://nodejs.org)
- **npm** v10 or higher (bundled with Node.js)
- **PostgreSQL** v15 or higher — [postgresql.org](https://www.postgresql.org)
- A PostgreSQL database created and ready (e.g. `beehive_db`)

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd BEEHIVE
```

---

### 2. Backend Setup

```bash
cd BEEHIVE-BACKEND
npm install
```

Create a `.env` file in `BEEHIVE-BACKEND/`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/beehive_db"
JWT_SECRET="your-secret-key-here"
PORT=3000
```

Push the database schema and generate the Prisma client:

```bash
npx prisma db push
npx prisma generate
```

Start the backend dev server:

```bash
npm run dev
```

The API will be running at `http://localhost:3000`.

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd BEEHIVE-FRONTEND
npm install
```

Create a `.env` file in `BEEHIVE-FRONTEND/`:

```env
VITE_API_URL=http://localhost:3000
```

Start the frontend dev server:

```bash
npm run dev
```

The app will be running at `http://localhost:5173`.

---

## Scripts

### Backend

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run serve` | Run compiled production build |
| `npx prisma db push` | Sync schema to database (no migration history) |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |
| `npx prisma studio` | Open Prisma database GUI |

### Frontend

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## API Endpoints

| Resource | Endpoint |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/register` |
| Menu Items | `GET/POST/PUT/DELETE /api/menu-items` |
| Categories | `/api/categories` |
| Add-ons | `/api/addons` |
| Orders | `/api/orders` |
| Inventory | `/api/inventory` |
| Stock Transactions | `/api/stock-transactions` |
| Sales | `/api/sales` |
| Expenses | `/api/expenses` |
| Customers | `/api/customers` |
| Dashboard | `/api/dashboard` |
| Settings | `/api/settings` |
| Upload | `/api/upload` |

Full API documentation is in [BEEHIVE-BACKEND/API_DOCUMENTATION.md](BEEHIVE-BACKEND/API_DOCUMENTATION.md).

---

## Environment Variables Reference

### Backend (`.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/beehive_db` |
| `JWT_SECRET` | Secret key for signing JWT tokens | `supersecretkey123` |
| `PORT` | Port the API server listens on | `3000` |

### Frontend (`.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Base URL of the backend API | `http://localhost:3000` |

---

## Production Build

### Backend

```bash
cd BEEHIVE-BACKEND
npm run build
npm run serve
```

### Frontend

```bash
cd BEEHIVE-FRONTEND
npm run build
# Static files will be in dist/ — serve with any static host or nginx
```

---

## Database Management

```bash
# View and edit data in the browser
npx prisma studio

# Reset and re-push schema (⚠️ destructive — drops and recreates tables)
npx prisma db push --force-reset

# Seed initial data
npx tsx prisma/seed.ts
```

---

## License

ISC
