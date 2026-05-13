# Phase 1: Auth + Employee Management — Design Spec

**Date:** 2026-05-13
**Status:** Approved
**Scope:** Foundation layer: authentication, role-based routing, and employee CRUD for a single-company HR management system.

---

## 1. Architecture Overview

### 1.1 Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) | RSC, server actions, built-in routing |
| Language | TypeScript (strict) | Type safety across full stack |
| Auth | NextAuth.js v5 (Auth.js) | Credentials provider + JWT sessions |
| Database | PostgreSQL | Relational, mature, Prisma-compatible |
| ORM | Prisma | Type-safe queries, migrations, schema-first |
| UI | Tailwind CSS + shadcn/ui | Utility-first CSS, accessible primitives |
| i18n | next-intl 3.x | App Router native, RTL support, server-side messages |
| Validation | Zod | Shared client + server schemas |

### 1.2 Directory Structure

```
src/
  app/
    [locale]/                         # next-intl locale routing (en, ar)
      (auth)/                         # auth layout group
        auth/
          signin/
            page.tsx                  # Auth_SignIn
          layout.tsx                  # auth layout (no nav)
      (hr)/                           # HR/Admin layout group
        layout.tsx                    # sidebar + header
        dashboard/
          page.tsx                    # Dashboard_Home
        employees/
          page.tsx                    # Employees_List
          new/
            page.tsx                  # Employees_AddNew
      middleware.ts                   # next-intl + role access middleware
    api/
      auth/
        [...nextauth]/
          route.ts                    # NextAuth API route
      employees/
        route.ts                      # employee API (for client-side needs)
  components/
    ui/                               # shadcn/ui components
    layout/                           # sidebar, header, mobile-nav
    forms/                            # employee form sections
    shared/                           # empty states, error states, loading
  lib/
    auth.ts                           # auth config, middleware helpers
    db.ts                             # Prisma client singleton
    validations/
      employee.ts                     # Zod schemas for employee forms
      auth.ts                         # Zod schemas for sign-in
    utils.ts                          # shared utilities
  i18n/
    messages/
      en.json                         # English translations
      ar.json                         # Arabic translations
    request.ts                        # next-intl request config
prisma/
  schema.prisma                       # database schema
  migrations/                         # Prisma migrations
public/
  uploads/                            # document uploads (Phase 5)
.env                                  # DATABASE_URL, AUTH_SECRET
.env.example                          # template without secrets
```

### 1.3 Route Design

| Screen | Route | Role |
|---|---|---|
| Auth_SignIn | `/[locale]/auth/signin` | Public |
| Dashboard_Home | `/[locale]/(hr)/dashboard` | HR_ADMIN |
| Employees_List | `/[locale]/(hr)/employees` | HR_ADMIN |
| Employees_AddNew | `/[locale]/(hr)/employees/new` | HR_ADMIN |

Middleware enforces:
- `/auth/*` → redirect to dashboard if already authenticated
- `/(hr)/*` → redirect to signin if no session, 403 if wrong role
- `/(manager)/*` → 403 if not MANAGER
- `/(employee)/*` → 403 if not EMPLOYEE

### 1.4 Role-Based Layouts

**HR/Admin Layout:**
- Sidebar (desktop): navigation links, company logo, user menu
- Header: breadcrumbs, notification bell, language switcher
- Mobile: hamburger → slide-out sidebar

**Manager Layout** (Phase 6): same sidebar pattern, different nav items

**Employee Layout** (Phase 6): bottom tab bar on mobile, sidebar on desktop

---

## 2. Database Schema

### 2.1 Prisma Schema (Phase 1)

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(EMPLOYEE)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  employee     Employee?
}

model Employee {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id])
  firstName             String
  lastName              String
  employeeCode          String   @unique
  dateOfBirth           DateTime
  nationality           String
  maritalStatus         String?
  phoneNumber           String?
  jobTitle              String
  department            String
  hireDate              DateTime
  salary                Decimal  @db.Decimal(10, 2)
  bankName              String?
  iban                  String?
  swift                 String?
  emergencyContactName  String?
  emergencyContactPhone String?
  isActive              Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

enum Role {
  HR_ADMIN
  MANAGER
  EMPLOYEE
}
```

---

## 3. Auth Flow

### 3.1 Sign-In

```
User submits email + password → server action calls authorize()
  → Prisma finds User by email
  → bcrypt.compare(password, passwordHash)
  → on success: return JWT with { id, email, role }
  → redirect to role-specific dashboard
  → on failure: return error "Invalid credentials"
