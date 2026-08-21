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


