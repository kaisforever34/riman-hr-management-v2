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


