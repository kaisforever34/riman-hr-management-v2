# Task 14 Report: Real README with deployment guide

## Status
Complete.

## Changes
- Replaced boilerplate README.md with project-specific content:
  - Prerequisites (Node 20, Postgres 14+)
  - Local setup: `cp .env.example .env`, `npm ci`, `npx prisma migrate dev`, `npm run db:seed`, `npm run dev`
  - Env vars documented (DATABASE_URL, AUTH_SECRET, AUTH_URL)
  - Test commands + `npm run verify`
  - Docker build/run with required env vars table; entrypoint behavior (migrate deploy, seed-if-empty); health check at `/api/health`
  - Security warning about hardcoded default seeded credentials (admin@riman.com and sample employees) — must be changed in production; passwords not printed in README
- Added `"db:seed": "tsx prisma/seed.ts"` to package.json scripts; verified via `npm run`.

## Commit
`5505bfd` — docs: real README with setup and deployment guide

## Concerns
- Seed passwords are hardcoded in prisma/seed.ts (admin123 / employee123) rather than env-based. README warns to change them immediately; a follow-up could make them env-configurable.
