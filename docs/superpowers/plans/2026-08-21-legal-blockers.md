# Legal Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the three legal/security blockers: authenticated private document storage, an audit log for sensitive actions, and instant session revocation on deactivation.

**Architecture:** Files move from `public/uploads` to `<root>/private-uploads`, served through authorized API routes. An `AuditLog` table plus a failure-tolerant `logAudit` helper instruments sensitive server actions. `User.tokenVersion` is checked in the next-auth JWT callback to invalidate sessions of deactivated users.

**Tech Stack:** Next.js 15 route handlers, Prisma 5, next-auth v5 JWT callbacks, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-legal-blockers-design.md`

## Global Constraints

- `npm run verify` green at the end; existing tests keep passing (90+)
- No file contents or filesystem paths ever leaked in HTTP responses/logs
- Audit logging must never break the business action it wraps
- i18n en/ar key parity maintained
- Existing documents in `public/uploads` must remain downloadable after migration

---

### Task 1: Schema — AuditLog + tokenVersion

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via CLI

**Interfaces:**
- Produces: `db.auditLog` model; `User.tokenVersion Int @default(0)`.

- [ ] **Step 1: Edit schema**

Add to `model User` (after `updatedAt`):
```prisma
  tokenVersion Int    @default(0)
```

Add new model:
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actorEmail String?
  action     String
  entityType String
  entityId   String?
  detail     Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

- [ ] **Step 2: Migrate**

Run: `npx prisma migrate dev --name audit_log_and_token_version` (timeout ≥180000ms)

- [ ] **Step 3: Verify**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "feat: add AuditLog table and User.tokenVersion"
```

---

### Task 2: Private storage for uploads

**Files:**
- Modify: `src/lib/upload.ts`
- Modify: `src/lib/document-upload.ts`
- Modify: `src/lib/actions/document.ts` (delete path resolution)
- Modify: `.gitignore`, `docker-compose.yml`, `Dockerfile`
- Create: `private-uploads/.gitkeep`

**Interfaces:**
- Produces: `uploadLeaveAttachment(file)` and `uploadDocument(file, subDir)` now return **storage keys** like `leaves/<filename>` / `documents/employees/<filename>` (no leading slash, no `/uploads/` prefix). New export `PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')` from `src/lib/upload.ts`.

- [ ] **Step 1: Rewrite `src/lib/upload.ts`**

```ts
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const PRIVATE_UPLOAD_ROOT = join(process.cwd(), 'private-uploads')

const UPLOAD_DIR = join(PRIVATE_UPLOAD_ROOT, 'leaves')
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}

export async function uploadLeaveAttachment(file: File): Promise<string | null> {
  const ext = ALLOWED_TYPES[file.type]
  if (!ext) return null
  if (file.size > MAX_SIZE) return null

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, filename), buffer)

  return `leaves/${filename}`
}
```

- [ ] **Step 2: Rewrite `src/lib/document-upload.ts`** the same way: `BASE_DIR = join(PRIVATE_UPLOAD_ROOT, 'documents')` (import `PRIVATE_UPLOAD_ROOT` from `./upload`), return `documents/${subDir}/${filename}`.

- [ ] **Step 3: Fix `deleteDocument` in `src/lib/actions/document.ts`**

Replace the unlink block:
```ts
  try {
    const fullPath = join(process.cwd(), 'private-uploads', doc.filePath)
    await unlink(fullPath)
  } catch {
    // File may not exist on disk — still remove DB record
  }
```
Also handle legacy keys: if `doc.filePath` starts with `/uploads/`, strip that prefix before joining (`doc.filePath.replace(/^\/uploads\//, '')`) so pre-migration records still delete correctly.

- [ ] **Step 4: Move existing files + git hygiene**

```powershell
if (Test-Path public/uploads) { Move-Item public/uploads private-uploads -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Force private-uploads | Out-Null
New-Item -ItemType File -Force private-uploads/.gitkeep | Out-Null
```
Add to `.gitignore`: `private-uploads/*` and `!private-uploads/.gitkeep`. Remove any tracked files under `public/uploads` via `git rm -r --cached public/uploads` if present.

- [ ] **Step 5: Docker**

