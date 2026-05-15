# Onboarding / Offboarding — Design Spec

## Problem

No structured process exists for bringing new hires into the system or managing departures. The manager relies on memory and ad-hoc checklists. New employees have no self-service portal to submit bank details, emergency contacts, or required documents before their start date. Departing employees have no exit interview process and handover tasks are easily missed.

## Scope

Checklist-based onboarding and offboarding workflows with employee self-service forms and manager task tracking. Both flows use a shared task template system. No notification system (deferred to separate feature), no automated triggers from other modules.

## Context

- Riman Fashion: wedding dress atelier/boutique, 5 employees, single manager
- Roles: designer/manager, master cutters, tailors, sales ladies
- Existing Document module for file uploads — onboarding/offboarding reuses it
- Employee info collected during onboarding fills gaps in existing Employee model (bank details, emergency contacts)
- Offboarding handles equipment return, uniform return, exit interview, final settlement notification

## Design

### Routes

```
/[locale]/manager/onboarding        — list all onboarding records
/[locale]/manager/onboarding/new    — select employee → launch onboarding
/[locale]/manager/onboarding/[id]   — detail view, complete manager tasks
/[locale]/manager/offboarding       — list all offboarding records
/[locale]/manager/offboarding/new   — select employee → reason → launch
/[locale]/manager/offboarding/[id]  — detail view, exit interview response
/[locale]/onboarding                — employee view: their tasks, forms, docs
```

All `/manager/*` routes gated to HR_ADMIN and MANAGER. Employee `/onboarding` gated to EMPLOYEE role. Nav items added to both sidebars.

### Data Model

Four new Prisma models:

**OnboardingTask** — template definition
- `id`, `type` (ONBOARDING|OFFBOARDING), `titleEn`, `titleAr`, `category` (FORM|DOCUMENT|MANAGER_ACTION), `roles` (Role[]), `order`, `formSchema` (Json?, nullable — Zod schema for employee-filled forms), `isRequired` (Boolean, default true)

**EmployeeOnboarding** — per-instance record
- `id`, `employeeId`, `type` (ONBOARDING|OFFBOARDING), `status` (PENDING|IN_PROGRESS|COMPLETED|CANCELLED), `startedAt`, `completedAt?`, `notes?` (manager notes)
- Relations: `employee`, `tasks`

**EmployeeOnboardingTask** — per-instance task tracking
- `id`, `onboardingId`, `taskTemplateId`, `assignedTo` (EMPLOYEE|MANAGER), `status` (PENDING|COMPLETED), `completedAt?`, `completedById?`, `formData?` (Json), `notes?`
- Relations: `onboarding`, `taskTemplate`

### Task Completion Flow

| Category | Assigned To | Completion Trigger |
|----------|------------|-------------------|
| FORM | EMPLOYEE | Employee submits form → auto-complete |
| DOCUMENT | EMPLOYEE | Document uploaded via Document module → auto-complete |
| MANAGER_ACTION | MANAGER | Manager clicks "Complete" in portal |

No approval workflow — tasks are either done or not. If a task is not required (`isRequired: false`), it can be skipped.

### Onboarding Flow

1. Manager creates employee record (existing flow)
2. Manager navigates to `/manager/onboarding/new`, selects employee
3. System creates `EmployeeOnboarding` + copies applicable `OnboardingTask` templates (filtered by employee's role) into `EmployeeOnboardingTask` records
4. Employee sees their pending tasks at `/onboarding` — forms to fill, documents to upload
5. Employee fills form → `formData` saved, task auto-completed
6. Employee uploads doc → links to Document module, task auto-completed
7. Manager sees progress at `/manager/onboarding/[id]`, marks their own tasks complete
8. All tasks complete → status changes to COMPLETED

### Offboarding Flow

1. Manager navigates to `/manager/offboarding/new`, selects employee, provides reason
2. System creates `EmployeeOnboarding` (type: OFFBOARDING) + copies applicable tasks
3. Employee sees exit interview form at `/onboarding` (or new dedicated page)
4. Manager handles handover tasks (collect keys, uniform, documents)
5. All tasks complete → status changes to COMPLETED
6. Manager gets a note that final settlement needs processing

### Seed Data

Predefined task templates for each role seeded alongside existing seed:

**Onboarding tasks (all roles):**
- FORM: Personal Information (bank details, address, phone)
- FORM: Emergency Contact
- DOCUMENT: Passport Copy
- DOCUMENT: Visa / ID
- DOCUMENT: Certificate / Qualification (if applicable)
- MANAGER_ACTION: Uniform Fitting
- MANAGER_ACTION: Workspace / Locker Assignment
- MANAGER_ACTION: Policy Review & Acknowledgment

**Offboarding tasks (all roles):**
- FORM: Exit Interview
- MANAGER_ACTION: Collect Keys / Access Cards
- MANAGER_ACTION: Return Uniform / Equipment
- MANAGER_ACTION: Final Settlement Notification

### UI Components

#### Manager: Onboarding List (`/manager/onboarding`)
- Table with: employee name, type (ONBOARDING/OFFBOARDING), progress (3/6), status badge (PENDING/IN_PROGRESS/COMPLETED), started date
- "New Onboarding" and "New Offboarding" buttons

#### Manager: Detail View (`/manager/onboarding/[id]`)
- Header: employee name + title, type badge, status badge, started date
- KPI row: tasks completed (3/6), pending employee, pending manager
- Task list: icon (status) + title + category label + action button
- FORM tasks: show submitted data or "pending"
- DOCUMENT tasks: show attached file link or "pending"
- MANAGER_ACTION tasks: "Complete" button for manager

#### Employee: My Onboarding (`/[locale]/onboarding`)
- Header: "Your Onboarding Checklist" with pending count badge
- Task list: completed (green checkmark, dim), pending (gold border, "Fill Form" or "Upload" button)
- Form submission: modal or inline form rendered from task's `formSchema`

#### Offboarding view: same layout as onboarding detail but with "Exit Interview" section showing employee responses

### Implementation Plan

1. Add 4 Prisma models: `OnboardingTask`, `EmployeeOnboarding`, `EmployeeOnboardingTask`
2. Create seed data for onboarding and offboarding tasks per role
3. Create server actions for creating, listing, completing onboarding/offboarding records
4. Create `/manager/onboarding/page.tsx` (list)
5. Create `/manager/onboarding/new/page.tsx` (select employee, launch)
6. Create `/manager/onboarding/[id]/page.tsx` (detail, manager actions)
7. Create `/manager/offboarding/` (list + new + detail)
8. Create `/[locale]/onboarding/page.tsx` (employee self-service)
9. Add nav items to sidebar
10. Add i18n translations (en + ar)
11. Verify build passes, fix any issues

### Future Considerations (out of scope)

- Email/in-app notifications for pending tasks
- Auto-trigger onboarding on employee creation
- Probation period tracking with end-date reminders
- Integration with payroll for final settlement calculation
- Task reassignment / delegation
