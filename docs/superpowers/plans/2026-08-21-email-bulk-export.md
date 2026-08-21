# Email, Bulk Approvals, CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three remaining high-value features: email notifications via Resend, bulk leave approvals, and CSV exports.

**Architecture:** A fire-and-forget email module with pluggable provider (Resend; logs when API key absent). Bulk approval actions reuse per-request transactional logic and report per-id failures. CSV export route handlers with an escaping helper (Excel-safe, formula-injection guarded).

**Tech Stack:** resend npm package, Next.js route handlers, Prisma 5, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-21-email-bulk-export-design.md`

## Global Constraints

- `npm run verify` green; existing 114 tests keep passing
- Email/export failures must never break business actions
- i18n en/ar parity for all new UI strings
- All new routes/actions enforce MANAGER/HR_ADMIN (export, bulk) auth
- No secrets committed; `.env.example` updated with new optional vars

---

### Task 1: Email module (Resend) + notification integration

**Files:**
- Create: `src/lib/email.ts`
- Test: `src/lib/__tests__/email.test.ts`
- Modify: `src/lib/actions/notifications.ts` (`createNotification`, `createNotifications`)
- Modify: `.env.example`
- Modify: `package.json` (add `resend`)

**Interfaces:**
- Produces: `sendEmail({ to, subject, html }): Promise<boolean>` — returns true if sent/logged, false on failure; NEVER throws. `renderEmail(title: string, bodyLines: string[]): string` — inline-styled HTML wrapper.
- Env: `RESEND_API_KEY?`, `MAIL_FROM?` (default `'Riman HR <onboarding@resend.dev>'`).

- [ ] **Step 1: Install + failing tests**

`npm i resend`

```ts
// src/lib/__tests__/email.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResend } = vi.hoisted(() => ({ mockResend: { emails: { send: vi.fn() } } }))
vi.mock('resend', () => ({ Resend: class { constructor() { return mockResend } } }))

import { sendEmail, renderEmail } from '@/lib/email'

describe('sendEmail', () => {
  beforeEach(() => { mockResend.emails.send.mockReset(); process.env.RESEND_API_KEY = 'test-key' })

  it('sends via resend and returns true', async () => {
    mockResend.emails.send.mockResolvedValueOnce({ data: { id: '1' } })
    const ok = await sendEmail({ to: 'a@b.c', subject: 'S', html: '<p>x</p>' })
    expect(ok).toBe(true)
    expect(mockResend.emails.send).toHaveBeenCalledOnce()
  })

  it('returns false when resend errors', async () => {
    mockResend.emails.send.mockRejectedValueOnce(new Error('down'))
    expect(await sendEmail({ to: 'a@b.c', subject: 'S', html: 'x' })).toBe(false)
  })

  it('logs instead of sending when no API key', async () => {
    delete process.env.RESEND_API_KEY
    const ok = await sendEmail({ to: 'a@b.c', subject: 'S', html: 'x' })
    expect(ok).toBe(true)
    expect(mockResend.emails.send).not.toHaveBeenCalled()
  })
})

describe('renderEmail', () => {
  it('wraps title and lines in html', () => {
    const html = renderEmail('Title', ['line one', 'line two'])
    expect(html).toContain('Title')
    expect(html).toContain('line one')
  })
})
```

- [ ] **Step 2: Implement `src/lib/email.ts`**

```ts
import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const FROM = process.env.MAIL_FROM ?? 'Riman HR <onboarding@resend.dev>'

let client: Resend | null = null
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!client) client = new Resend(process.env.RESEND_API_KEY)
  return client
}

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const c = getClient()
    if (!c) {
      logger.info('email suppressed (no RESEND_API_KEY)', { to: opts.to, subject: opts.subject })
      return true
    }
    await c.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html })
    return true
  } catch (e) {
    logger.error('email send failed', { to: opts.to, subject: opts.subject, error: String(e) })
    return false
  }
}

