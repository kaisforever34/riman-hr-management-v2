fa709ba ci: add lint, typecheck, test, build pipeline
 .github/workflows/ci.yml | 7 ++++++-
 vitest.config.ts         | 2 +-
 2 files changed, 7 insertions(+), 2 deletions(-)
diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
index 13a8395..1786b5c 100644
--- a/.github/workflows/ci.yml
+++ b/.github/workflows/ci.yml
@@ -1,17 +1,16 @@
 name: CI
 
 on:
   push:
     branches: [main]
   pull_request:
-    branches: [main]
 
 jobs:
   verify:
     runs-on: ubuntu-latest
 
     steps:
       - uses: actions/checkout@v4
 
       - uses: actions/setup-node@v4
         with:
@@ -25,10 +24,16 @@ jobs:
         run: npx prisma generate
 
       - name: Lint
         run: npm run lint
 
       - name: Typecheck
         run: npx tsc --noEmit
 
       - name: Unit tests
         run: npm test
+
+      - name: Build
+        run: npm run build
+        env:
+          DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
+          AUTH_SECRET: ci-secret-ci-secret-ci-secret-123
diff --git a/vitest.config.ts b/vitest.config.ts
index 94c2bf7..1dee8b7 100644
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -3,20 +3,20 @@ import react from '@vitejs/plugin-react'
 import path from 'path'
 
 export default defineConfig({
   plugins: [react()],
   test: {
     environment: 'jsdom',
     globals: true,
     setupFiles: ['./src/lib/__tests__/setup.ts'],
     exclude: ['e2e/**', 'node_modules/**'],
     pool: 'forks',
-    poolOptions: { forks: { singleFork: true } },
+    fileParallelism: false,
     testTimeout: 20000,
     hookTimeout: 20000,
   },
   resolve: {
     alias: {
       '@': path.resolve(__dirname, './src'),
     },
   },
 })
