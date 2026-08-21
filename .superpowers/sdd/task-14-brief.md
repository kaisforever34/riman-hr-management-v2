### Task 14: Real README with deployment guide

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace README with project-specific content**

Cover: prerequisites (Node 20, Postgres), `cp .env.example .env`, `npm ci`, `npx prisma migrate dev`, `npm run db:seed` (add script `"db:seed": "tsx prisma/seed.ts"`), `npm run dev`, test commands, `npm run verify`, Docker build/run with required env vars, health check URL, default seeded admin credentials warning (change immediately in production).

- [ ] **Step 2: Commit**

```bash
git add README.md package.json
git commit -m "docs: real README with setup and deployment guide"
```

---


