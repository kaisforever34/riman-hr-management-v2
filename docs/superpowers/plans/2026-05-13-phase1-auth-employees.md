# Phase 1: Auth + Employee Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`[ ]`) syntax for tracking.

**Goal:** Production-ready foundation: authentication with role-based routing, employee CRUD (list + create), and i18n for a single-company HR management system.

**Architecture:** Next.js 14 App Router with server components and server actions. NextAuth.js v5 for credentials-based JWT auth with role middleware. Prisma + PostgreSQL for persistence. next-intl for English/Arabic routing. Tailwind CSS + shadcn/ui for components. Zod for shared validation.

**Tech Stack:** Next.js 15, TypeScript 5.4+, Prisma 5, NextAuth.js v5 (beta), PostgreSQL, Tailwind CSS 3.4, shadcn/ui (new-york style), next-intl 3.x, zod 3.x, bcryptjs, react-hook-form + @hookform/resolvers

---

## Task Summary

| # | Task | Files |
|---|------|-------|
| 1 | Project Scaffolding | package.json, next.config, tailwind, etc. |
| 2 | Database Schema & Migration | prisma/schema.prisma, docker-compose.yml |
| 3 | Prisma Client Singleton & Seed | src/lib/db.ts, prisma/seed.ts |
| 4 | Zod Validation Schemas | src/lib/validations/*.ts |
| 5 | NextAuth Configuration | src/lib/auth.ts, src/lib/auth.config.ts |
| 6 | i18n Setup (next-intl) | src/i18n/*, src/i18n/messages/*.json, src/middleware.ts |
| 7 | Sign-In Page | src/app/[locale]/(auth)/*, src/app/[locale]/layout.tsx |
| 8 | HR Layout (Sidebar + Header) | src/components/layout/*, src/app/[locale]/(hr)/layout.tsx |
| 9 | Dashboard Page | src/app/[locale]/(hr)/dashboard/page.tsx |
| 10 | Employee List Page | src/app/[locale]/(hr)/employees/page.tsx |
| 11 | Add Employee Form + Server Action | src/app/[locale]/(hr)/employees/new/page.tsx, src/lib/actions/employee.ts |
| 12 | Verification & Final Testing | Manual walkthrough of all flows |

---

## Task Details

Each task below contains complete code. Execute tasks sequentially. Commit after each task.

### Task 1: Project Scaffolding

**Files:** Create package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.mjs, src/, .env.example, .gitignore

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```
Expected: Project scaffolds with App Router, TypeScript, Tailwind, ESLint in `src/` directory.

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client next-auth@beta bcryptjs zod react-hook-form @hookform/resolvers next-intl date-fns lucide-react clsx tailwind-merge
```
```bash
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 3: Initialize Prisma**

```bash
npx prisma init
```
Expected: Creates `prisma/schema.prisma` and `.env` with `DATABASE_URL` placeholder.

- [ ] **Step 4: Initialize shadcn/ui with new-york style**

```bash
npx shadcn-ui@latest init
```
When prompted: new-york style, zinc base color, yes to CSS variables.

- [ ] **Step 5: Add shadcn/ui components**

```bash
npx shadcn-ui@latest add button input label table card form select sonner badge
```

- [ ] **Step 6: Configure next.config.mjs for next-intl**

Replace `next.config.mjs`:
```javascript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: Create .env.example**

```env
DATABASE_URL=postgresql://riman:riman_dev@localhost:5432/riman_hr
AUTH_SECRET=generate-with-npx-auth-secret
AUTH_URL=http://localhost:3000
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```
Expected: App runs. Stop dev server after verifying.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js 14 project with Prisma, Tailwind, shadcn/ui, next-intl"
```

---

### Task 2: Database Schema & Migration

**Files:** Modify `prisma/schema.prisma`, create `docker-compose.yml`

- [ ] **Step 1: Write Prisma schema**

Replace `prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  HR_ADMIN
  MANAGER
  EMPLOYEE
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(EMPLOYEE)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  employee     Employee?
  accounts     Account[]
  sessions     Session[]
}

model Employee {
  id                    String   @id @default(cuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
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

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

- [ ] **Step 2: Create docker-compose.yml**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: riman
      POSTGRES_PASSWORD: riman_dev
      POSTGRES_DB: riman_hr
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 3: Start PostgreSQL and run migration**

```bash
docker compose up -d
```
Verify: `docker compose ps` shows container running.

Update `.env`:
```
DATABASE_URL=postgresql://riman:riman_dev@localhost:5432/riman_hr
```

```bash
npx prisma migrate dev --name init
```
Expected: Creates migration, generates client, confirms tables.

- [ ] **Step 4: Verify Prisma Studio**

```bash
npx prisma studio
```
Expected: Opens browser with database viewer. Close it after verifying.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations docker-compose.yml && git commit -m "feat: add Prisma schema with User, Employee, auth models"
```

### Task 3: Prisma Client Singleton & Seed Script

**Files:** Create `src/lib/db.ts`, `prisma/seed.ts`

- [ ] **Step 1: Create Prisma client singleton**

`src/lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 2: Create seed script**

`prisma/seed.ts`:
```typescript
import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@riman.com' },
    update: {},
    create: {
      email: 'admin@riman.com',
      passwordHash,
      role: Role.HR_ADMIN,
      employee: {
        create: {
          firstName: 'System',
          lastName: 'Admin',
          employeeCode: 'HR-001',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'AE',
          jobTitle: 'HR Director',
          department: 'HR',
          hireDate: new Date('2020-01-01'),
          salary: 25000.00,
        },
      },
    },
  })

  console.log('Seed complete: admin@riman.com / admin123')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
```

- [ ] **Step 3: Add seed config to package.json**

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 4: Run seed**

```bash
npx prisma db seed
```
Expected: "Seed complete: admin@riman.com / admin123"

- [ ] **Step 5: Commit**

```bash
git add src/lib/db.ts prisma/seed.ts package.json && git commit -m "feat: add Prisma client singleton and seed script"
```

### Task 4: Zod Validation Schemas

**Files:** Create `src/lib/validations/employee.ts`, `src/lib/validations/auth.ts`

- [ ] **Step 1: Create employee validation schema**

`src/lib/validations/employee.ts`:
```typescript
import { z } from 'zod'

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Required'),
  nationality: z.string().min(1, 'Required'),
  maritalStatus: z.string().optional(),
  employeeCode: z.string().min(1, 'Required').max(20),
  jobTitle: z.string().min(1, 'Required').max(100),
  department: z.string().min(1, 'Required'),
  hireDate: z.string().min(1, 'Required'),
  salary: z.string().min(1, 'Required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
  role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
})

export type EmployeeFormData = z.infer<typeof employeeFormSchema>

export const departments = ['HR', 'Finance', 'IT', 'Operations', 'Sales', 'Marketing', 'Legal', 'Executive'] as const

export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'] as const

export const countries = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
] as const
```

- [ ] **Step 2: Create auth validation schema**

`src/lib/validations/auth.ts`:
```typescript
import { z } from 'zod'

export const signInSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
})

export type SignInData = z.infer<typeof signInSchema>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/validations && git commit -m "feat: add Zod validation schemas for auth and employee forms"
```

---

### Task 5: NextAuth Configuration

**Files:** Create `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write auth config**

`src/lib/auth.config.ts`:
```typescript
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname
      const isProtected = !pathname.includes('/auth/')
      if (isProtected && !isLoggedIn) return false
      return true
    },
    jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.id = token.id as string
      }
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
```

- [ ] **Step 2: Write auth instance**

`src/lib/auth.ts`:
```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { db } from './db'
import { signInSchema } from './validations/auth'
import type { Role } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    role?: Role
  }
  interface Session {
    user: {
      id: string
      email: string
      role: Role
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role
    id?: string
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.isActive) return null

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordsMatch) return null

        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt' },
})
```

- [ ] **Step 3: Write API route**

`src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 4: Generate AUTH_SECRET**

```bash
npx auth secret
```
Copy output to `.env` as `AUTH_SECRET=<output>`.
Also set `AUTH_URL=http://localhost:3000` in `.env`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.config.ts src/lib/auth.ts src/app/api/auth && git commit -m "feat: configure NextAuth v5 with credentials provider and JWT"
```

---

### Task 6: Internationalization Setup (next-intl)

**Files:** Create `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/messages/en.json`, `src/i18n/messages/ar.json`, modify `src/middleware.ts`

- [ ] **Step 1: Write i18n routing config**

`src/i18n/routing.ts`:
```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
```

- [ ] **Step 2: Write i18n request config**

`src/i18n/request.ts`:
```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'en' | 'ar')) {
    locale = routing.defaultLocale
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 3: Write English messages**

`src/i18n/messages/en.json`:
```json
{
  "app": { "name": "Riman HR" },
  "auth": {
    "signIn": "Sign In",
    "email": "Email",
    "password": "Password",
    "signingIn": "Signing in...",
    "invalidCredentials": "Invalid email or password"
  },
  "nav": {
    "dashboard": "Dashboard",
    "employees": "Employees",
    "leaveRequests": "Leave Requests",
    "attendance": "Attendance",
    "payroll": "Payroll",
    "documents": "Documents",
    "signOut": "Sign Out"
  },
  "dashboard": {
    "title": "Dashboard",
    "totalEmployees": "Total Employees",
    "pendingLeaves": "Pending Leave Requests",
    "todayAttendance": "Today''s Attendance",
    "present": "present",
    "addEmployee": "Add Employee",
    "viewAll": "View All"
  },
  "employees": {
    "title": "Employees",
    "addEmployee": "Add Employee",
    "search": "Search employees...",
    "name": "Name",
    "employeeCode": "Code",
    "department": "Department",
    "jobTitle": "Job Title",
    "status": "Status",
    "actions": "Actions",
    "active": "Active",
    "inactive": "Inactive",
    "noEmployees": "No employees yet",
    "noEmployeesDesc": "Add your first employee to get started.",
    "perPage": "per page",
    "page": "Page",
    "of": "of"
  },
  "employeesAdd": {
    "title": "Add Employee",
    "personalInfo": "Personal Information",
    "jobDetails": "Job Details",
    "bankDetails": "Bank Details",
    "emergencyContact": "Emergency Contact",
    "firstName": "First Name",
    "lastName": "Last Name",
    "email": "Email",
    "password": "Password",
    "phoneNumber": "Phone Number",
    "dateOfBirth": "Date of Birth",
    "nationality": "Nationality",
    "maritalStatus": "Marital Status",
    "employeeCode": "Employee Code",
    "jobTitle": "Job Title",
    "department": "Department",
    "hireDate": "Hire Date",
    "salary": "Salary (AED)",
    "role": "Role",
    "bankName": "Bank Name",
    "iban": "IBAN",
    "swift": "SWIFT/BIC",
    "emergencyContactName": "Contact Name",
    "emergencyContactPhone": "Contact Phone",
    "save": "Save Employee",
    "saving": "Saving...",
    "success": "Employee created successfully",
    "skip": "Skip",
    "optional": "Optional"
  },
  "common": {
    "loading": "Loading...",
    "error": "Something went wrong",
    "retry": "Retry",
    "cancel": "Cancel",
    "save": "Save",
    "search": "Search...",
    "back": "Back"
  },
  "errors": {
    "network": "Connection lost. Check your internet and try again.",
    "unauthorized": "You are not authorized to access this page.",
    "emailExists": "An employee with this email already exists.",
    "codeExists": "An employee with this code already exists."
  },
  "empty": {
    "noEmployees": {
      "title": "No employees yet",
      "description": "Add your first employee to get started.",
      "cta": "Add Employee"
    }
  }
}
```

- [ ] **Step 4: Write Arabic messages**

`src/i18n/messages/ar.json`:
```json
{
  "app": { "name": "ريمان للموارد البشرية" },
  "auth": {
    "signIn": "تسجيل الدخول",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "signingIn": "جاري تسجيل الدخول...",
    "invalidCredentials": "البريد الإلكتروني أو كلمة المرور غير صحيحة"
  },
  "nav": {
    "dashboard": "لوحة التحكم",
    "employees": "الموظفين",
    "leaveRequests": "طلبات الإجازات",
    "attendance": "الحضور",
    "payroll": "الرواتب",
    "documents": "المستندات",
    "signOut": "تسجيل الخروج"
  },
  "dashboard": {
    "title": "لوحة التحكم",
    "totalEmployees": "إجمالي الموظفين",
    "pendingLeaves": "طلبات الإجازات المعلقة",
    "todayAttendance": "حضور اليوم",
    "present": "حاضر",
    "addEmployee": "إضافة موظف",
    "viewAll": "عرض الكل"
  },
  "employees": {
    "title": "الموظفين",
    "addEmployee": "إضافة موظف",
    "search": "البحث عن موظفين...",
    "name": "الاسم",
    "employeeCode": "الرمز",
    "department": "القسم",
    "jobTitle": "المسمى الوظيفي",
    "status": "الحالة",
    "actions": "الإجراءات",
    "active": "نشط",
    "inactive": "غير نشط",
    "noEmployees": "لا يوجد موظفين بعد",
    "noEmployeesDesc": "أضف أول موظف للبدء.",
    "perPage": "لكل صفحة",
    "page": "صفحة",
    "of": "من"
  },
  "employeesAdd": {
    "title": "إضافة موظف",
    "personalInfo": "المعلومات الشخصية",
    "jobDetails": "تفاصيل الوظيفة",
    "bankDetails": "التفاصيل المصرفية",
    "emergencyContact": "جهة اتصال الطوارئ",
    "firstName": "الاسم الأول",
    "lastName": "الاسم الأخير",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "phoneNumber": "رقم الهاتف",
    "dateOfBirth": "تاريخ الميلاد",
    "nationality": "الجنسية",
    "maritalStatus": "الحالة الاجتماعية",
    "employeeCode": "رمز الموظف",
    "jobTitle": "المسمى الوظيفي",
    "department": "القسم",
    "hireDate": "تاريخ التوظيف",
    "salary": "الراتب (درهم)",
    "role": "الدور",
    "bankName": "اسم البنك",
    "iban": "IBAN",
    "swift": "SWIFT/BIC",
    "emergencyContactName": "اسم جهة الاتصال",
    "emergencyContactPhone": "هاتف جهة الاتصال",
    "save": "حفظ الموظف",
    "saving": "جاري الحفظ...",
    "success": "تم إنشاء الموظف بنجاح",
    "skip": "تخطي",
    "optional": "اختياري"
  },
  "common": {
    "loading": "جاري التحميل...",
    "error": "حدث خطأ ما",
    "retry": "إعادة المحاولة",
    "cancel": "إلغاء",
    "save": "حفظ",
    "search": "بحث...",
    "back": "رجوع"
  },
  "errors": {
    "network": "انقطع الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "unauthorized": "غير مصرح لك بالوصول إلى هذه الصفحة.",
    "emailExists": "يوجد موظف بهذا البريد الإلكتروني بالفعل.",
    "codeExists": "يوجد موظف بهذا الرمز بالفعل."
  },
  "empty": {
    "noEmployees": {
      "title": "لا يوجد موظفين بعد",
      "description": "أضف أول موظف للبدء.",
      "cta": "إضافة موظف"
    }
  }
}
```

- [ ] **Step 5: Write middleware**

`src/middleware.ts`:
```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

const PUBLIC_PATHS = ['/auth/signin']

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const isPublic = PUBLIC_PATHS.some((p) => pathname.includes(p))
  if (!isPublic) {
    const session = await auth()
    if (!session?.user) {
      const locale = pathname.split('/')[1]
      return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url))
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

- [ ] **Step 6: Commit**

```bash
git add src/i18n src/middleware.ts && git commit -m "feat: set up next-intl with English/Arabic translations and auth middleware"
```

---

### Task 7: Root Layout + Sign-In Page

**Files:** Create `src/app/[locale]/layout.tsx`, `src/app/[locale]/(auth)/layout.tsx`, `src/app/[locale]/(auth)/auth/signin/page.tsx`

- [ ] **Step 1: Write root locale layout**

`src/app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Toaster } from '@/components/ui/sonner'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as 'en' | 'ar')) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Delete root-level layout if it exists**

```bash
if (Test-Path "src/app/layout.tsx") { Remove-Item "src/app/layout.tsx" }
if (Test-Path "src/app/page.tsx") { Remove-Item "src/app/page.tsx" }
```

- [ ] **Step 3: Write auth layout**

`src/app/[locale]/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 4: Write sign-in page**

`src/app/[locale]/(auth)/auth/signin/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn } from 'lucide-react'

export default function SignInPage() {
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t('invalidCredentials'))
      } else {
        router.push(`/${locale}/dashboard`)
        router.refresh()
      }
    } catch {
      setError(tc('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">{t('signIn')}</CardTitle>
        <CardDescription>Riman HR Management</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@riman.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              t('signingIn')
            ) : (
              <>
                <LogIn className="me-2 h-4 w-4" />
                {t('signIn')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Test sign-in**

```bash
npm run dev
```
Navigate to `http://localhost:3000/en/auth/signin`. Sign in with `admin@riman.com` / `admin123`. Expected: redirects to `/en/dashboard` (may 404 — expected, page not built yet).

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/layout.tsx src/app/[locale]/(auth) && git commit -m "feat: implement sign-in page with credentials auth and i18n root layout"
```

### Task 8: HR Layout (Sidebar + Header)

**Files:** Create `src/app/[locale]/(hr)/layout.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/header.tsx`, `src/components/layout/language-switcher.tsx`

- [ ] **Step 1: Write sidebar component**

`src/components/layout/sidebar.tsx`:
```tsx
'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Clock,
  Banknote,
  FolderOpen,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'dashboard' },
  { href: '/employees', icon: Users, label: 'employees' },
  { href: '/leave-requests', icon: CalendarCheck, label: 'leaveRequests' },
  { href: '/attendance', icon: Clock, label: 'attendance' },
  { href: '/payroll', icon: Banknote, label: 'payroll' },
  { href: '/documents', icon: FolderOpen, label: 'documents' },
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const { locale } = useParams<{ locale: string }>()
  const t = useTranslations('nav')

  return (
    <aside className="fixed inset-y-0 start-0 z-20 hidden w-64 flex-col border-e bg-white lg:flex">
      <div className="flex h-14 items-center border-b px-6">
        <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 font-semibold">
          <LayoutDashboard className="h-5 w-5" />
          <span>Riman HR</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const href = `/${locale}${item.href}`
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={item.href} href={href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn('w-full justify-start', isActive && 'bg-zinc-100')}
              >
                <item.icon className="me-2 h-4 w-4" />
                {t(item.label)}
              </Button>
            </Link>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-600"
          onClick={() => signOut({ callbackUrl: `/${locale}/auth/signin` })}
        >
          <LogOut className="me-2 h-4 w-4" />
          {t('signOut')}
        </Button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Write header component**

`src/components/layout/header.tsx`:
```tsx
import LanguageSwitcher from './language-switcher'

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-white px-4 lg:px-6">
      <div className="flex-1" />
      <LanguageSwitcher />
    </header>
  )
}
```

- [ ] **Step 3: Write language switcher**

`src/components/layout/language-switcher.tsx`:
```tsx
'use client'

import { useParams, usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function LanguageSwitcher() {
  const pathname = usePathname()
  const params = useParams<{ locale: string }>()
  const router = useRouter()

  const otherLocale = params.locale === 'en' ? 'ar' : 'en'

  function switchLanguage() {
    const newPath = pathname.replace(`/${params.locale}`, `/${otherLocale}`)
    router.push(newPath)
  }

  return (
    <Button variant="outline" size="sm" onClick={switchLanguage}>
      {otherLocale === 'ar' ? 'العربية' : 'English'}
    </Button>
  )
}
```

- [ ] **Step 4: Write HR layout**

`src/app/[locale]/(hr)/layout.tsx`:
```tsx
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function HrLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="lg:ps-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Ensure lib/utils.ts has cn helper**

If `src/lib/utils.ts` does not exist or does not have `cn` export, create it:
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/[locale]/(hr)/layout.tsx src/components/layout src/lib/utils.ts && git commit -m "feat: add HR layout with sidebar, header, and language switcher"
```

---

### Task 9: Dashboard Page

**Files:** Create `src/app/[locale]/(hr)/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard page**

`src/app/[locale]/(hr)/dashboard/page.tsx`:
```tsx
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, CalendarCheck, Clock, Plus } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const t = await getTranslations('dashboard')
  const te = await getTranslations('empty')

  const [totalEmployees] = await Promise.all([
    db.employee.count({ where: { isActive: true } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('totalEmployees')}
            </CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <Link href="/employees" className="text-xs text-zinc-500 hover:underline">
              {t('viewAll')}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('pendingLeaves')}
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-500">--</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-500">
              {t('todayAttendance')}
            </CardTitle>
            <Clock className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-zinc-500">{t('present')}</p>
          </CardContent>
        </Card>
      </div>

      {totalEmployees === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-medium">{te('noEmployees.title')}</h3>
            <p className="text-sm text-zinc-500">{te('noEmployees.description')}</p>
            <Button asChild className="mt-4">
              <Link href="employees/new">
                <Plus className="me-2 h-4 w-4" />
                {te('noEmployees.cta')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end">
          <Button asChild>
            <Link href="employees/new">
              <Plus className="me-2 h-4 w-4" />
              {t('addEmployee')}
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Test dashboard**

```bash
npm run dev
```
Sign in, navigate to `/en/dashboard`. Verify KPI cards and empty state / Add Employee button show correctly.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(hr)/dashboard && git commit -m "feat: implement HR dashboard with KPI cards and empty state"
```

### Task 10: Employee List Page

**Files:** Create `src/app/[locale]/(hr)/employees/page.tsx`

- [ ] **Step 1: Write employee list page**

`src/app/[locale]/(hr)/employees/page.tsx`:
```tsx
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function EmployeesPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const t = await getTranslations('employees')
  const te = await getTranslations('empty')
  const { q, page: pageStr } = await props.searchParams
  const page = parseInt(pageStr || '1', 10)
  const perPage = 20

  const where = q
    ? {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' as const } },
          { lastName: { contains: q, mode: 'insensitive' as const } },
          { employeeCode: { contains: q, mode: 'insensitive' as const } },
          { department: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [employees, totalCount] = await Promise.all([
    db.employee.findMany({
      where,
      include: { user: { select: { email: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.employee.count({ where }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
        <Button asChild>
          <Link href="employees/new">
            <Plus className="me-2 h-4 w-4" />
            {t('addEmployee')}
          </Link>
        </Button>
      </div>

      {totalCount > 0 && (
        <form className="relative">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input name="q" placeholder={t('search')} defaultValue={q} className="ps-9" />
        </form>
      )}

      {employees.length === 0 && !q ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="text-lg font-medium">{te('noEmployees.title')}</h3>
            <p className="text-sm text-zinc-500">{te('noEmployees.description')}</p>
            <Button asChild className="mt-4">
              <Link href="employees/new">
                <Plus className="me-2 h-4 w-4" />
                {te('noEmployees.cta')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : employees.length === 0 && q ? (
        <div className="py-12 text-center">
          <p className="text-zinc-500">No employees match your search.</p>
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('employeeCode')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('department')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('jobTitle')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    {emp.firstName} {emp.lastName}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-zinc-500">
                    {emp.employeeCode}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{emp.department}</TableCell>
                  <TableCell className="hidden md:table-cell">{emp.jobTitle}</TableCell>
                  <TableCell>
                    <Badge variant={emp.user.isActive ? 'default' : 'secondary'}>
                      {emp.user.isActive ? t('active') : t('inactive')}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?page=${page - 1}${q ? `&q=${q}` : ''}`}>Previous</Link>
            </Button>
          )}
          <span className="text-sm text-zinc-500">
            {t('page')} {page} {t('of')} {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`?page=${page + 1}${q ? `&q=${q}` : ''}`}>Next</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Test employee list**

Run dev server, sign in, navigate to `/en/employees`. If seeded admin exists, verify table row. If no employees, verify empty state.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(hr)/employees/page.tsx && git commit -m "feat: implement employee list page with search, pagination, and empty state"
```

---

### Task 11: Employee Server Action

**Files:** Create `src/lib/actions/employee.ts`

- [ ] **Step 1: Write create employee server action**

`src/lib/actions/employee.ts`:
```typescript
'use server'

import { db } from '@/lib/db'
import { employeeFormSchema } from '@/lib/validations/employee'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'

export async function createEmployee(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  
  const parsed = employeeFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  const data = parsed.data

  const existingEmail = await db.user.findUnique({ where: { email: data.email } })
  if (existingEmail) {
    return { error: 'An employee with this email already exists.', fieldErrors: {} }
  }

  const existingCode = await db.employee.findUnique({ where: { employeeCode: data.employeeCode } })
  if (existingCode) {
    return { error: 'An employee with this code already exists.', fieldErrors: {} }
  }

  try {
    const passwordHash = await bcrypt.hash(data.password, 10)

    await db.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role as Role,
        employee: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
            employeeCode: data.employeeCode,
            dateOfBirth: new Date(data.dateOfBirth),
            nationality: data.nationality,
            maritalStatus: data.maritalStatus || null,
            phoneNumber: data.phoneNumber || null,
            jobTitle: data.jobTitle,
            department: data.department,
            hireDate: new Date(data.hireDate),
            salary: parseFloat(data.salary),
            bankName: data.bankName || null,
            iban: data.iban || null,
            swift: data.swift || null,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
          },
        },
      },
    })
  } catch (e) {
    return { error: 'Something went wrong. Please try again.', fieldErrors: {} }
  }

  revalidatePath('/employees')
  redirect('/employees')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions && git commit -m "feat: add create employee server action with validation and duplicate checks"
```

### Task 12: Add Employee Form Page

**Files:** Create `src/app/[locale]/(hr)/employees/new/page.tsx`

- [ ] **Step 1: Write add employee form page**

`src/app/[locale]/(hr)/employees/new/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { employeeFormSchema, type EmployeeFormData, departments, maritalStatuses, countries } from '@/lib/validations/employee'
import { createEmployee } from '@/lib/actions/employee'
import { toast } from 'sonner'
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const sections = [
  { key: 'personal', label: 'personalInfo' },
  { key: 'job', label: 'jobDetails' },
  { key: 'bank', label: 'bankDetails' },
  { key: 'emergency', label: 'emergencyContact' },
] as const

type SectionKey = (typeof sections)[number]['key']

function generateEmployeeCode() {
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `EMP-${num}`
}

export default function AddEmployeePage() {
  const t = useTranslations('employeesAdd')
  const tc = useTranslations('common')
  const te = useTranslations('errors')
  const { locale } = useParams<{ locale: string }>()
  const router = useRouter()
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['personal', 'job'])
  )
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeCode: generateEmployeeCode(),
      role: 'EMPLOYEE',
    },
  })

  function toggleSection(section: SectionKey) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  async function onSubmit(data: EmployeeFormData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string)
      }
    })

    const result = await createEmployee(formData)

    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${locale}/employees`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        {/* Section 1: Personal Information */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('personal')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span>{t('personalInfo')}</span>
              {expandedSections.has('personal') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('personal') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName')} *</Label>
                  <Input id="firstName" {...register('firstName')} disabled={loading} />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName')} *</Label>
                  <Input id="lastName" {...register('lastName')} disabled={loading} />
                  {errors.lastName && (
                    <p className="text-sm text-red-500">{errors.lastName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input id="email" type="email" {...register('email')} disabled={loading} />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')} *</Label>
                  <Input id="password" type="password" {...register('password')} disabled={loading} />
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('phoneNumber')}</Label>
                  <Input id="phoneNumber" {...register('phoneNumber')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">{t('dateOfBirth')} *</Label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} disabled={loading} />
                  {errors.dateOfBirth && (
                    <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('nationality')} *</Label>
                  <Select
                    onValueChange={(v) => setValue('nationality', v)}
                    value={watch('nationality')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('nationality')} />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.nationality && (
                    <p className="text-sm text-red-500">{errors.nationality.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('maritalStatus')}</Label>
                  <Select
                    onValueChange={(v) => setValue('maritalStatus', v)}
                    value={watch('maritalStatus')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('maritalStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Job Details */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('job')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span>{t('jobDetails')}</span>
              {expandedSections.has('job') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('job') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">{t('employeeCode')} *</Label>
                  <Input id="employeeCode" {...register('employeeCode')} disabled={loading} />
                  {errors.employeeCode && (
                    <p className="text-sm text-red-500">{errors.employeeCode.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">{t('jobTitle')} *</Label>
                  <Input id="jobTitle" {...register('jobTitle')} disabled={loading} />
                  {errors.jobTitle && (
                    <p className="text-sm text-red-500">{errors.jobTitle.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('department')} *</Label>
                  <Select
                    onValueChange={(v) => setValue('department', v)}
                    value={watch('department')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('department')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-sm text-red-500">{errors.department.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">{t('hireDate')} *</Label>
                  <Input id="hireDate" type="date" {...register('hireDate')} disabled={loading} />
                  {errors.hireDate && (
                    <p className="text-sm text-red-500">{errors.hireDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">{t('salary')} *</Label>
                  <Input id="salary" {...register('salary')} placeholder="5000.00" disabled={loading} />
                  {errors.salary && (
                    <p className="text-sm text-red-500">{errors.salary.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('role')} *</Label>
                  <Select
                    onValueChange={(v) => setValue('role', v as 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE')}
                    value={watch('role')}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">{'Employee'}</SelectItem>
                      <SelectItem value="MANAGER">{'Manager'}</SelectItem>
                      <SelectItem value="HR_ADMIN">{'HR Admin'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Bank Details (optional) */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('bank')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('bankDetails')}
                <Badge variant="secondary" className="text-xs">{t('optional')}</Badge>
              </span>
              {expandedSections.has('bank') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('bank') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">{t('bankName')}</Label>
                  <Input id="bankName" {...register('bankName')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">{t('iban')}</Label>
                  <Input id="iban" {...register('iban')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swift">{t('swift')}</Label>
                  <Input id="swift" {...register('swift')} disabled={loading} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Emergency Contact (optional) */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('emergency')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('emergencyContact')}
                <Badge variant="secondary" className="text-xs">{t('optional')}</Badge>
              </span>
              {expandedSections.has('emergency') ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {expandedSections.has('emergency') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">{t('emergencyContactName')}</Label>
                  <Input id="emergencyContactName" {...register('emergencyContactName')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">{t('emergencyContactPhone')}</Label>
                  <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} disabled={loading} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" asChild>
            <Link href={`/${locale}/employees`}>{tc('cancel')}</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : (
              <>
                <Save className="me-2 h-4 w-4" />
                {t('save')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Test add employee flow**

Start dev server, sign in, go to `/en/employees/new`. Fill form with test data and submit. Verify redirect to `/en/employees` and new employee appears in list.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/(hr)/employees/new && git commit -m "feat: implement add employee form with multi-section collapsible layout"
```

---

### Task 13: Verification & Final Testing

- [ ] **Step 1: Run type check**

```bash
npm run build
```
Expected: Build completes without TypeScript errors. Fix any issues found.

- [ ] **Step 2: Manual walkthrough — Auth flow**

```
1. Visit http://localhost:3000/en/dashboard → redirect to /en/auth/signin
2. Enter wrong credentials → error message shows
3. Enter admin@riman.com / admin123 → redirect to /en/dashboard
4. Visit http://localhost:3000/ar/auth/signin → Arabic sign-in page renders
5. Sign in from Arabic page → redirect to /ar/dashboard
6. Click sign out → redirect to /en/auth/signin
```

- [ ] **Step 3: Manual walkthrough — Employees flow**

```
1. Sign in, visit /en/employees → list page loads
2. Verify seed admin appears in table
3. Click "Add Employee" → form loads
4. Fill all required fields, submit → redirect to list, new employee shows
5. Visit /en/employees?q=test → search filters results
6. Visit /ar/employees → Arabic list page renders
7. Visit /ar/employees/new → Arabic form renders
```

- [ ] **Step 4: Manual walkthrough — Dashboard**

```
1. Visit /en/dashboard → KPI cards show total employee count
2. If no employees → empty state with CTA shows
3. If employees exist → "Add Employee" button shows at bottom
```

- [ ] **Step 5: Manual walkthrough — RTL**

```
1. Switch to Arabic from any page
2. Verify layout is mirrored (sidebar on right, text right-to-left)
3. Verify form labels and inputs are RTL aligned
4. Verify date picker respects RTL
```

- [ ] **Step 6: Fix any issues found**

Iterate on any bugs, styling issues, or missing functionality found in walkthrough.

- [ ] **Step 7: Final commit**

```bash
git add -A && git commit -m "chore: final cleanup and verification of Phase 1"
```

---

## Completion Checklist

After all tasks complete, verify:

- [ ] `npm run build` passes with no errors
- [ ] `npx prisma studio` shows correct schema
- [ ] Sign in works with seeded admin credentials
- [ ] Dashboard shows employee count
- [ ] Employee list shows all employees
- [ ] Add employee form creates new employee in database
- [ ] Search and pagination work on employee list
- [ ] English and Arabic translations render correctly
- [ ] RTL layout renders correctly for Arabic
- [ ] Authentication middleware protects routes
- [ ] Sign out and re-sign in works

---
