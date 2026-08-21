23ec7ce feat: add global and locale-level error boundaries
 src/app/[locale]/(auth)/error.tsx | 28 ++++++++++++++++++++++++++++
 src/app/[locale]/error.tsx        | 28 ++++++++++++++++++++++++++++
 src/app/global-error.tsx          | 14 ++++++++++++++
 3 files changed, 70 insertions(+)
diff --git a/src/app/[locale]/(auth)/error.tsx b/src/app/[locale]/(auth)/error.tsx
new file mode 100644
index 0000000..7de378f
--- /dev/null
+++ b/src/app/[locale]/(auth)/error.tsx
@@ -0,0 +1,28 @@
+'use client'
+
+import { useEffect } from 'react'
+import { Button } from '@/components/ui/button'
+import { AlertTriangle } from 'lucide-react'
+
+export default function AuthError({
+  error,
+  reset,
+}: {
+  error: Error & { digest?: string }
+  reset: () => void
+}) {
+  useEffect(() => {
+    console.error(error)
+  }, [error])
+
+  return (
+    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
+      <AlertTriangle className="h-12 w-12 text-audit-red" />
+      <h2 className="text-xl font-semibold">Something went wrong</h2>
+      <p className="max-w-md text-center text-sm text-ledger-text-secondary">
+        An unexpected error occurred. Please try again.
+      </p>
+      <Button onClick={reset}>Try again</Button>
+    </div>
+  )
+}
diff --git a/src/app/[locale]/error.tsx b/src/app/[locale]/error.tsx
new file mode 100644
index 0000000..8731c92
--- /dev/null
+++ b/src/app/[locale]/error.tsx
@@ -0,0 +1,28 @@
+'use client'
+
+import { useEffect } from 'react'
+import { Button } from '@/components/ui/button'
+import { AlertTriangle } from 'lucide-react'
+
+export default function LocaleError({
+  error,
+  reset,
+}: {
+  error: Error & { digest?: string }
+  reset: () => void
+}) {
+  useEffect(() => {
+    console.error(error)
+  }, [error])
+
+  return (
+    <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
+      <AlertTriangle className="h-12 w-12 text-audit-red" />
+      <h2 className="text-xl font-semibold">Something went wrong</h2>
+      <p className="max-w-md text-center text-sm text-ledger-text-secondary">
+        An unexpected error occurred. Please try again.
+      </p>
+      <Button onClick={reset}>Try again</Button>
+    </div>
+  )
+}
diff --git a/src/app/global-error.tsx b/src/app/global-error.tsx
new file mode 100644
index 0000000..4889cd3
--- /dev/null
+++ b/src/app/global-error.tsx
@@ -0,0 +1,14 @@
+'use client'
+
+export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
+  return (
+    <html lang="en">
+      <body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
+        <div style={{ textAlign: 'center' }}>
+          <h1>Something went wrong</h1>
+          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Try again</button>
+        </div>
+      </body>
+    </html>
+  )
+}
