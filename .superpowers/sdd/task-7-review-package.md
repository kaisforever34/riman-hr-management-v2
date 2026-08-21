c26ee43 feat: add docker healthcheck and idempotent seeding
 Dockerfile           |  3 +++
 docker-entrypoint.sh | 13 +++++++++++--
 2 files changed, 14 insertions(+), 2 deletions(-)
diff --git a/Dockerfile b/Dockerfile
index e72df37..5e190a0 100644
--- a/Dockerfile
+++ b/Dockerfile
@@ -28,16 +28,19 @@ COPY --from=builder /app/prisma ./prisma
 COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
 COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
 COPY docker-entrypoint.sh ./docker-entrypoint.sh
 
 RUN npm install -g tsx && \
     npm install prisma@5.22.0 --save-dev && \
     rm -rf /tmp/.npm && \
     chown -R nextjs:nodejs /app/prisma /app/node_modules/@prisma /app/node_modules/.prisma /app/node_modules/prisma /app/node_modules/.bin /app/docker-entrypoint.sh && \
     chmod +x /app/docker-entrypoint.sh
 
+HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
+  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
+
 USER nextjs
 EXPOSE 3000
 ENV PORT=3000
 ENV HOSTNAME=0.0.0.0
 
 ENTRYPOINT ["/app/docker-entrypoint.sh"]
diff --git a/docker-entrypoint.sh b/docker-entrypoint.sh
index bcb8e92..9019d03 100644
--- a/docker-entrypoint.sh
+++ b/docker-entrypoint.sh
@@ -1,11 +1,20 @@
 #!/bin/sh
 set -e
 
 echo "Running database migrations..."
 npx prisma migrate deploy
 
-echo "Seeding database..."
-npx prisma db seed
+USER_COUNT=$(node -e "
+const { PrismaClient } = require('@prisma/client');
+const p = new PrismaClient();
+p.user.count().then(c => { console.log(c); process.exit(0); }).catch(() => { console.log('err'); process.exit(0); });
+")
+if [ "$USER_COUNT" = "0" ]; then
+  echo "Seeding database..."
+  npx prisma db seed
+else
+  echo "Database already seeded (users: $USER_COUNT), skipping seed."
+fi
 
 echo "Starting application..."
 exec node server.js
