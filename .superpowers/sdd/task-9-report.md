# Task 9 Report: GitHub Actions CI

## Status
Complete.

## Changes
- `.github/workflows/ci.yml`: merged brief requirements into pre-existing workflow.
  - Kept: checkout, setup-node (node 20, npm cache), `npm ci`, `npx prisma generate`, lint, typecheck, unit tests (`npm test`).
  - Added: Build step with env vars `DATABASE_URL: postgresql://ci:ci@localhost:5432/ci` and `AUTH_SECRET` dummy value (required by `src/lib/env.ts` validation at import).
  - Triggers: `push: branches [main]`, `pull_request:` with no branch filter (per brief).
- `vitest.config.ts`: fixed pre-existing typecheck failure — Vitest 4 removed `poolOptions.forks.singleFork`; replaced with `fileParallelism: false` (preserves the intent of commit 6059657 "stabilize vitest worker pool on Windows").

## Verification
Local run of all CI steps (excluding build, per instructions):
`npx prisma generate && npm run lint && npx tsc --noEmit && npm run test`
- prisma generate: OK
- lint: OK
- typecheck: OK (after vitest.config.ts fix)
- unit tests: 75/75 passed (7 files)

Full build not run locally per instructions; CI build uses dummy DATABASE_URL since all pages are dynamic.

## Commit
`fa709ba` ci: add lint, typecheck, test, build pipeline

## Concerns
- The Postgres service container from the brief was omitted (`services: {}` was empty in the brief anyway); can be added when integration tests land.
- Build step is unverified locally; if prerendering ever hits the DB, the dummy URL could fail in CI.