export function renderEmail(title: string, bodyLines: string[]): string {
  const body = bodyLines.map((l) => `<p style="margin:0 0 12px;color:#333;font-size:14px;">${escapeHtml(l)}</p>`).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
<h2 style="color:#111;font-size:18px;margin:0 0 16px;">${escapeHtml(title)}</h2>${body}
<p style="margin:24px 0 0;color:#999;font-size:12px;">Riman HR System</p></div>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
```

- [ ] **Step 3: Integrate into notifications**

In `src/lib/actions/notifications.ts`: extend both helpers with an optional email fan-out. After creating the in-app row(s), resolve emails and send:

```ts
import { sendEmail, renderEmail } from '@/lib/email'

const EMAIL_TYPES = new Set(['LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'ONBOARDING_TASK'])

async function emailUsers(userIds: string[], type: string, title: string, message?: string) {
  if (!EMAIL_TYPES.has(type)) return
  const users = await db.user.findMany({ where: { id: { in: userIds }, isActive: true }, select: { email: true } })
  await Promise.all(users.map((u) => sendEmail({ to: u.email, subject: title, html: renderEmail(title, message ? [message] : []) })))
}
```
Call `void emailUsers(...)` (non-blocking) at the end of `createNotification` and inside `createNotifications`. Keep existing behavior identical otherwise. Note: existing action tests mock `@/lib/db` without `user.findMany` returning emails — ensure `findMany` mocks exist or default to `[]`; update test mocks minimally if suite breaks.

- [ ] **Step 4:** Add to `.env.example`:
```
# Optional — enables outgoing email via Resend (falls back to logging)
RESEND_API_KEY=
MAIL_FROM=
```

- [ ] **Step 5: Verify**: `npm run test && npx tsc --noEmit` (timeout ≥300000ms)

- [ ] **Step 6: Commit**

```bash
git add src/lib/email.ts src/lib/__tests__/email.test.ts src/lib/actions/notifications.ts .env.example package.json package-lock.json
git commit -m "feat: transactional email notifications via resend"
```

---

### Task 2: Bulk leave approvals

**Files:**
- Modify: `src/lib/actions/leave.ts` (add `bulkApproveLeaves`, `bulkRejectLeaves`)
- Modify: `src/app/[locale]/(hr)/manager/leaves/manager-leaves-client.tsx` (checkboxes + bulk bar)
- Test: extend `src/lib/__tests__/leave.test.ts`
- Modify: en/ar messages

**Interfaces:**
- Produces:
  - `bulkApproveLeaves(formData: FormData): Promise<{ approved: number; failed: { id: string; error: string }[] } | { error: string }>`
  - `bulkRejectLeaves(formData: FormData): Promise<{ rejected: number; failed: ... } | { error: string }>` — reads `ids` repeated field + `rejectReason`.

- [ ] **Step 1: Write failing tests** (extend existing describe style): manager role approves 2 valid PENDING ids → `{ approved: 2, failed: [] }`; non-manager → `{ error }`; invalid id lands in `failed` not thrown; bulk reject requires reason.

- [ ] **Step 2: Implement actions** — extract the per-request approve core from existing `approveLeave` into a helper `approveOne(requestId, session)` returning `{ ok: true } | { ok: false, error: string }` (reuse balance-check transaction), then:

```ts
export async function bulkApproveLeaves(formData: FormData) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    return { error: await serverError('unauthorized') }
  const ids = formData.getAll('ids').filter((v): v is string => typeof v === 'string')
  if (ids.length === 0) return { error: await serverError('invalidRequest') }

  let approved = 0
  const failed: { id: string; error: string }[] = []
  for (const id of ids) {
    const r = await approveOne(id, session)
    if (r.ok) approved++
    else failed.push({ id, error: r.error })
  }
  revalidatePath('/manager/leaves')
  return { approved, failed }
}
```
`bulkRejectLeaves` mirrors this with a shared reason (validate once via rejectLeaveSchema's reason rule). Each success also calls `logAudit` (existing pattern from single actions).

- [ ] **Step 3: Client UI** — read `manager-leaves-client.tsx` first. Add: checkbox column rendered only for `status === 'PENDING'` rows; header select-all-pending checkbox; when ≥1 selected show sticky action bar: "Approve (n)" green button + "Reject" opening the existing reason input pattern + "Clear". Call the actions via a client handler, show toast summary (`X approved, Y failed`) using sonner as elsewhere, clear selection, refresh via router.refresh().

- [ ] **Step 4: i18n keys** (en/ar): `bulk.approveSelected`, `bulk.rejectSelected`, `bulk.clear`, `bulk.result` ("{approved} approved, {failed} failed" / "{approved} تمت الموافقة، {failed} فشلت"), `bulk.selectPendingOnly`.

- [ ] **Step 5: Verify + commit**

Run: `npm run test && npx tsc --noEmit && npm run lint` (timeout ≥300000ms)

```bash
git add src/lib/actions/leave.ts src/app/[locale]/(hr)/manager/leaves src/i18n/messages src/lib/__tests__/leave.test.ts
git commit -m "feat: bulk approve/reject pending leave requests"
```

---

### Task 3: CSV export

**Files:**
- Create: `src/lib/csv.ts` (+ test `src/lib/__tests__/csv.test.ts`)
- Create: `src/app/api/export/payroll/route.ts`, `src/app/api/export/attendance/route.ts`, `src/app/api/export/leaves/route.ts`
- Test: `src/lib/__tests__/export-routes.test.ts`
- Modify: payroll period page/client, attendance reports page, leaves list page (Export buttons)
- Modify: en/ar messages

**Interfaces:**
- Produces: `toCsv(rows: Record<string, unknown>[], headers: string[]): string` — BOM-prefixed, escaped, CRLF rows.
- Routes: all MANAGER/HR_ADMIN-only (401 unauthed, 403 employee); return `text/csv; charset=utf-8` with `Content-Disposition: attachment; filename="<name>-<YYYYMMDD>.csv"`.

- [ ] **Step 1: TDD csv.ts**

```ts
// src/lib/csv.ts
export function escapeCsvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@]/.test(s)) s = `'${s}` // formula injection guard
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`
  return s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(escapeCsvCell).join(','))
  return '\uFEFF' + lines.join('\r\n')
}
```
Tests: quotes/commas/newlines escaped; formula prefixes neutralized; BOM present; empty rows → header only.

