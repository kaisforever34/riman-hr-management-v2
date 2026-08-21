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


