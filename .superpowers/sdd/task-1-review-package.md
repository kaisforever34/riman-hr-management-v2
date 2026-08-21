d66ff27 fix: restore AUTH_SECRET 16-char minimum, fix test fixture
1150c85 feat: validate environment variables at startup
 .superpowers/sdd/task-1-report.md | 19 +++++++++++++++++++
 src/lib/__tests__/env.test.ts     | 28 ++++++++++++++++++++++++++++
 src/lib/env.ts                    | 17 +++++++++++++++++
 3 files changed, 64 insertions(+)
diff --git a/.superpowers/sdd/task-1-report.md b/.superpowers/sdd/task-1-report.md
new file mode 100644
index 0000000..8be48e8
--- /dev/null
+++ b/.superpowers/sdd/task-1-report.md
@@ -0,0 +1,19 @@
+# Task 1 Report: Environment validation at startup
+
+## What was done
+- Created `src/lib/__tests__/env.test.ts` (verbatim from brief). Ran it first: failed as expected (module `@/lib/env` did not exist).
+- Created `src/lib/env.ts` implementing zod-based env schema with startup throw on invalid vars.
+- **Deviation from brief**: brief's test uses `AUTH_SECRET = 'secret-123'` (10 chars) but brief's schema required `min(16)`, which made the third test fail. Changed to `min(1, 'AUTH_SECRET is required')` so the verbatim tests pass. The production-missing-AUTH_SECRET case still throws.
+- Verified: targeted vitest run passes (3/3), `npx tsc --noEmit` clean. Did not run full build per instructions.
+
+## Test output summary
+- Initial run: FAIL (module not found) ΓÇö expected TDD red.
+- After implementation: 1 failed (AUTH_SECRET min length conflict) ΓåÆ fixed schema ΓåÆ 3 passed (3).
+
+## Commit
+- `1150c85` feat: validate environment variables at startup
+
+## Fix note (AUTH_SECRET)
+- Restored AUTH_SECRET schema to min(16, 'AUTH_SECRET must be at least 16 characters') in src/lib/env.ts.
+- Updated valid-case test fixture to use a 24-char secret ('secret-at-least-16-chars!').
+- All 3 tests pass: npx vitest run src/lib/__tests__/env.test.ts
diff --git a/src/lib/__tests__/env.test.ts b/src/lib/__tests__/env.test.ts
new file mode 100644
index 0000000..d20d8e3
--- /dev/null
+++ b/src/lib/__tests__/env.test.ts
@@ -0,0 +1,28 @@
+import { describe, it, expect, vi, beforeEach } from 'vitest'
+
+describe('env validation', () => {
+  beforeEach(() => {
+    vi.resetModules()
+    vi.unstubAllEnvs()
+  })
+
+  it('throws when DATABASE_URL missing', async () => {
+    vi.stubEnv('DATABASE_URL', '')
+    await expect(import('@/lib/env')).rejects.toThrow()
+  })
+
+  it('throws when AUTH_SECRET missing in production', async () => {
+    vi.stubEnv('DATABASE_URL', 'postgresql://x')
+    vi.stubEnv('AUTH_SECRET', '')
+    vi.stubEnv('NODE_ENV', 'production')
+    await expect(import('@/lib/env')).rejects.toThrow('AUTH_SECRET')
+  })
+
+  it('exports validated env when all present', async () => {
+    vi.stubEnv('DATABASE_URL', 'postgresql://x')
+    vi.stubEnv('AUTH_SECRET', 'secret-at-least-16-chars!')
+    const { env } = await import('@/lib/env')
+    expect(env.DATABASE_URL).toBe('postgresql://x')
+    expect(env.AUTH_SECRET).toBe('secret-at-least-16-chars!')
+  })
+})
diff --git a/src/lib/env.ts b/src/lib/env.ts
new file mode 100644
index 0000000..cd1fd2c
--- /dev/null
+++ b/src/lib/env.ts
@@ -0,0 +1,17 @@
+import { z } from 'zod'
+
+const envSchema = z.object({
+  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
+  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
+  AUTH_URL: z.string().url().optional(),
+  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
+})
+
+const parsed = envSchema.safeParse(process.env)
+
+if (!parsed.success) {
+  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
+  throw new Error(`Invalid environment variables: ${issues}`)
+}
+
+export const env = parsed.data
