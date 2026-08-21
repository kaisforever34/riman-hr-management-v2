4991daa feat: add structured JSON logger
 src/lib/__tests__/logger.test.ts | 23 +++++++++++++++++++++++
 src/lib/logger.ts                | 13 +++++++++++++
 2 files changed, 36 insertions(+)
diff --git a/src/lib/__tests__/logger.test.ts b/src/lib/__tests__/logger.test.ts
new file mode 100644
index 0000000..f31112b
--- /dev/null
+++ b/src/lib/__tests__/logger.test.ts
@@ -0,0 +1,23 @@
+import { describe, it, expect, vi, afterEach } from 'vitest'
+import { logger } from '@/lib/logger'
+
+describe('logger', () => {
+  afterEach(() => vi.restoreAllMocks())
+
+  it('error writes to stderr with level and message', () => {
+    const spy = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
+    logger.error('db failed', { code: 'P2002' })
+    expect(spy).toHaveBeenCalled()
+    const out = JSON.parse(String(vi.mocked(spy).mock.calls[0][0]))
+    expect(out.level).toBe('error')
+    expect(out.msg).toBe('db failed')
+    expect(out.code).toBe('P2002')
+    expect(out.time).toBeDefined()
+  })
+
+  it('info writes to stdout', () => {
+    const spy = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
+    logger.info('started')
+    expect(spy).toHaveBeenCalled()
+  })
+})
diff --git a/src/lib/logger.ts b/src/lib/logger.ts
new file mode 100644
index 0000000..ece43e8
--- /dev/null
+++ b/src/lib/logger.ts
@@ -0,0 +1,13 @@
+type Level = 'info' | 'warn' | 'error'
+
+function write(level: Level, msg: string, meta?: Record<string, unknown>) {
+  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...meta })
+  if (level === 'info') process.stdout.write(line + '\n')
+  else process.stderr.write(line + '\n')
+}
+
+export const logger = {
+  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
+  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
+  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
+}
