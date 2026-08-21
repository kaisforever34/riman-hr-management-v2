### Task 9: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: CI on push/PR running lint → typecheck → unit tests → build. Postgres service container for future integration tests (not used yet).

- [ ] **Step 1: Create workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npx tsc --noEmit

      - run: npm run test

      - run: npm run build
        env:
          DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
          AUTH_SECRET: ci-secret-ci-secret-ci-secret-123

services: {}
```

Note: build needs env vars present because `src/lib/env.ts` (Task 1) validates at import. If build fails without a real DB, set `DATABASE_URL` dummy value as above (Prisma generate doesn't connect; Next build only connects if pages are prerendered against DB — all pages here are dynamic `ƒ`, so dummy URL is safe).

- [ ] **Step 2: Verify locally the CI steps pass**

Run: `npm run lint && npx tsc --noEmit && npm run test && npm run build`
Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, test, build pipeline"
```

---


