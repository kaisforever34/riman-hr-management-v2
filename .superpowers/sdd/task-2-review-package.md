e9698c0 feat: add security headers and harden next config
 next.config.ts | 15 ++++++++++++++-
 1 file changed, 14 insertions(+), 1 deletion(-)
diff --git a/next.config.ts b/next.config.ts
index fb0cf97..0efba1f 100644
--- a/next.config.ts
+++ b/next.config.ts
@@ -1,10 +1,23 @@
 import createNextIntlPlugin from "next-intl/plugin";
 import type { NextConfig } from "next";
 
 const withNextIntl = createNextIntlPlugin();
 
+const securityHeaders = [
+  { key: "X-Frame-Options", value: "DENY" },
+  { key: "X-Content-Type-Options", value: "nosniff" },
+  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
+  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
+  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
+];
+
 const nextConfig: NextConfig = {
-  output: 'standalone',
+  output: "standalone",
+  poweredByHeader: false,
+  reactStrictMode: true,
+  async headers() {
+    return [{ source: "/:path*", headers: securityHeaders }];
+  },
 };
 
 export default withNextIntl(nextConfig);
