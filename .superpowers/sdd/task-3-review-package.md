c30d2b0 feat: rate-limit sign-in attempts per email
 src/lib/__tests__/rate-limit.test.ts | 23 +++++++++++++++++++++++
 src/lib/auth.ts                      |  7 +++++++
 src/lib/rate-limit.ts                | 20 ++++++++++++++++++++
 3 files changed, 50 insertions(+)
diff --git a/src/lib/__tests__/rate-limit.test.ts b/src/lib/__tests__/rate-limit.test.ts
new file mode 100644
index 0000000..5ca8447
--- /dev/null
+++ b/src/lib/__tests__/rate-limit.test.ts
@@ -0,0 +1,23 @@
+// src/lib/__tests__/rate-limit.test.ts
+import { describe, it, expect, beforeEach } from 'vitest'
+import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit'
+
+describe('checkRateLimit', () => {
+  beforeEach(() => resetRateLimits())
+
+  it('allows first attempts', () => {
+    expect(checkRateLimit('ip1').ok).toBe(true)
+  })
+
+  it('blocks after 5 attempts', () => {
+    for (let i = 0; i < 5; i++) checkRateLimit('ip2')
+    const result = checkRateLimit('ip2')
+    expect(result.ok).toBe(false)
+    expect(result.retryAfterSec).toBeGreaterThan(0)
+  })
+
+  it('tracks keys independently', () => {
+    for (let i = 0; i < 5; i++) checkRateLimit('ip3')
+    expect(checkRateLimit('ip4').ok).toBe(true)
+  })
+})
diff --git a/src/lib/auth.ts b/src/lib/auth.ts
index bbf84e4..03cc40a 100644
--- a/src/lib/auth.ts
+++ b/src/lib/auth.ts
@@ -1,16 +1,17 @@
 import NextAuth from 'next-auth'
 import Credentials from 'next-auth/providers/credentials'
 import bcrypt from 'bcryptjs'
 import { authConfig } from './auth.config'
 import { db } from './db'
 import { signInSchema } from './validations/auth'
+import { checkRateLimit } from './rate-limit'
 import type { Role } from '@prisma/client'
 
 declare module 'next-auth' {
   interface User {
     role?: Role
     name?: string
   }
   interface Session {
     user: {
       id: string
@@ -33,20 +34,26 @@ const secret = process.env.AUTH_SECRET
 if (!secret && process.env.NODE_ENV === 'production') {
   throw new Error('AUTH_SECRET must be set in production')
 }
 
 export const { auth, signIn, signOut, handlers } = NextAuth({
   ...authConfig,
 
   providers: [
     Credentials({
       async authorize(credentials) {
+        const rlEmail = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : ''
+        if (rlEmail) {
+          const rl = checkRateLimit(`signin:${rlEmail}`)
+          if (!rl.ok) return null
+        }
+
         const parsed = signInSchema.safeParse(credentials)
         if (!parsed.success) return null
 
         const { email, password } = parsed.data
         const user = await db.user.findUnique({ where: { email } })
 
         if (!user || !user.isActive) return null
 
         const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
         if (!passwordsMatch) return null
diff --git a/src/lib/rate-limit.ts b/src/lib/rate-limit.ts
new file mode 100644
index 0000000..d89f0b3
--- /dev/null
+++ b/src/lib/rate-limit.ts
@@ -0,0 +1,20 @@
+const WINDOW_MS = 15 * 60 * 1000
+const MAX_ATTEMPTS = 5
+
+const attempts = new Map<string, number[]>()
+
+export function checkRateLimit(key: string): { ok: boolean; retryAfterSec?: number } {
+  const now = Date.now()
+  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
+  if (recent.length >= MAX_ATTEMPTS) {
+    const oldest = recent[0]
+    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) }
+  }
+  recent.push(now)
+  attempts.set(key, recent)
+  return { ok: true }
+}
+
+export function resetRateLimits() {
+  attempts.clear()
+}
