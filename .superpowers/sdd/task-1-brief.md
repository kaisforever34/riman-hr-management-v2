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


