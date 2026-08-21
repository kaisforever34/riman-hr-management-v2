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
