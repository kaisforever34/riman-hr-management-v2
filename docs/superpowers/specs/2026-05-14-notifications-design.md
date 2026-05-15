# Notifications — Design Spec

## Problem

Users have no way to know when something happens — leave requests go unnoticed, onboarding tasks sit idle. Currently the only way to find out about pending actions is to navigate to the relevant page and check.

## Scope

In-app notification system with polling. No email, SMS, or push notifications. 4 trigger points from existing flows (leave + onboarding/offboarding). Notification bell in header with unread badge. Notification list page with read/unread state. Mark individual or all as read.

## Context

- Riman Fashion: wedding dress atelier/boutique, 5 employees, single manager
- Leave flow: employee submits → manager approves/rejects (existing server actions)
- Onboarding flow: manager starts → employee completes tasks → manager finishes (newly built)
- Polling every 30s via lightweight API route — more than sufficient for this team size
- No WebSocket/SSE needed

## Design

### Data Model

One new Prisma model:

```
model Notification {
  id        String   @id @default(cuid())
  userId    String
  type      String   // "LEAVE_SUBMITTED" | "LEAVE_APPROVED" | "LEAVE_REJECTED" | "ONBOARDING_TASK" | "OFFBOARDING_TASK" | "GENERAL"
  title     String
  message   String?
  link      String?  // relative URL to the related resource
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Trigger Points

| Existing Action | File to Modify | Notify Who | Type | Link |
|----------------|---------------|-----------|------|------|
| Leave submitted | `src/lib/actions/leave.ts` (submitLeave) | MANAGER + HR_ADMIN | LEAVE_SUBMITTED | /manager/leaves/[id] |
| Leave approved | `src/lib/actions/leave.ts` (approveLeave) | Employee who requested | LEAVE_APPROVED | /leave/[id] |
| Leave rejected | `src/lib/actions/leave.ts` (rejectLeave) | Employee who requested | LEAVE_REJECTED | /leave/[id] |
| Onboarding started | `src/lib/actions/onboarding.ts` (startOnboarding) | The employee | ONBOARDING_TASK | /onboarding |
| Onboarding task completed (by employee) | `src/lib/actions/onboarding.ts` (completeOnboardingTask) | MANAGER + HR_ADMIN | ONBOARDING_TASK | /manager/onboarding/[id] |
| Offboarding started | `src/lib/actions/onboarding.ts` (startOnboarding) | The employee | OFFBOARDING_TASK | /onboarding |

### Helper Function

A single `createNotification` server action that all trigger points call:

```typescript
async function createNotification(userId: string, type: string, title: string, message?: string, link?: string) {
  await db.notification.create({ data: { userId, type, title, message, link } })
}
```

### UI: Notification Bell (Header)

- Bell icon added to the header component (top-right, next to user avatar)
- Unread count badge (gold circle, absolute positioned)
- Click opens a dropdown showing the 5 most recent unread notifications
- Each notification shows: icon (by type), title, time ago, link
- "Mark all as read" link at bottom of dropdown
- Clicking a notification marks it as read and navigates to the link

### UI: Notification List Page

Route: `/[locale]/notifications`

- Full list of all notifications (paginated, newest first)
- Filter by: unread only, type
- Mark individual as read (button)
- Mark all as read (button at top)
- Read notifications visually dimmed

### API Route for Polling

Route: `GET /api/notifications/unread-count`

Returns: `{ count: number, recent: Notification[] }`

Used by the header bell component to poll every 30 seconds.

### Implementation Plan

1. Add Notification model to Prisma schema + migration
2. Create `src/lib/actions/notifications.ts` with helper + list + markRead + markAllRead
3. Create `GET /api/notifications/unread-count` API route
4. Modify `src/lib/actions/leave.ts` — add createNotification calls at 3 trigger points
5. Modify `src/lib/actions/onboarding.ts` — add createNotification calls at 3 trigger points
6. Add notification bell to header component
7. Create `/[locale]/notifications` list page
8. Add sidebar nav item for notifications (employee + admin)
9. Add i18n translations (en + ar)
10. Verify build

### Future Considerations (out of scope)

- Email notifications
- Push notifications (mobile)
- Notification preferences (opt-out per type)
- Real-time WebSocket delivery
