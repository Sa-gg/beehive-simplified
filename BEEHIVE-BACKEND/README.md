# Beehive Backend

A restaurant POS and management system API built with Express, TypeScript, and Prisma.

## Tech Stack

- **Node.js** with TypeScript
- **Express 5** for HTTP framework
- **Prisma 7** as ORM (with PostgreSQL adapter)
- **PostgreSQL** for database
- **Multer** for file uploads
- **JWT** for authentication
- **Bcrypt** for password hashing
- **Axios** for HTTP requests

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL database
- npm or yarn

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory with the following:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/beehive
JWT_SECRET=your_jwt_secret
PORT=3000
```

### Database Setup

```bash
npx prisma migrate dev
```

### Seed Database

```bash
npx tsx prisma/seed.ts
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm run serve
```

## Project Structure

```
BEEHIVE-BACKEND/
├── index.ts                  # Application entry point
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── prisma/
│   ├── schema.prisma         # Database schema definition
│   ├── seed.ts               # Database seeder
│   └── migrations/           # Database migration files
├── generated/
│   └── prisma/               # Prisma Client (auto-generated)
├── src/
│   ├── types/                # TypeScript interfaces & DTOs
│   ├── repositories/         # Database operations
│   ├── services/             # Business logic
│   ├── controllers/          # HTTP request handlers
│   ├── routes/               # Route definitions
│   ├── middleware/            # Express middleware (auth, etc.)
│   ├── customers/            # Customer-specific module
│   ├── seed/                 # Seed data
│   └── utils/                # Utilities (upload, image processing)
├── scripts/                  # Data migration & backup scripts
└── public/
    └── uploads/              # Uploaded files storage
```

## API Modules

- **Auth** — Registration, login, JWT authentication
- **Menu Items** — CRUD for menu items with image uploads
- **Categories** — Menu item categorization
- **Orders** — Order management and tracking
- **Inventory** — Stock and ingredient management
- **Sales** — Sales reporting and analytics
- **Expenses** — Expense tracking
- **Dashboard** — Aggregated stats and insights
- **Customers** — Customer management and loyalty
- **Loyalty** — Loyalty points system
- **Mood Settings** — Mood-based recommendation engine
- **Addons** — Menu item addon/variant management
- **Recipes** — Recipe and ingredient linking
- **Settings** — Application settings
- **Uploads** — File upload handling

The project follows a **Layered Architecture** pattern — see `ARCHITECTURE.md` for details.

## License

Private
