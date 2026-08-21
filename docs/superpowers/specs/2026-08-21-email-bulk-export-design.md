# Email Notifications, Bulk Approvals, CSV Export — Design

Date: 2026-08-21
Status: Approved

## Feature A: Email Notifications (Resend)

- New dependency `resend`. Env vars: `RESEND_API_KEY` (optional), `MAIL_FROM` (optional, default 'Riman HR <onboarding@resend.dev>'). When `RESEND_API_KEY` is unset, emails are logged via logger instead of sent (dev-safe, no crash).
- `src/lib/email.ts`: `sendEmail({ to, subject, html })` — fire-and-forget with try/catch + logger; never blocks or fails business actions.
- Simple branded HTML template helper (inline styles, bilingual not required for v1 — English body, employee name included).
- Sent on existing notification events:
  - Leave submitted → approvers (manager(s)/HR)
  - Leave approved / rejected → employee
  - Onboarding task assigned → assignee
- Recipient resolution: user.email from existing notification creation sites in `src/lib/actions/notifications.ts` (`createNotification`, `createNotifications`) — extend these helpers to also enqueue email when the notification type maps to an email template.
- Tests: unit test email helper (mock resend; assert no-throw without API key).

## Feature B: Bulk Leave Approvals

- Manager leaves list (`manager-leaves-client.tsx`): checkboxes per PENDING row + header select-all (pending only) + bulk action bar ("Approve selected (n)" / "Reject selected" with reason prompt).
- New actions in `src/lib/actions/leave.ts`: `bulkApproveLeaves(formData)` (ids: repeated field), `bulkRejectLeaves(formData)` (ids + shared rejectReason). Reuse per-id logic: authorization (MANAGER/HR_ADMIN), balance check inside transaction per request, skip-and-report failures.
- Return `{ success, approved: n, failed: [{ id, reason }] }`; client shows toast summary and refreshes list.
- Audit: one logAudit entry per successfully processed request (LEAVE_APPROVED/REJECTED with bulk flag in detail).
- i18n en/ar for all new strings.

## Feature C: CSV Export

- HR_ADMIN/MANAGER-only server actions generating CSV strings returned to client as downloads via route handlers (cleaner): new routes:
  - `GET /api/export/payroll?periodId=` → payslips CSV (employee code, name, basic, deductions, netPay)
  - `GET /api/export/attendance?from=&to=` → records CSV
  - `GET /api/export/leaves?status=&year=` → requests CSV
- Auth: MANAGER/HR_ADMIN. UTF-8 BOM prefix for Excel Arabic support. Filename includes date range.
- UI: "Export CSV" buttons on manager payroll period page, attendance reports page, leaves list page.
- CSV escaping helper (`src/lib/csv.ts`) with tests (quotes, commas, newlines, formula-injection guard: prefix `'` for cells starting with =+-@).

## Testing

- Unit: email helper, csv escaping, bulk action logic (mocked db).
- Route auth tests for export endpoints (401/403 matrix).
- `npm run verify` green.

## Out of Scope

- Email preferences/unsubscribe, HTML templates per locale, scheduled reports, Excel (xlsx) format.
