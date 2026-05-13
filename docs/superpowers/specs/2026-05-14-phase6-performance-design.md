# Phase 6 — Performance Management Design

**Date:** 2026-05-14
**Project:** Riman HR Management — Riman Fashion
**Phase:** 6 of 6 (Performance Management)

---

**Riman Fashion**
Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE
Phone: +971 508084592 | +971 553730792

---

## Overview

Periodic performance reviews where the manager evaluates employees on customizable criteria with descriptive ratings. Reviews generate goals/action plans for the next quarter and can include bonus recommendations linked to payroll.

## Roles & Permissions

| Feature | MANAGER | EMPLOYEE | HR_ADMIN |
|---------|---------|----------|----------|
| View all reviews | ✅ | ❌ | ❌ |
| Create reviews | ✅ | ❌ | ❌ |
| View review detail | ✅ | ❌ | ❌ |
| Delete reviews | ✅ | ❌ | ❌ |
| View own reviews | ❌ | ❌ | ❌ |

Employee self-service viewing of own reviews is deferred.

## Frequency

Quarterly reviews (4 per employee per year). Each review is identified by `employeeId + year + quarter`.

## Review Criteria

- **Base criteria** — seeded defaults applicable to all employees (Punctuality, Quality of Work, Teamwork, Attendance, Compliance)
- **Ad-hoc criteria** — manager adds per-review extra criteria as needed

When a new review is created, all active base criteria auto-populate as unrated entries. Manager can add custom criteria before submitting.

## Rating Scale

Three descriptive levels:

| Label | Key | Value |
|-------|-----|-------|
| Exceeds Expectations | EXCEEDS | 3 |
| Meets Expectations | MEETS | 2 |
| Below Expectations | BELOW | 1 |

Overall rating computed from average of all criteria values:
- Average ≥ 2.6 → EXCEEDS
- Average ≥ 1.6 → MEETS
- Average < 1.6 → BELOW

## Database Schema

### ReviewCriteria
- `id` String @id @default(cuid())
- `name` String (unique, e.g. "Punctuality")
- `nameAr` String? (Arabic translation)
- `isBase` Boolean @default(true) — base criteria auto-included in all reviews
- `isActive` Boolean @default(true)
- Timestamps

### PerformanceReview
- `id` String @id @default(cuid())
- `employeeId` String (FK → Employee)
- `year` Int
- `quarter` Int (1-4)
- `overallRating` String? (EXCEEDS/MEETS/BELOW — computed)
- `comments` String? (manager's overall comments)
- `bonusRecommendation` Decimal? @db.Decimal(10, 2) — optional bonus amount (AED)
- `status` String @default("DRAFT") — DRAFT | COMPLETED
- `createdAt` DateTime @default(now())
- `updatedAt` DateTime @updatedAt

Relations: Employee, ReviewRating[], ReviewGoal[]

### ReviewRating
- `id` String @id @default(cuid())
- `reviewId` String (FK → PerformanceReview)
- `criteriaId` String? (FK → ReviewCriteria, null for ad-hoc)
- `customName` String? (for ad-hoc criteria not in ReviewCriteria)
- `rating` String (EXCEEDS/MEETS/BELOW)
- `comment` String?
- Timestamps

### ReviewGoal
- `id` String @id @default(cuid())
- `reviewId` String (FK → PerformanceReview)
- `description` String
- `targetDate` DateTime?
- `isCompleted` Boolean @default(false)
- Timestamps

## Seed Data

Base ReviewCriteria seeded with migration:
- Punctuality / الالتزام بالمواعيد
- Quality of Work / جودة العمل
- Teamwork / العمل الجماعي
- Attendance / الحضور
- Compliance / الامتثال للسياسات

## Routes

- `GET /[locale]/manager/performance` — reviews list with filters (employee, quarter, year, status)
- `GET /[locale]/manager/performance/new` — create review form (select employee → autoload criteria)
- `GET /[locale]/manager/performance/[id]` — review detail with ratings, goals, bonus recommendation
- `POST` actions via server actions (create, update, delete)

## UI / Flow

**List page:**
- Table: Employee, Quarter, Year, Overall Rating, Status, Actions
- Filter by employee dropdown, quarter, year, status
- "New Review" button

**New Review flow:**
1. Select employee
2. Year + quarter auto-set (defaults to current)
3. All base criteria shown with rating dropdowns and comment fields
4. "Add criteria" button for ad-hoc (name + rating + comment)
5. Goals section — add 1+ goals with description and optional target date
6. Overall comments field
7. Bonus recommendation field (decimal, optional)
8. Submit → status = COMPLETED

**Detail page:**
- Employee info, period, status
- Ratings table: criteria | rating | comment
- Goals list with status
- Overall rating, comments, bonus recommendation
- Delete button

## Payroll Integration

`bonusRecommendation` from the latest COMPLETED review for the period displayed on the payslip page for manager reference during payroll processing. No auto-apply to payslips.

## Server Actions

- `createReview(data)` — validates employee, year, quarter uniqueness; creates review with ratings and goals; sets status to COMPLETED
- `deleteReview(id)` — deletes review and cascade ratings/goals; only allowed when status is DRAFT (unused — reviews are created as COMPLETED immediately; kept for future draft support)

Note: Edits are not supported. Manager deletes and recreates if changes are needed. Reviews are created as COMPLETED in a single submission (no DRAFT → COMPLETED workflow in this phase).

## i18n

New `performance` namespace with keys for:
- Page titles, statuses, filters
- Rating labels (EXCEEDS/MEETS/BELOW)
- Criteria categories
- Review form labels, goals section
- Delete confirmations, success/error messages

## Out of Scope

- Employee self-service view
- Self-evaluations
- Peer reviews
- 360-degree feedback
- Automated KPI data import
- Auto-apply bonus to payroll
- Review reminders/notifications
- PDF export of reviews

---

**Riman Fashion** — Sheikh Mohammed Bin Sultan Al Qasimi Street, Al Jazzat, Al Riqah, Sharjah, UAE
Phone: +971 508084592 | +971 553730792
