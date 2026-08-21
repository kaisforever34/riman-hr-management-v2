# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Riman HR production-ready: zero errors, reliable, secure, fast.

**Architecture:** Harden the existing Next.js 15 + Prisma + next-auth app in layers: (1) environment/startup validation, (2) security headers + rate limiting, (3) error handling + logging, (4) test/CI infrastructure, (5) performance, (6) deployment polish. Each task is independently verifiable via build/lint/test.

**Tech Stack:** Next.js 15.5, Prisma 5, next-auth v5 beta, Vitest 4, Playwright, Docker, GitHub Actions.

## Global Constraints

- Node 20, npm (package-lock.json exists)
- All existing tests must keep passing: `npx vitest run` (67 tests)
- `npm run build` must succeed after every task
- `npm run lint` must pass (0 errors)
- Do not change Prisma schema unless a task says so
- Do not commit secrets; .env stays gitignored (verify)
- Windows dev environment (pwsh) — use cross-platform commands in CI

---

### Task 1: Environment validation at startup

**Files:**
- Create: `src/lib/env.ts`
- Test: `src/lib/__tests__/env.test.ts`

**Interfaces:**
- Produces: `env` object (typed, validated). Later tasks import `{ env }` instead of `process.env`.

- [ ] **Step 1: Install zod-based env validation (zod already present, no install needed). Write failing test**

```ts
// src/lib/__tests__/env.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('throws when DATABASE_URL missing', async () => {
    vi.stubEnv('DATABASE_URL', '')
    await expect(import('@/lib/env')).rejects.toThrow()
  })

  it('throws when AUTH_SECRET missing in production', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://x')
    vi.stubEnv('AUTH_SECRET', '')
    vi.stubEnv('NODE_ENV', 'production')
    await expect(import('@/lib/env')).rejects.toThrow('AUTH_SECRET')
  })

  it('exports validated env when all present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://x')
    vi.stubEnv('AUTH_SECRET', 'secret-123')
    const { env } = await import('@/lib/env')
    expect(env.DATABASE_URL).toBe('postgresql://x')
    expect(env.AUTH_SECRET).toBe('secret-123')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: FAIL (module does not exist)

- [ ] **Step 3: Implement `src/lib/env.ts`**

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  AUTH_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
  throw new Error(`Invalid environment variables: ${issues}`)
}

export const env = parsed.data
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/env.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Verify full suite + build still green**

Run: `npx vitest run && npm run lint`
Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/env.ts src/lib/__tests__/env.test.ts
git commit -m "feat: validate environment variables at startup"
```

---

### Task 2: Security headers + hardened next.config

**Files:**
- Modify: `next.config.ts`

**Interfaces:**
- Produces: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy on all responses.

- [ ] **Step 1: Update `next.config.ts`**

```ts
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
```

Note: no strict CSP yet (Next.js inline scripts break it); add nonce-based CSP later if required. HSTS only matters over HTTPS — harmless on localhost.

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: success

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: add security headers and harden next config"
```

---

### Task 3: Rate limiting for auth (signin brute-force protection)

**Files:**
- Create: `src/lib/rate-limit.ts`
- Modify: `src/lib/auth.ts`
- Test: `src/lib/__tests__/rate-limit.test.ts`

**Interfaces:**
- Produces: `checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number }` — in-memory sliding window (5 attempts / 15 min per key). Single-instance deployment is the target; swap for Redis later if scaling horizontally.

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/rate-limit.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => resetRateLimits())

  it('allows first attempts', () => {
    expect(checkRateLimit('ip1').ok).toBe(true)
  })

  it('blocks after 5 attempts', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip2')
    const result = checkRateLimit('ip2')
    expect(result.ok).toBe(false)
    expect(result.retryAfterSec).toBeGreaterThan(0)
  })

  it('tracks keys independently', () => {
    for (let i = 0; i < 5; i++) checkRateLimit('ip3')
    expect(checkRateLimit('ip4').ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/lib/__tests__/rate-limit.test.ts`
Expected: FAIL (module missing)

- [ ] **Step 3: Implement `src/lib/rate-limit.ts`**

```ts
const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const attempts = new Map<string, number[]>()

export function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0]
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) }
  }
  recent.push(now)
  attempts.set(key, recent)
  return { ok: true }
}

export function resetRateLimits() {
  attempts.clear()
}
```

- [ ] **Step 4: Wire into `src/lib/auth.ts` authorize()**

Add import and at top of `authorize`:

```ts
import { checkRateLimit } from './rate-limit'
// inside authorize(credentials), before schema parse:
const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : ''
if (email) {
  const rl = checkRateLimit(`signin:${email}`)
  if (!rl.ok) return null
}
```

