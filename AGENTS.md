# Riman HR

A full-featured HR management system built with Next.js 15 (App Router), React 19, Prisma (PostgreSQL), and TypeScript. Uses next-auth for authentication, next-intl for i18n (English/Arabic), and shadcn/ui for components.

- **Roles**: HR Admin, Manager, Employee
- **Core modules**: Employee management, Leave, Attendance, Payroll, Documents, Performance reviews, Surveys, Notifications, Onboarding/Offboarding, Assets & Expenses, Company Directory, Dashboard
- **Testing**: Vitest (unit), Playwright (E2E)
- **Database**: PostgreSQL via Prisma ORM with migrations in prisma/migrations/
- **Key dirs**: src/app/[locale] (pages), src/lib (server actions, queries, validations), src/components (UI), prisma/ (schema + seed)
