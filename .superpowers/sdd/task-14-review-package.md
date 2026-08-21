5505bfd docs: real README with setup and deployment guide
 README.md    | 115 ++++++++++++++++++++++++++++++++++++++++++++++++-----------
 package.json |   3 +-
 2 files changed, 97 insertions(+), 21 deletions(-)
diff --git a/README.md b/README.md
index e215bc4..7750ea0 100644
--- a/README.md
+++ b/README.md
@@ -1,36 +1,111 @@
-This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
+# Riman HR Management System
 
-## Getting Started
+A full-featured HR management system for UAE-based retail operations, built with Next.js 15 (App Router), React 19, Prisma (PostgreSQL), and TypeScript. Bilingual (English/Arabic) via next-intl.
 
-First, run the development server:
+## Features
+
+- **Employee management** ΓÇö profiles, departments, manager hierarchy
+- **Leave management** ΓÇö leave types, requests, balances, approvals (UAE weekend: Fri/Sat)
+- **Attendance** ΓÇö check-in/check-out, late/absence tracking
+- **Payroll** ΓÇö payroll periods, payslips, deductions
+- **Documents** ΓÇö personal and company documents
+- **Performance reviews** ΓÇö quarterly reviews with criteria and goals
+- **Surveys, Notifications, Assets & Expenses**
+- **Onboarding/Offboarding** ΓÇö task templates and checklists
+- **Company Directory & Dashboard**
+
+### Roles
+
+- **HR Admin** ΓÇö full access
+- **Manager** ΓÇö team-level access
+- **Employee** ΓÇö self-service access
+
+## Prerequisites
+
+- Node.js 20+
+- PostgreSQL 14+
+- Docker (optional, for containerized deployment)
+
+## Local Setup
 
 ```bash
+# 1. Install dependencies
+npm ci
+
+# 2. Configure environment
+cp .env.example .env
+# Edit .env and set:
+#   DATABASE_URL  ΓÇô PostgreSQL connection string
+#   AUTH_SECRET   ΓÇô random secret for next-auth (e.g. `openssl rand -base64 32`)
+#   AUTH_URL      ΓÇô app base URL (http://localhost:3000 locally)
+
+# 3. Create schema
+npx prisma migrate dev
+
+# 4. Seed the database (leave types, task templates, sample data)
+npm run db:seed
+
+# 5. Start the dev server
 npm run dev
-# or
-yarn dev
-# or
-pnpm dev
-# or
-bun dev
 ```
 
-Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
+Open http://localhost:3000.
+
+### Default seeded credentials
+
+The seed script creates an admin account and sample employees with **hardcoded default passwords**. These are well-known defaults ΓÇö **change them immediately in any production environment** before exposing the app.
+
+## Testing
+
+```bash
+npm run test        # Vitest unit tests
+npm run test:watch  # Watch mode
+npm run test:e2e    # Playwright E2E tests
+```
+
+### Full verification
 
-You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.
+Runs lint, typecheck, tests, and production build:
+
+```bash
+npm run verify
+```
 
-This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.
+## Docker Deployment
 
-## Learn More
+The Dockerfile builds a standalone Next.js image. On startup, the entrypoint:
+
+1. Runs `prisma migrate deploy` (applies pending migrations)
+2. Seeds the database only if no users exist
+3. Starts the server
+
+### Build and run
+
+```bash
+docker build -t riman-hr .
+
+docker run -d \
+  -p 3000:3000 \
+  -e DATABASE_URL="postgresql://user:pass@host:5432/riman_hr" \
+  -e AUTH_SECRET="your-random-secret" \
+  -e AUTH_URL="https://your-domain.com" \
+  riman-hr
+```
 
-To learn more about Next.js, take a look at the following resources:
+**Required environment variables:**
 
-- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
-- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
+| Variable       | Description                              |
+| -------------- | ---------------------------------------- |
+| `DATABASE_URL` | PostgreSQL connection string             |
+| `AUTH_SECRET`  | Secret for signing auth sessions         |
+| `AUTH_URL`     | Public base URL of the deployed app      |
 
-You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
+### Health check
 
-## Deploy on Vercel
+The container exposes a health endpoint at `/api/health`, used by the Docker `HEALTHCHECK` (every 30s).
 
-The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.
+## Security Notes
 
-Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
+- Seeded accounts use default passwords ΓÇö rotate them before production use.
+- Set a strong `AUTH_SECRET` (32+ random bytes).
+- Restrict database access to the app server.
diff --git a/package.json b/package.json
index bff977e..5b03da1 100644
--- a/package.json
+++ b/package.json
@@ -4,21 +4,22 @@
   "private": true,
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint",
     "typecheck": "tsc --noEmit",
     "verify": "npm run lint && npm run typecheck && npm run test && npm run build",
     "test": "vitest run",
     "test:watch": "vitest",
-    "test:e2e": "playwright test"
+    "test:e2e": "playwright test",
+    "db:seed": "tsx prisma/seed.ts"
   },
   "dependencies": {
     "@base-ui/react": "^1.4.1",
     "@hookform/resolvers": "^4.1.3",
     "@prisma/adapter-pg": "^7.8.0",
     "@prisma/client": "^5.22.0",
     "@prisma/nextjs-monorepo-workaround-plugin": "^7.8.0",
     "@radix-ui/react-label": "^2.1.8",
     "@radix-ui/react-slot": "^1.2.4",
     "bcryptjs": "^3.0.3",