Returning `null` shows generic "credentials invalid" — do not reveal rate-limit state to attacker.

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/lib/__tests__/rate-limit.test.ts && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/rate-limit.ts src/lib/auth.ts src/lib/__tests__/rate-limit.test.ts
git commit -m "feat: rate-limit sign-in attempts per email"
```

---

### Task 4: Global error boundary + error.tsx for root

**Files:**
- Check existing: `src/app/[locale]/(hr)/error.tsx` (exists)
- Create: `src/app/[locale]/error.tsx`
- Create: `src/app/[locale]/(auth)/error.tsx` (only if missing)
- Create: `src/app/global-error.tsx`

**Interfaces:**
- Produces: error UI at every route segment level; `global-error.tsx` catches root layout crashes.

- [ ] **Step 1: Read `src/app/[locale]/(hr)/error.tsx` and mirror its pattern (i18n + reset button) for `src/app/[locale]/error.tsx` and `src/app/global-error.tsx`.**

`src/app/global-error.tsx` (must render its own html/body):

```tsx
'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success

- [ ] **Step 3: Commit**

```bash
git add src/app
git commit -m "feat: add global and locale-level error boundaries"
```

---

### Task 5: Structured server-side logging

**Files:**
- Create: `src/lib/logger.ts`
- Modify: `src/lib/db.ts` (log slow queries / errors in dev)
- Test: `src/lib/__tests__/logger.test.ts`

**Interfaces:**
- Produces: `logger.info/warn/error(msg, meta?)` — JSON lines in production, readable in dev. No external service dependency (Sentry optional later).

- [ ] **Step 1: Write failing test**

```ts
// src/lib/__tests__/logger.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks())

  it('error writes to stderr with level and message', () => {
    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    logger.error('db failed', { code: 'P2002' })
    expect(spy).toHaveBeenCalled()
    const out = JSON.parse(String(vi.mocked(spy).mock.calls[0][0]))
    expect(out.level).toBe('error')
    expect(out.msg).toBe('db failed')
    expect(out.code).toBe('P2002')
    expect(out.time).toBeDefined()
  })

  it('info writes to stdout', () => {
    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    logger.info('started')
    expect(spy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Verify fail**

Run: `npx vitest run src/lib/__tests__/logger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/lib/logger.ts`**

```ts
type Level = 'info' | 'warn' | 'error'

function write(level: Level, msg: string, meta?: Record<string, unknown>) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...meta })
  if (level === 'info') process.stdout.write(line + '\n')
  else process.stderr.write(line + '\n')
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/logger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/logger.ts src/lib/__tests__/logger.test.ts
git commit -m "feat: add structured JSON logger"
```

---

### Task 6: Health check endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

**Interfaces:**
- Produces: `GET /api/health` → `{ status: 'ok', db: 'up' | 'down' }` with 200/503. Used by Docker healthcheck and uptime monitors. Must bypass auth — middleware matcher already excludes `/api`.

- [ ] **Step 1: Create route**

```ts
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok', db: 'up' })
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })
  }
}
```

- [ ] **Step 2: Verify middleware excludes it**

`src/middleware.ts:53` matcher `/((?!api|_next|_vercel|.*\\..*).*)` already excludes `/api`. No change needed.

- [ ] **Step 3: Build + commit**

Run: `npm run build`

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health endpoint with db check"
```

---

### Task 7: Docker healthcheck + entrypoint hardening

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-entrypoint.sh`

- [ ] **Step 1: Add HEALTHCHECK to Dockerfile (before `USER nextjs`)**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

- [ ] **Step 2: Make seeding idempotent-safe in entrypoint — only seed when DB empty**

Replace `docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('err'); process.exit(0); });
")
if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding database..."
  npx prisma db seed
else
  echo "Database already seeded (users: $USER_COUNT), skipping seed."
fi

echo "Starting application..."
exec node server.js
```

This prevents re-seeding (duplicate key errors / data overwrite) on every container restart.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile docker-entrypoint.sh
git commit -m "feat: add docker healthcheck and idempotent seeding"
```

---

### Task 8: Fix vitest worker timeouts (CI reliability)

**Files:**
- Modify: `vitest.config.ts`

**Context:** `npm run test` intermittently fails with "Timeout waiting for worker to respond" on Windows forks pool; verbose run passes. Stabilize pool config.

- [ ] **Step 1: Update vitest.config.ts**

```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/__tests__/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 2: Run `npm run test` (not verbose) 3 times**

Expected: 67+ tests pass every time, no worker errors

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "fix: stabilize vitest worker pool on Windows"
```

---

### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: CI on push/PR running lint → typecheck → unit tests → build. Postgres service container for future integration tests (not used yet).

