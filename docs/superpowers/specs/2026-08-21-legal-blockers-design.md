# Legal Blockers: Private Documents, Audit Log, Session Revocation — Design

Date: 2026-08-21
Status: Approved

## Problem

Three deployment blockers identified in the stakeholder review:
1. Uploaded documents (sick notes = medical data) are served unauthenticated from `public/uploads`.
2. No audit trail for sensitive HR actions — indefensible in labor disputes.
3. Deactivated users keep valid JWT sessions until token expiry.

## Decisions

- Storage: private local disk (no cloud dependency).
- Audit scope: sensitive actions only (leave decisions, employee/salary changes, documents, attendance overrides).
- Revocation mechanism: per-user `tokenVersion` checked in the JWT callback.

## 1. Private Document Storage + Authenticated Downloads

### Storage
- Upload root moves from `public/uploads` to `<projectRoot>/private-uploads` (gitignored, outside Next.js web root).
- Docker: add volume mount `./private-uploads:/app/private-uploads` in docker-compose.yml and ensure the directory exists in the runner image with nextjs ownership.
- Existing files in `public/uploads`: moved to `private-uploads/` preserving relative paths; `public/uploads` deleted from git tracking.

### Download route
`src/app/api/documents/[id]/route.ts`:
```
GET /api/documents/[id]?type=employee|company|leave
```
- Auth required (401 otherwise).
- Authorization matrix:
  - `type=employee`: owner employee OR MANAGER/HR_ADMIN → 403 otherwise.
  - `type=company`: any authenticated active user.
  - `type=leave`: leave attachment; owner employee OR MANAGER/HR_ADMIN.
- Resolves DB record → file path under private root (path traversal guard: resolved path must startWith upload root), streams with stored fileType/content-type, `Content-Disposition: attachment; filename="<stored fileName>"`.
- 404 when record or file missing.

### Upload changes
- `src/lib/upload.ts` and `src/lib/document-upload.ts`: write into private root; return a storage key (relative path) not a public URL.
- Leave attachments already store a path string in `LeaveRequest.attachmentFile` — keep storing the relative key; UI renders link `/api/documents/<id>?type=leave`. For leave attachments there is no document row, so route accepts `?type=leave&requestId=<id>` variant OR resolve by key lookup on LeaveRequest.attachmentFile. Decision: add `GET /api/documents/leave/[id]` route resolving LeaveRequest by id → authorization → stream attachmentFile. Simpler than overloading one route.
- UI links updated wherever documents render (documents-client, leave detail).

## 2. Audit Log

### Schema
```prisma
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  actorEmail String?
  action     String   // LEAVE_APPROVED, LEAVE_REJECTED, LEAVE_CANCELLED, EMPLOYEE_CREATED, EMPLOYEE_UPDATED, EMPLOYEE_DEACTIVATED, SALARY_CHANGED, DOCUMENT_UPLOADED, DOCUMENT_DELETED, ATTENDANCE_OVERRIDE
  entityType String
  entityId   String?
  detail     Json?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([createdAt])
}
```

### Helper
`src/lib/audit.ts`: `logAudit({ actorId, actorEmail, action, entityType, entityId?, detail? })` — fire-and-forget; catches and logs its own errors via logger so audit failure never breaks the business action.

### Instrumented actions
- `approveLeave`, `rejectLeave`, `cancelLeave` (detail: requestId, employeeId, durationDays)
- `createEmployee` (detail: new employeeId, role)
- `updateEmployeeWorkWeek` + salary change path if present in employee update actions (detail: fields changed)
- Employee deactivation (where isActive is toggled)
- `uploadEmployeeDoc`, `uploadCompanyDoc`, `deleteDocument`
- `managerOverrideAttendance`

### Viewer
`/manager/audit-log` page (HR_ADMIN only): newest-first table (time, actor email, action, entity, detail summary), simple filter by action text. Server component + minimal client filter. Sidebar nav entry (admin-only). i18n en/ar.

## 3. Session Revocation

### Schema
```prisma
model User {
  // existing fields...
  tokenVersion Int @default(0)
}
```

### JWT callback (`src/lib/auth.config.ts`)
When `token.id` exists (authenticated request), fetch user by id (PK lookup); invalidate session when user missing, `isActive === false`, or `user.tokenVersion !== token.tokenVersion` (return an empty/tokenless object). Store `tokenVersion` in the token at sign-in. Unauthenticated/sign-in flow unchanged. Rate limiting untouched.

### Deactivation
Wherever employees/users are deactivated, increment `tokenVersion` in the same write. If no deactivation action exists yet, add `deactivateEmployee` server action (HR_ADMIN only) that sets `isActive=false` on User+Employee and increments tokenVersion, then wire it to the employees list UI.

## Error Handling
- Download route: 401/403/404 JSON errors; never leak filesystem paths.
- logAudit failures logged via logger.error only.
- JWT callback DB failure: fail closed (treat as invalid) but count as server error in logs.

## Testing
- Route tests: authorization matrix (owner / other employee / manager / unauthenticated).
- audit helper test (writes row, swallows db error).
- Action tests extended minimally where audit calls are added (mock db.auditLog.create).
- Migration applied to dev DB; `npm run verify` green.

## Out of Scope
- Cloud storage, signed URLs, antivirus scanning of uploads.
- Audit log export/retention jobs.
- MFA, password policy.
