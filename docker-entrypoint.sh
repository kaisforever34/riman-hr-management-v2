#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Seeding database..."
npx prisma db seed

echo "Setting auth secret..."
export AUTH_SECRET="${AUTH_SECRET:-33ea70de375170db98f03913214b9de14da27a693422bbc0878b3a6517beaa17}"
export NEXTAUTH_URL="${NEXTAUTH_URL:-https://riman-hr-management-v2-production.up.railway.app}"

echo "Starting application..."
exec node server.js