`docker-compose.yml` app service volumes:
```yaml
    volumes:
      - ./private-uploads:/app/private-uploads
```
`Dockerfile` runner stage (before `USER nextjs`):
```dockerfile
RUN mkdir -p /app/private-uploads && chown nextjs:nodejs /app/private-uploads
```

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npm run test` (timeout ≥300000ms). Note: `src/lib/__tests__/actions.test.ts` mocks `@/lib/document-upload` with a `/uploads/documents/...` return value — update the mock to return `documents/employees/test.pdf`.

```bash
git add src/lib/upload.ts src/lib/document-upload.ts src/lib/actions/document.ts .gitignore docker-compose.yml Dockerfile private-uploads/.gitkeep src/lib/__tests__/actions.test.ts
git commit -m "feat: move uploads to private storage outside web root"
```

---

### Task 3: Authenticated download routes

**Files:**
- Create: `src/app/api/documents/[id]/route.ts`
- Create: `src/app/api/documents/leave/[id]/route.ts`
- Test: `src/lib/__tests__/document-route.test.ts`

**Interfaces:**
- Consumes: `db.employeeDocument/companyDocument/leaveRequest`, `auth()`.
- Produces: `GET /api/documents/[id]` (query `type=employee|company`), `GET /api/documents/leave/[id]`.

- [ ] **Step 1: Write failing tests** covering the authorization matrix with mocked `auth()` and `db`:

| Case | Expect |
|---|---|
| unauthenticated | 401 |
| employee downloads own EmployeeDocument | 200 |
| employee downloads other's EmployeeDocument | 403 |
| MANAGER downloads any EmployeeDocument | 200 |
| any user downloads CompanyDocument | 200 |
| missing record | 404 |

Test the route handler functions directly by importing them (Next route handlers are plain functions). Mock `next/headers` not needed; mock `@/lib/auth` and `@/lib/db`; assert on `Response.status`. For file streaming, mock `fs/promises.readFile` to resolve a Buffer.

- [ ] **Step 2: Implement `src/app/api/documents/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import { join, resolve } from 'path'
import { PRIVATE_UPLOAD_ROOT } from '@/lib/upload'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const type = req.nextUrl.searchParams.get('type') ?? 'employee'

  let doc: { fileName: string; filePath: string; fileType: string; uploadedById?: string; employee?: { userId: string } | null } | null = null
  if (type === 'company') {
    doc = await db.companyDocument.findUnique({ where: { id } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } else {
    doc = await db.employeeDocument.findUnique({ where: { id }, include: { employee: { select: { userId: true } } } })
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const isOwner = doc.employee?.userId === session.user.id
    const isManager = session.user.role === 'MANAGER' || session.user.role === 'HR_ADMIN'
    if (!isOwner && !isManager) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const relativeKey = doc.filePath.replace(/^\/uploads\//, '')
  const fullPath = resolve(join(PRIVATE_UPLOAD_ROOT, relativeKey))
  if (!fullPath.startsWith(resolve(PRIVATE_UPLOAD_ROOT))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buffer = await readFile(fullPath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': doc.fileType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.fileName.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
```

- [ ] **Step 3: Implement `src/app/api/documents/leave/[id]/route.ts`**

Same pattern: load `leaveRequest.findUnique({ where: { id } , include: { employee: { select: { userId: true } } } })`; 404 if none or no `attachmentFile`; owner-or-manager authorization identical; stream from `join(PRIVATE_UPLOAD_ROOT, attachmentFile.replace(/^\/uploads\//, ''))` with filename derived from the stored key's basename.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/__tests__/document-route.test.ts` (timeout ≥180000ms)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/documents" src/lib/__tests__/document-route.test.ts
git commit -m "feat: authenticated document download routes"
```

---

### Task 4: Update UI links to use download routes

**Files:**
- Modify: `src/app/[locale]/(hr)/manager/documents/page.tsx` (pass `id` + `type` instead of raw filePath)
- Modify: `src/app/[locale]/(hr)/manager/documents/documents-client.tsx` (href → `/api/documents/${doc.id}?type=employee|company`)
- Modify: `src/app/[locale]/(hr)/leave/[id]/page.tsx` + `leave-detail-client.tsx` (attachment href → `/api/documents/leave/${request.id}`)
- Modify: `src/app/[locale]/(hr)/manager/leaves/[id]/page.tsx` + `manager-leave-action-client.tsx` (same)

- [ ] **Step 1:** In each client component replace `<a href={doc.filePath}>` / `<a href={request.attachmentFile}>` with the route URLs above. Keep `download` attributes.
- [ ] **Step 2:** Ensure pages pass document `id` into props (documents page already selects filePath; add `id`).
- [ ] **Step 3:** Verify: `npx tsc --noEmit && npm run lint`
- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(hr)"
git commit -m "feat: serve document links through authenticated routes"
```

---

### Task 5: Audit helper + instrumentation

**Files:**
- Create: `src/lib/audit.ts`
- Test: `src/lib/__tests__/audit.test.ts`
- Modify: `src/lib/actions/leave.ts`, `employee.ts`, `document.ts`, `attendance.ts`

**Interfaces:**
- Produces: `logAudit(entry: { actorId?: string; actorEmail?: string; action: string; entityType: string; entityId?: string; detail?: Record<string, unknown> }): Promise<void>` — never throws.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi } from 'vitest'

const { mockDb, mockLogger } = vi.hoisted(() => ({
  mockDb: { auditLog: { create: vi.fn() } },
  mockLogger: { error: vi.fn() },
}))
vi.mock('@/lib/db', () => ({ db: mockDb }))
vi.mock('@/lib/logger', () => ({ logger: mockLogger }))

import { logAudit } from '@/lib/audit'

describe('logAudit', () => {
  it('writes an audit row', async () => {
    mockDb.auditLog.create.mockResolvedValueOnce({})
    await logAudit({ actorId: 'u1', actorEmail: 'a@b.c', action: 'LEAVE_APPROVED', entityType: 'LeaveRequest', entityId: 'r1' })
    expect(mockDb.auditLog.create).toHaveBeenCalledOnce()
  })

  it('swallows database errors', async () => {
    mockDb.auditLog.create.mockRejectedValueOnce(new Error('down'))
    await expect(logAudit({ action: 'X', entityType: 'Y' })).resolves.toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Implement `src/lib/audit.ts`**

```ts
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'

export type AuditEntry = {
  actorId?: string
  actorEmail?: string
  action: string
  entityType: string
  entityId?: string
  detail?: Record<string, unknown>
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        detail: (entry.detail ?? undefined) as undefined,
      },
    })
  } catch (e) {
    logger.error('audit write failed', { action: entry.action, error: String(e) })
  }
}
```

- [ ] **Step 3: Instrument actions** — call `await logAudit({...})` after each successful operation (session available in scope):
  - `approveLeave`: action `LEAVE_APPROVED`, entity LeaveRequest, detail `{ employeeId, durationDays }`
  - `rejectLeave`: `LEAVE_REJECTED`, detail `{ rejectReason }`
  - `cancelLeave`: `LEAVE_CANCELLED`, detail `{ previousStatus: request.status }`
  - `createEmployee`: `EMPLOYEE_CREATED`, entity Employee, entityId from created record (capture `const created = await db.user.create(...)`)
  - `updateEmployeeWorkWeek`: `EMPLOYEE_UPDATED`, detail `{ workWeek }`
  - `uploadEmployeeDoc`/`uploadCompanyDoc`: `DOCUMENT_UPLOADED`, entityId = doc id (capture create result)
  - `deleteDocument`: `DOCUMENT_DELETED`
  - `managerOverrideAttendance`: `ATTENDANCE_OVERRIDE`, detail `{ employeeId, date }`
  - actorEmail: `session.user.email ?? null` (email exists on session user).

- [ ] **Step 4: Run tests**

Run: `npm run test` (timeout ≥300000ms). Existing action tests use mocked db without `auditLog` — add `auditLog: { create: vi.fn() }` to their mockDb objects where needed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/audit.ts src/lib/__tests__/audit.test.ts src/lib/actions
git commit -m "feat: audit logging for sensitive HR actions"
```

---

### Task 6: Session revocation

**Files:**
- Modify: `src/lib/auth.config.ts` (jwt callback), `src/lib/auth.ts` (authorize sets tokenVersion)
- Modify: `src/lib/actions/employee.ts` (add `deactivateEmployee`)
- Modify: employees list UI (deactivate button) + i18n

**Interfaces:**
- Produces: `deactivateEmployee(formData)` (HR_ADMIN only); all sessions invalid after deactivation.

- [ ] **Step 1: JWT callback**

In `auth.config.ts`:
```ts
import { db } from '@/lib/db'

callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.role = user.role
      token.id = user.id
      token.name = user.name
      token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0
      return token
    }
    if (token.id) {
      try {
        const u = await db.user.findUnique({ where: { id: token.id as string }, select: { isActive: true, tokenVersion: true } })
        if (!u || !u.isActive || u.tokenVersion !== token.tokenVersion) {
          return {} as typeof token // invalidates session
        }
      } catch {
        return {} as typeof token // fail closed
      }
    }
    return token
  },
  session({ session, token }) { /* unchanged */ },
}
```
Extend the module-level `JWT` declaration with `tokenVersion?: number`. Note: `auth.config.ts` currently has no db import (it's used in middleware edge runtime) — verify middleware compatibility; if middleware bundles db and breaks, move the check into a callback file shared only by the Node runtime config, or use `import '@prisma/client'`-free fetch approach. If edge-incompatible, implement the check in `src/lib/auth.ts`'s config extension instead (middleware uses authConfig without the db check; Node routes use full config). Document which path was taken in the report.

- [ ] **Step 2: authorize() returns tokenVersion**

In `src/lib/auth.ts` `authorize`, include `tokenVersion: user.tokenVersion` in the returned object.

- [ ] **Step 3: `deactivateEmployee` action**

```ts
export async function deactivateEmployee(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeUserId = formData.get('userId') as string
  if (!employeeUserId) return { error: await serverError('invalidRequest') }
  if (employeeUserId === session.user.id) return { error: await serverError('invalidRequest') }

  const user = await db.user.findUnique({ where: { id: employeeUserId }, include: { employee: true } })
  if (!user) return { error: await serverError('employeeNotFound') }

  await db.$transaction([
    db.user.update({ where: { id: employeeUserId }, data: { isActive: false, tokenVersion: { increment: 1 } } }),
    ...(user.employee ? [db.employee.update({ where: { id: user.employee.id }, data: { isActive: false } })] : []),
  ])

  await logAudit({
    actorId: session.user.id, actorEmail: session.user.email,
    action: 'EMPLOYEE_DEACTIVATED', entityType: 'User', entityId: employeeUserId,
  })

  revalidatePath('/employees')
}
```

- [ ] **Step 4: UI** — add a "Deactivate" button per employee row in the employees list (HR_ADMIN-only render), `<form action={deactivateEmployee}>` with hidden `userId`, confirm dialog via native `onSubmit` confirm following existing patterns. i18n keys `employees.deactivate` + confirmation text in en/ar.

- [ ] **Step 5: Verify + commit**

Run: `npm run build` (timeout ≥600000ms) — middleware must build (edge runtime check). Then `npm run test`.

```bash
git add src/lib src/app/[locale]/(hr)/employees src/i18n/messages
git commit -m "feat: instant session revocation via tokenVersion"
```

---

### Task 7: Audit log viewer

**Files:**
- Create: `src/lib/queries/audit.ts` (`getAuditLogs(take=200)`)
- Create: `src/app/[locale]/(hr)/manager/audit-log/page.tsx` + `audit-log-client.tsx`
- Modify: sidebar (admin-only nav item), en/ar messages (`auditLog` namespace + `nav.auditLog`)

- [ ] **Step 1: Query**

```ts
import { db } from '@/lib/db'
import type { AuditLog } from '@prisma/client'

export async function getAuditLogs(take = 200): Promise<AuditLog[]> {
  return db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take })
}
```

- [ ] **Step 2: Page** mirrors holidays page structure: HR_ADMIN-only (redirect others to dashboard), force-dynamic, JSON-serialized props. Client: text filter input filtering by action/actorEmail/entityType client-side; table columns: time (localized), actor email, action, entity type/id, JSON.stringify(detail) truncated to ~80 chars.

- [ ] **Step 3: Sidebar + i18n** — nav item shown only for HR_ADMIN (`show: isAdmin` pattern from holidays entry). Keys: `nav.auditLog` ("Audit Log" / "سجل التدقيق"), `auditLog.title`, `auditLog.time`, `auditLog.actor`, `auditLog.action`, `auditLog.entity`, `auditLog.detail`, `auditLog.empty`.

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)

```bash
git add src/lib/queries/audit.ts "src/app/[locale]/(hr)/manager/audit-log" src/components/layout/sidebar.tsx src/i18n/messages
git commit -m "feat: audit log viewer for admins"
```

---

### Task 8: Full verification

- [ ] `npm run verify` (timeout ≥600000ms) — all green
- [ ] Manual smoke: upload a document → confirm file lands in `private-uploads/` and old `/uploads/...` URL returns 404; download via UI works; deactivate a test user → their session dies on next request; perform a leave approval → row appears in /manager/audit-log.

## Self-Review

- **Spec coverage:** private storage (Tasks 2–4) ✓, download routes + matrix (Task 3) ✓, audit schema/helper/instrumentation/viewer (Tasks 1, 5, 7) ✓, revocation (Tasks 1, 6) ✓, legacy-path compatibility handled in Tasks 2–3 ✓.
- **Placeholders:** Task 6 Step 1 contains a documented contingency (edge-runtime db import) with both paths specified — acceptable, decision recorded in report.
- **Type consistency:** `logAudit` signature consistent between Tasks 5–6; `PRIVATE_UPLOAD_ROOT` exported in Task 2, consumed in Task 3; storage-key format (`leaves/x`, `documents/subdir/x`) consistent across Tasks 2–3.
