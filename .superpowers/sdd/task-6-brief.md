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


