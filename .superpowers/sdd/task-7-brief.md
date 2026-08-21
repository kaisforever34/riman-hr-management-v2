### Task 7: Docker healthcheck + entrypoint hardening

**Files:**
- Modify: `Dockerfile`
- Modify: `docker-entrypoint.sh`

- [ ] **Step 1: Add HEALTHCHECK to Dockerfile (before `USER nextjs`)**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
```

- [ ] **Step 2: Make seeding idempotent-safe in entrypoint — only seed when DB empty**

Replace `docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('err'); process.exit(0); });
")
if [ "$USER_COUNT" = "0" ]; then
  echo "Seeding database..."
  npx prisma db seed
else
  echo "Database already seeded (users: $USER_COUNT), skipping seed."
fi

echo "Starting application..."
exec node server.js
```

This prevents re-seeding (duplicate key errors / data overwrite) on every container restart.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile docker-entrypoint.sh
git commit -m "feat: add docker healthcheck and idempotent seeding"
```

---


