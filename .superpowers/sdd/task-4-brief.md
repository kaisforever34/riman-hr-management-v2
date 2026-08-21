### Task 4: Holiday admin (actions + page)

**Files:**
- Create: `src/lib/validations/holiday.ts`
- Create: `src/lib/actions/holiday.ts`
- Create: `src/lib/queries/holiday.ts`
- Create: `src/app/[locale]/(hr)/manager/holidays/page.tsx`
- Create: `src/app/[locale]/(hr)/manager/holidays/holidays-client.tsx`
- Modify: `src/components/layout/sidebar.tsx` (nav item, manager section)
- Modify: `src/i18n/messages/en.json`, `ar.json` (nav label + page strings under a new `"holidays"` namespace)

**Interfaces:**
- Consumes: `db.holiday` (Task 2).
- Produces: actions `createHoliday(formData)`, `deleteHoliday(formData)`; query `getHolidays(): Promise<Holiday[]>` ordered by date asc.

- [ ] **Step 1: Validation schema**

```ts
// src/lib/validations/holiday.ts
import { z } from 'zod'

export const createHolidaySchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  nameAr: z.string().max(100).optional(),
  date: z.string().min(1, 'Required'),
})

export const deleteHolidaySchema = z.object({
  id: z.string().min(1),
})
```

- [ ] **Step 2: Query**

```ts
// src/lib/queries/holiday.ts
import { db } from '@/lib/db'
import type { Holiday } from '@prisma/client'

export async function getHolidays(): Promise<Holiday[]> {
  return db.holiday.findMany({ orderBy: { date: 'asc' } })
}
```

- [ ] **Step 3: Actions** (follow exact patterns of `src/lib/actions/employee.ts`: auth check → safeParse → db op → revalidatePath)

```ts
// src/lib/actions/holiday.ts
'use server'

import { serverError } from '@/lib/errors'
import { db } from '@/lib/db'
import { createHolidaySchema, deleteHolidaySchema } from '@/lib/validations/holiday'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = createHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: await serverError('validationFailed'), fieldErrors: parsed.error.flatten().fieldErrors }
  }

  try {
    await db.holiday.create({
      data: { name: parsed.data.name, nameAr: parsed.data.nameAr || null, date: new Date(parsed.data.date) },
    })
  } catch (e) {
    const isUnique = typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002'
    if (isUnique) return { error: await serverError('invalidRequest'), fieldErrors: {} }
    throw e
  }

  revalidatePath('/manager/holidays')
}

export async function deleteHoliday(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const parsed = deleteHolidaySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: await serverError('invalidRequest') }

  await db.holiday.delete({ where: { id: parsed.data.id } })
  revalidatePath('/manager/holidays')
}
```

- [ ] **Step 4: Page + client component**

Page mirrors `src/app/[locale]/(hr)/manager/leave-types/page.tsx` structure exactly (auth guard MANAGER|HR_ADMIN redirect, `export const dynamic = 'force-dynamic'`, JSON-serialize props into client component):

```tsx
// src/app/[locale]/(hr)/manager/holidays/page.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getHolidays } from '@/lib/queries/holiday'
import HolidaysClient from './holidays-client'
export const dynamic = 'force-dynamic'

export default async function HolidaysPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'MANAGER' && session.user.role !== 'HR_ADMIN'))
    redirect(`/${locale}/auth/signin`)
  if (session.user.role !== 'HR_ADMIN') redirect(`/${locale}/dashboard`)

  const holidays = await getHolidays()
  return <HolidaysClient holidays={JSON.parse(JSON.stringify(holidays))} />
}
```

Client component: use existing shadcn ui components (`Card, CardHeader, CardTitle, CardContent, Input, Button, Table`) exactly as used in `leave-types-client.tsx`. Structure:
- Card "Add holiday" with form fields `name`, `nameAr`, `date` (type=date) calling `createHoliday` via a plain `<form action={createHoliday}>`; show `state?.error` via sonner toast or inline text following `leave-types-client.tsx` conventions.
- Table listing holidays (formatted date, name, nameAr, delete button in `<form action={deleteHoliday}>` with hidden `id` input).

i18n: read strings via `useTranslations('holidays')`; add namespace to both message files with keys: `title`, `addTitle`, `name`, `nameAr`, `date`, `add`, `delete`, `empty`.

- [ ] **Step 5: Sidebar nav**

In `src/components/layout/sidebar.tsx`, find the manager-only nav items array (where `/manager/leave-types` is defined) and add an entry `{ href: '/manager/holidays', labelKey: 'nav.holidays' }` matching the exact shape of neighboring entries. Add `nav.holidays` ("Holidays" / "العطلات الرسمية") to both message files.

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)
Expected: green

```bash
git add src/lib/validations/holiday.ts src/lib/actions/holiday.ts src/lib/queries/holiday.ts "src/app/[locale]/(hr)/manager/holidays" src/components/layout/sidebar.tsx src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: HR-managed public holiday admin page"
```

---


