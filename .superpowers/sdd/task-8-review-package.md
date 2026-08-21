6059657 fix: stabilize vitest worker pool on Windows
 vitest.config.ts | 4 ++++
 1 file changed, 4 insertions(+)
diff --git a/vitest.config.ts b/vitest.config.ts
index 1c96f83..94c2bf7 100644
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -2,17 +2,21 @@ import { defineConfig } from 'vitest/config'
 import react from '@vitejs/plugin-react'
 import path from 'path'
 
 export default defineConfig({
   plugins: [react()],
   test: {
     environment: 'jsdom',
     globals: true,
     setupFiles: ['./src/lib/__tests__/setup.ts'],
     exclude: ['e2e/**', 'node_modules/**'],
+    pool: 'forks',
+    poolOptions: { forks: { singleFork: true } },
+    testTimeout: 20000,
+    hookTimeout: 20000,
   },
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   },
 })
