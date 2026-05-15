# Company Directory — Design Spec

## Problem

Employees have no way to find colleagues — who works where, what their role is, how to contact them. The Employees page is admin-only and table-based, not suited for browsing.

## Scope

Single feature: a **Company Directory** page with built-in org structure visualization. No ATS, no onboarding workflows, no notifications — those are separate projects.

## Context

- Riman Fashion is a wedding dress atelier/boutique in Sharjah, UAE
- Single manager/owner (the designer), ~5 employees
- Three departments: Management, Atelier (master cutters, tailors), Sales
- All employees report to the manager — flat hierarchy

## Design

### Route

`/[locale]/directory` — new page, new sidebar nav item between Dashboard and Employees.

### Role Gating

All three roles (HR_ADMIN, MANAGER, EMPLOYEE) see the Directory. It is read-only — no create/edit/delete.

### Layout

```
SIDEBAR                    PAGE
┌─────────┐     ┌──────────────────────────────────────┐
│Dashboard │     │  Directory                    [🔍 Q] │
│Directory │     ├──────────────────────────────────────┤
│Employees │     │  👑 Owner / Designer / Manager       │
│Leave     │     │  [Dept] · [Title]                    │
│...       │     │──────────────────────────────────────│
└─────────┘     │  [All Depts ▼]                        │
                ├──────────────────────────────────────┤
                │ ┌────────────────────────────────────┐│
                │ │ Sales (N)                          ││
                │ │ ┌──────┐ ┌──────┐ ┌──────┐         ││
                │ │ │ 👩   │ │ 👩   │ │ 👩   │         ││
                │ │ │ Name │ │ Name │ │ Name │         ││
                │ │ │ Title│ │ Title│ │ Title│         ││
                │ │ └──────┘ └──────┘ └──────┘         ││
                │ └────────────────────────────────────┘│
                │ ┌────────────────────────────────────┐│
                │ │ Atelier (N)                         ││
                │ │ ┌──────┐ ┌──────┐                   ││
                │ │ │ 👨   │ │ 👨   │                   ││
                │ │ │ Name │ │ Name │                   ││
                │ │ │ Title│ │ Title│                   ││
                │ │ └──────┘ └──────┘                   ││
                │ └────────────────────────────────────┘│
                └──────────────────────────────────────┘
```

### Card (at-a-glance)

- Initial-letter avatar (colored by department)
- Name (bold)
- Job title (secondary text)
- Department (badge/tag)

### Detail (on click → slideover panel)

- Avatar (larger)
- Name, title, department
- Email
- Phone
- Employee code
- Join date
- Emergency contact (if stored)

### Search & Filter

- Search bar searches across name, title, department, employee code
- Department dropdown filter (All, Management, Sales, Atelier)

### Org Structure

- Manager pinned at top in a highlighted card (gold accent)
- All employees grouped under department section headers
- No hierarchy tree needed (flat reporting structure)
- Department sections show employee count in section header

### Data

Uses existing `Employee` and `User` tables. No new models or migrations required. Avatar uses first-letter fallback — no image upload field needed for now.

### Implementation Plan

1. Create `src/app/[locale]/(hr)/directory/page.tsx` — server component, fetches employees grouped by department
2. Create `src/components/directory/directory-client.tsx` — client component with search, filter, card grid, slideover
3. Create `src/components/directory/employee-card.tsx` — card component with avatar, details
4. Create `src/components/directory/employee-detail.tsx` — slideover/detail panel
5. Update `sidebar.tsx` — add Directory nav item between Dashboard and Employees
6. No Prisma changes needed

### Future Considerations (out of scope)

- Employee photo upload
- Direct messaging/chat
- Birthday/anniversary highlights
