# Riman HR Management System

A full-featured HR management system for UAE-based retail operations, built with Next.js 15 (App Router), React 19, Prisma (PostgreSQL), and TypeScript. Bilingual (English/Arabic) via next-intl.

## Features

- **Employee management** — profiles, departments, manager hierarchy
- **Leave management** — leave types, requests, balances, approvals (UAE weekend: Fri/Sat)
- **Attendance** — check-in/check-out, late/absence tracking
- **Payroll** — payroll periods, payslips, deductions
- **Documents** — personal and company documents
- **Performance reviews** — quarterly reviews with criteria and goals
- **Surveys, Notifications, Assets & Expenses**
- **Onboarding/Offboarding** — task templates and checklists
- **Company Directory & Dashboard**

### Roles

- **HR Admin** — full access
- **Manager** — team-level access
- **Employee** — self-service access

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Docker (optional, for containerized deployment)

## Local Setup

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env
# Edit .env and set:
#   DATABASE_URL  – PostgreSQL connection string
#   AUTH_SECRET   – random secret for next-auth (e.g. `openssl rand -base64 32`)
#   AUTH_URL      – app base URL (http://localhost:3000 locally)

# 3. Create schema
npx prisma migrate dev

# 4. Seed the database (leave types, task templates, sample data)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

### Default seeded credentials

The seed script creates an admin account and sample employees with **hardcoded default passwords**. These are well-known defaults — **change them immediately in any production environment** before exposing the app.

## Testing

```bash
npm run test        # Vitest unit tests
npm run test:watch  # Watch mode
npm run test:e2e    # Playwright E2E tests
```

### Full verification

Runs lint, typecheck, tests, and production build:

```bash
npm run verify
```

## Docker Deployment

The Dockerfile builds a standalone Next.js image. On startup, the entrypoint:

1. Runs `prisma migrate deploy` (applies pending migrations)
2. Seeds the database only if no users exist
3. Starts the server

### Build and run

```bash
docker build -t riman-hr .

docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/riman_hr" \
  -e AUTH_SECRET="your-random-secret" \
  -e AUTH_URL="https://your-domain.com" \
  riman-hr
```

**Required environment variables:**

| Variable       | Description                              |
| -------------- | ---------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string             |
| `AUTH_SECRET`  | Secret for signing auth sessions         |
| `AUTH_URL`     | Public base URL of the deployed app      |

### Health check

The container exposes a health endpoint at `/api/health`, used by the Docker `HEALTHCHECK` (every 30s).

## Security Notes

- Seeded accounts use default passwords — rotate them before production use.
- Set a strong `AUTH_SECRET` (32+ random bytes).
- Restrict database access to the app server.
