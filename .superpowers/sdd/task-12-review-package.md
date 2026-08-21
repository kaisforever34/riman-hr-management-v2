2edf63f chore: tune prisma client logging for production
 src/lib/db.ts | 24 +++++++++++++++++++++---
 1 file changed, 21 insertions(+), 3 deletions(-)
diff --git a/src/lib/db.ts b/src/lib/db.ts
index b207402..376b4a8 100644
--- a/src/lib/db.ts
+++ b/src/lib/db.ts
@@ -1,9 +1,27 @@
-import { PrismaClient } from '@prisma/client'
+import { PrismaClient, type Prisma } from '@prisma/client'
+
+import { logger } from '@/lib/logger'
 
 const globalForPrisma = globalThis as unknown as {
   prisma: PrismaClient | undefined
 }
 
-export const db = globalForPrisma.prisma ?? new PrismaClient()
+export const db =
+  globalForPrisma.prisma ??
+  new PrismaClient({
+    log:
+      process.env.NODE_ENV === 'production'
+        ? [{ emit: 'event', level: 'error' }]
+        : ['warn', 'error'],
+  })
 
-if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
+if (process.env.NODE_ENV === 'production') {
+  ;(db as PrismaClient<Prisma.PrismaClientOptions, 'error'>).$on(
+    'error',
+    (e) => {
+      logger.error(e.message)
+    }
+  )
+} else {
+  globalForPrisma.prisma = db
+}