- [ ] **Step 1: Create workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npx tsc --noEmit

      - run: npm run test

      - run: npm run build
        env:
          DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
          AUTH_SECRET: ci-secret-ci-secret-ci-secret-123

services: {}
```

Note: build needs env vars present because `src/lib/env.ts` (Task 1) validates at import. If build fails without a real DB, set `DATABASE_URL` dummy value as above (Prisma generate doesn't connect; Next build only connects if pages are prerendered against DB — all pages here are dynamic `ƒ`, so dummy URL is safe).

- [ ] **Step 2: Verify locally the CI steps pass**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, test, build pipeline"
```

---

### Task 10: Add `typecheck` script + strict unused checks

**Files:**
- Modify: `package.json` (scripts)
- Modify: `tsconfig.json`

- [ ] **Step 1: Add scripts to package.json**

```json
"typecheck": "tsc --noEmit",
"verify": "npm run lint && npm run typecheck && npm run test && npm run build"
```

- [ ] **Step 2: Add to tsconfig.json compilerOptions**

```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noFallthroughCasesInSwitch": true
```

- [ ] **Step 3: Run `npm run typecheck` and fix any reported unused variables (delete dead code, do not prefix with underscore unless parameter).**

Run: `npm run typecheck`
Expected: 0 errors after fixes

- [ ] **Step 4: Run full verify**

Run: `npm run verify`
Expected: all green

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src
git commit -m "chore: add typecheck script and stricter tsconfig"
```

---

### Task 11: Database indexes for hot query paths

**Files:**
- Modify: `prisma/schema.prisma`
- Create: new migration via `npx prisma migrate dev --name add_performance_indexes`

**Context:** Manager lists filter by status/date frequently; notifications poll unread per user.

- [ ] **Step 1: Add indexes to schema**

In `LeaveRequest`:
```prisma
  @@index([employeeId, status])
  @@index([status, startDate, endDate])
```

In `AttendanceRecord`:
```prisma
  @@index([employeeId, date])
```
(unique already covers this — skip; instead add)
```prisma
  @@index([date])
```

In `Notification`:
```prisma
  @@index([userId, isRead])
```

In `Payslip`:
```prisma
  @@index([employeeId])
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name add_performance_indexes`
Expected: migration created and applied to dev DB

- [ ] **Step 3: Verify build + tests**

Run: `npx prisma generate && npm run verify`
Expected: green

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "perf: add indexes for leave, attendance, notification queries"
```

---

### Task 12: Prisma production connection tuning

**Files:**
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Update db.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'error' }]
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

(If Task 5 logger exists, wire `db.$on('error', e => logger.error(e.message))` for production.)

- [ ] **Step 2: Verify + commit**

Run: `npm run verify`

```bash
git add src/lib/db.ts
git commit -m "chore: tune prisma client logging for production"
```

---

### Task 13: Remove junk files from repo

**Files:**
- Delete: `response.html`, `signin-test.html`, `cookies.txt`, `TASK-STATE.md` (verify contents first — if TASK-STATE.md is wanted, move to docs/)
- Verify: `.gitignore` includes `.env`, `test-results/`, `playwright-report/`

- [ ] **Step 1: Inspect each file briefly, then delete test artifacts**

```bash
git rm response.html signin-test.html cookies.txt
```

- [ ] **Step 2: Check .gitignore covers: `.env`, `.next/`, `node_modules/`, `test-results/`, `playwright-report/`. Add missing entries.**

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: remove test artifacts and harden gitignore"
```

---

### Task 14: Real README with deployment guide

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with project-specific content**

Cover: prerequisites (Node 20, Postgres), `cp .env.example .env`, `npm ci`, `npx prisma migrate dev`, `npm run db:seed` (add script `"db:seed": "tsx prisma/seed.ts"`), `npm run dev`, test commands, `npm run verify`, Docker build/run with required env vars, health check URL, default seeded admin credentials warning (change immediately in production).

- [ ] **Step 2: Commit**

```bash
git add README.md package.json
git commit -m "docs: real README with setup and deployment guide"
```

---

## Self-Review

- **Spec coverage:** env validation ✓, security headers ✓, rate limiting ✓, error boundaries ✓, logging ✓, health check ✓, docker ✓, CI ✓, typecheck ✓, DB indexes ✓, connection tuning ✓, repo hygiene ✓, docs ✓. Not included (deliberate, follow-up): Sentry integration, E2E Playwright suite, image optimization audit, Redis rate limiting for multi-instance.
- **Placeholders:** Task 14 README content is described not written — acceptable since it documents commands defined in the plan itself; write it fully during execution.
- **Type consistency:** `checkRateLimit` returns `{ ok, retryAfterSec? }` used only in Task 3. `logger` used in Task 12 optionally — Task 12 notes the conditional.
