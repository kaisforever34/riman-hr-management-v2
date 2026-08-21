4949f30 feat: add /api/health endpoint with db check
 src/app/api/health/route.ts | 13 +++++++++++++
 1 file changed, 13 insertions(+)
diff --git a/src/app/api/health/route.ts b/src/app/api/health/route.ts
new file mode 100644
index 0000000..9f45e34
--- /dev/null
+++ b/src/app/api/health/route.ts
@@ -0,0 +1,13 @@
+import { NextResponse } from 'next/server'
+import { db } from '@/lib/db'
+
+export const dynamic = 'force-dynamic'
+
+export async function GET() {
+  try {
+    await db.$queryRaw`SELECT 1`
+    return NextResponse.json({ status: 'ok', db: 'up' })
+  } catch {
+    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })
+  }
+}