```

### 3.2 Middleware Protection

```typescript
// middleware.ts checks:
// 1. Auth routes: redirect to dashboard if token exists
// 2. Protected routes: check token.role matches route group
// 3. next-intl locale detection (from path or cookie)
```

### 3.3 Auth State in App

- Server components: `auth()` from NextAuth returns session
- Client components: `useSession()` hook
- Role check helper: `requireRole(session, 'HR_ADMIN')` → throws/redirects

---

## 4. Employee Management

### 4.1 Employees_List (`/employees`)

**Layout:**
- Header: "Employees" title, "Add Employee" CTA button
- Search bar (name, code, department)
- Table: Name, Employee Code, Department, Job Title, Status, Actions
- Empty state: `Empty_States_NoEmployees` with CTA "Add Employee"

**Actions per row:**
- View detail (future Phase)
- Edit (future Phase)
- Deactivate

**Data fetching:**
- Server component fetches employees via Prisma
- Search/filter via URL searchParams (RSC refetch)
- Pagination: server-side, 20 per page

### 4.2 Employees_AddNew (`/employees/new`)

**Multi-step form (single page, sections):**

Section 1 — Personal Info:
- First Name (required)
- Last Name (required)
- Email (required, unique)
- Password (required, min 8 chars)
- Phone Number
- Date of Birth (required)
- Nationality (required, dropdown — ISO country list)
- Marital Status (dropdown: Single, Married, Divorced, Widowed)

Section 2 — Job Details:
- Employee Code (required, auto-generated suggestion, editable)
- Job Title (required)
- Department (required, dropdown — hardcoded: HR, Finance, IT, Operations, Sales, Marketing, Legal, Executive)
- Hire Date (required)
- Salary (required, numeric with decimal)
- Role (dropdown: HR_ADMIN, MANAGER, EMPLOYEE — default EMPLOYEE)

Section 3 — Bank Details (optional):
- Bank Name
- IBAN
- SWIFT/BIC

Section 4 — Emergency Contact (optional):
- Contact Name
- Contact Phone

**Form behavior:**
- Zod validation: client-side on blur, server-side on submit
- Progress indicator showing sections
- "Save" submits everything → Prisma transaction creates User + Employee
- "Skip" (banks/emergency sections) → sections remain expandable/optional
- Success: toast notification, redirect to Employees_List
- Error: inline field errors, scroll to first error

### 4.3 Empty States

```
Empty_States_NoEmployees:
  Icon: Users icon
  Title: "No employees yet"
  Description: "Add your first employee to get started."
  CTA: "Add Employee" → /employees/new
```

### 4.4 Error States

```
Errors_Network:
  Title: "Connection lost"
  Description: "Check your internet connection and try again."
  CTA: "Retry" → re-fetches/retries the failed action

Errors_Unauthorized:
  Immediate redirect to /auth/signin
```

---

## 5. Internationalization (RTL)

### 5.1 next-intl Setup

```
/[locale]/... → locale ∈ { en, ar }
Default locale: en
Detection: path prefix → cookie fallback → Accept-Language header
```

### 5.2 RTL Strategy

- CSS logical properties (`margin-inline-start` not `margin-left`)
- Tailwind `dir="rtl"` on `<html>` — flips utilities automatically
- shadcn/ui components are RTL-aware via Radix
- Date picker: use `date-fns` locale (`ar-SA` for Hijri if needed, `ar` for Gregorian)

### 5.3 Translation Keys (Phase 1)

All user-facing strings in `en.json` / `ar.json`. No hardcoded strings in JSX.

---

## 6. Components & States Per Screen

### 6.1 Auth_SignIn

| State | Description |
|---|---|
| Default | Email + password fields, "Sign In" button |
| Loading | Button shows spinner, fields disabled |
| Error | Inline error message above form |
| Validation | Field-level errors (invalid email, short password) |

### 6.2 Dashboard_Home

| State | Description |
|---|---|
| Default | KPI cards (total employees, pending leaves, today's attendance) |
| Loading | Skeleton cards |
| Empty | N/A — always has KPIs (may show 0) |
| Error | Error banner with retry |

### 6.3 Employees_List

| State | Description |
|---|---|
| Default | Table with employees |
| Loading | Skeleton table rows |
| Empty | `Empty_States_NoEmployees` component |
| Error | Error banner with retry |

### 6.4 Employees_AddNew

| State | Description |
|---|---|
| Default | Empty form, first section active |
| Loading | Submit button shows spinner |
| Validation | Field-level error messages + scroll to first error |
| Server Error | Banner above form (e.g., "Email already exists") |
| Success | Toast + redirect to Employees_List |

---

## 7. Testing Strategy

### 7.1 Unit Tests (Vitest)
- Zod validation schemas (valid/invalid inputs)
- Utility functions (role checks, code generation)

### 7.2 Integration Tests (Vitest + Testing Library)
- Sign-in form (valid credentials, invalid, empty)
- Employee form (valid submission, validation errors, duplicate email)
- Role-based middleware redirects

### 7.3 E2E Tests (Playwright)
- Happy path: sign-in as HR → view employees → add employee → verify in list

---

## 8. Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/riman_hr
AUTH_SECRET=openssl-rand-hex-32
AUTH_URL=http://localhost:3000
```

---

## 9. NPM Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:e2e": "playwright test",
  "db:migrate": "prisma migrate dev",
  "db:seed": "tsx prisma/seed.ts",
  "db:studio": "prisma studio"
}
```

---

## 10. Out of Scope (Future Phases)

- Manager and Employee role flows
- Leave management (Phase 2)
- Attendance tracking (Phase 3)
- Payroll + WPS export (Phase 4)
- Document upload (Phase 5)
- Performance evaluations (Phase 6)
- Notifications (Phase 6)
- Edit/deactivate employee from list
- Email sending (welcome email on employee creation)
- Password reset flow