- [ ] **Step 2: Route handlers** — shared pattern:

```ts
// src/app/api/export/payroll/route.ts (sketch; others analogous)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { toCsv } from '@/lib/csv'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const periodId = req.nextUrl.searchParams.get('periodId')
  const period = periodId
    ? await db.payrollPeriod.findUnique({ where: { id: periodId }, include: { payslips: { include: { employee: true } } } })
    : null
  if (!period) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const csv = toCsv(
    ['Employee Code', 'Name', 'Basic Salary', 'Transportation Deduction', 'Absence Deduction', 'Late Deduction', 'Net Pay'],
    period.payslips.map((p) => [
      p.employee.employeeCode, `${p.employee.firstName} ${p.employee.lastName}`,
      p.basicSalary.toString(), p.transportationDeduction.toString(), p.absenceDeduction.toString(),
      p.lateDeduction.toString(), p.netPay.toString(),
    ]),
  )
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="payroll-${period.year}-${String(period.month).padStart(2, '0')}.csv"`,
    },
  })
}
```
- attendance route: params `from`,`to` (dates, default last 30 days); join employee; columns: code, name, date, checkIn, checkOut, status, lateMinutes, earlyLeaveMinutes.
- leaves route: params `status?`, `year?` (default current year); columns: code, name, type name, start, end, days, status, reason.

- [ ] **Step 3: Auth matrix tests** (`export-routes.test.ts`): unauthenticated 401; EMPLOYEE 403; MANAGER 200 (mock db minimal data); missing period 404. Assert content-type + BOM.

- [ ] **Step 4: UI buttons** — read each target file first; add "Export CSV"/"تصدير CSV" link/button styled like existing buttons, pointing at the route with current filters (payroll period page uses its `id`; attendance reports passes visible range; leaves list passes active status filter if trivially available, else year only).

- [ ] **Step 5: Verify + commit**

Run: `npm run test && npx tsc --noEmit && npm run lint` (timeout ≥300000ms)

```bash
git add src/lib/csv.ts src/lib/__tests__ "src/app/api/export" "src/app/[locale]/(hr)/manager" src/i18n/messages
git commit -m "feat: csv export for payroll, attendance and leaves"
```

---

### Task 4: Verification

- [ ] `npm run verify` (timeout ≥600000ms)
- [ ] Manual smoke: submit leave (email logged to console without RESEND_API_KEY); bulk-select 2 pending leaves → approve → toast summary + audit rows; download each CSV → opens in Excel with correct Arabic text (BOM).

## Self-Review

- Spec coverage: email (Task 1) ✓ bulk approvals (Task 2) ✓ CSV export (Task 3) ✓ verification (Task 4) ✓
- Placeholders: none — Task 2 Step 2 shows the bulkApprove pattern verbatim and mandates mirroring for reject; Task 3 gives full payroll route sketch with explicit column lists for the other two.
- Type consistency: storage-key/route names consistent; bulk return shapes match between Steps 1–3.
