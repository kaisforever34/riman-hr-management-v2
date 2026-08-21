1f5bb3c chore: add typecheck script and stricter tsconfig
 package.json  | 2 ++
 tsconfig.json | 3 +++
 2 files changed, 5 insertions(+)
diff --git a/package.json b/package.json
index e4bd82b..bff977e 100644
--- a/package.json
+++ b/package.json
@@ -1,19 +1,21 @@
 {
   "name": "riman-hr",
   "version": "0.1.0",
   "private": true,
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint",
+    "typecheck": "tsc --noEmit",
+    "verify": "npm run lint && npm run typecheck && npm run test && npm run build",
     "test": "vitest run",
     "test:watch": "vitest",
     "test:e2e": "playwright test"
   },
   "dependencies": {
     "@base-ui/react": "^1.4.1",
     "@hookform/resolvers": "^4.1.3",
     "@prisma/adapter-pg": "^7.8.0",
     "@prisma/client": "^5.22.0",
     "@prisma/nextjs-monorepo-workaround-plugin": "^7.8.0",
diff --git a/tsconfig.json b/tsconfig.json
index c133409..61603ea 100644
--- a/tsconfig.json
+++ b/tsconfig.json
@@ -1,17 +1,20 @@
 {
   "compilerOptions": {
     "target": "ES2017",
     "lib": ["dom", "dom.iterable", "esnext"],
     "allowJs": true,
     "skipLibCheck": true,
     "strict": true,
+    "noUnusedLocals": true,
+    "noUnusedParameters": true,
+    "noFallthroughCasesInSwitch": true,
     "noEmit": true,
     "esModuleInterop": true,
     "module": "esnext",
     "moduleResolution": "bundler",
     "resolveJsonModule": true,
     "isolatedModules": true,
     "jsx": "preserve",
     "incremental": true,
     "plugins": [
       {
