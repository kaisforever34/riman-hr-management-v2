# Riman HR System — Design Decisions Record

> All questions, options, and chosen answers across all 6 phases.
> Created for manager review — if any decision needs changing, mark it and we'll update.

---

## Phase 1: Auth & Employee Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | How many roles should the system have? | HR_ADMIN, MANAGER, EMPLOYEE | 3 roles (HR_ADMIN for setup, MANAGER for operations, EMPLOYEE for self-service) |
| 2 | Single-company or multi-company? | Single-company / Multi-company | Single-company (Riman Fashion only) |
| 3 | Who manages employees? | HR department / Manager does everything | Manager does everything — no HR department |
| 4 | Employee fields needed? | Basic info / Full HR profile | Full: name, code, DOB, nationality, marital status, phone, job title, department, hire date, salary, bank details, emergency contact |
| 5 | Authentication method? | Email+password / OAuth / Magic link | Email + password (next-auth v5 credentials) |
| 6 | Seed credentials? | — | admin@riman.com / admin123 |

---

## Phase 2: Leave Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | How many leave types? | — | 8 (Annual, Sick, Personal, Maternity, Paternity, Hajj/Umrah, Compassionate, Unpaid) |
| 2 | Balance reset logic? | Calendar year / Contract date anniversary | Contract date anniversary |
| 3 | Carry over policy? | No carry over / Partial carry over / Full carry over | Full carry over (100%) |
| 4 | Negative balance allowed? | No / Yes, limited / Unlimited negative | Unlimited negative |
| 5 | Half-day support? | No / Yes | Yes, with morning/afternoon periods |
| 6 | File attachments? | No / Yes | Yes (PDF/JPG/PNG, 5MB) |
| 7 | Approval workflow? | Auto / Manager only / Multi-step | Employee submits → Manager approves/rejects (no multi-step) |
| 8 | Balance validation on submit? | Yes, block if insufficient / No validation on submit | No balance validation on submit |

---

## Phase 3: Attendance Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | Work hours? | — | 11:30 AM – 8:30 PM (UAE, UTC+4) |
| 2 | Records per day? | Multiple entries per day / Single record per day | Single record per employee per day |
| 3 | Check-in method? | GPS / QR code / One-click / Manual time entry | One-click + manual time entry for manager override |
| 4 | Late determination? | At check-in time / End-of-day batch | At check-in time (status PRESENT or LATE based on 11:30) |
| 5 | Absent determination? | Cron job / Read-time calculation | Read-time (no cron job — computed when viewing) |
| 6 | Half-day status? | Auto-calculated / Manager-set only | Manager-set only |

---

## Phase 4: Payroll Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | Calculation method? | Auto-calculated from attendance / Manual entry | Auto-calculated from attendance data |
| 2 | Transportation deduction? | — | Fixed 500 AED, deducted pro-rata for annual leave days |
| 3 | Absence deduction formula? | — | Daily rate = salary ÷ 30; deducted for absent days |
| 4 | Late deduction? | System-calculated / Manager-set per employee/month | Manager-set per employee per month |
| 5 | Payslip storage? | Computed on-the-fly / Stored at creation time | Stored to disk at creation/recalculation time |
| 6 | Recalculation? | — | Recalculate button refreshes from current attendance data |
| 7 | Finalization? | Auto-approve / Manager finalizes | Manager finalizes (locks payslips) |

---

## Phase 5: Document Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | Document types? | Employee docs / Company docs / Both | Both (EmployeeDocument + CompanyDocument) |
| 2 | Employee doc categories? | — | CONTRACT, PASSPORT, VISA, ID_CARD, CERTIFICATE, EDUCATION, MEDICAL, OTHER |
| 3 | Company doc categories? | — | POLICY, FORM, TEMPLATE, REPORT, OTHER |
| 4 | Who can manage documents? | Manager only / HR only / Both | Manager only |
| 5 | Max file size? | — | 10 MB |
| 6 | Allowed file types? | — | PDF, JPG, PNG, DOC, DOCX |
| 7 | Storage location? | Cloud (S3) / Local filesystem | Local filesystem (public/uploads/documents/) |
| 8 | Employee self-service? | Yes / No | No (deferred) |

---

## Phase 6: Performance Management

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | Core approach? | Annual performance reviews / KPI tracking with check-ins / Periodic reviews | **Periodic performance reviews** (recommended ✓) |
| 2 | Review frequency? | Quarterly / Half-yearly / Annual | **Quarterly** (4 per year per employee) |
| 3 | Evaluation criteria source? | Fixed (same for all) / Per-employee / Mixed | **Mixed** (base criteria auto-loaded + optional ad-hoc per review) |
| 4 | Rating scale? | 1-5 numeric / 1-10 numeric / Descriptive (Exceeds/Meets/Below) | **Descriptive** (Exceeds Expectations / Meets Expectations / Below Expectations) |
| 5 | Review outputs? | Store only / Affect payroll / Generate action plan / All | **All three**: stored for records + bonus recommendation for payroll + goals/action plans |
| 6 | Bonus → payroll integration? | Approach A: informational (manual entry) / Approach B: auto-linked | **Approach A** (bonus recommendation stored on review; manager manually enters in payroll) |
| 7 | Employee self-service view? | Yes / No | No (deferred) |

---

## Common Decisions

| # | Question | Options | Chosen Answer |
|---|----------|---------|---------------|
| 1 | Language support? | English only / Arabic only / English + Arabic | English + Arabic with RTL support (next-intl) |
| 2 | UI framework? | — | Next.js 15 App Router + shadcn/ui base-nova + Tailwind v4 |
| 3 | Database? | — | PostgreSQL via Docker (port 5433) + Prisma v5 |
| 4 | File upload storage? | Local / Cloud | Local filesystem (public/uploads/) |
| 5 | Role-based access? | — | MANAGER can do all operations; EMPLOYEE self-service limited |

---

> **Riman Fashion** — Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE
> Phone: +971 508084592 | +971 553730792
