### Task 5: Employee work-week editor

**Files:**
- Modify: `src/app/[locale]/(hr)/employees/new/page.tsx` (or its client form component — locate the form rendering `employeeFormSchema` fields)
- Modify: `src/lib/validations/employee.ts`
- Modify: `src/lib/actions/employee.ts`
- Modify: `src/i18n/messages/en.json`, `ar.json`

**Interfaces:**
- Consumes: `Employee.workWeek` (Task 2).
- Produces: `workWeek` accepted by `createEmployee` (zod-coerced int array); new action `updateEmployeeWorkWeek(formData)`.

- [ ] **Step 1: Schema**

In `src/lib/validations/employee.ts`, add to `employeeFormSchema`:

```ts
  workWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1, 'Select at least one day').default([0, 1, 2, 3, 4]),
```

Note: FormData sends repeated `workWeek` keys; in `createEmployee` build it before parsing:
`const raw = { ...Object.fromEntries(formData.entries()), workWeek: formData.getAll('workWeek') }`

- [ ] **Step 2: Action changes**

In `src/lib/actions/employee.ts` `createEmployee`, inside the `employee.create` data add:
`workWeek: data.workWeek,`

Add new action in the same file:

```ts
export async function updateEmployeeWorkWeek(formData: FormData) {
  const session = await auth()
  if (session?.user.role !== 'HR_ADMIN') return { error: await serverError('unauthorized') }

  const employeeId = formData.get('employeeId') as string
  const days = formData.getAll('workWeek').map(Number)
  const parsed = z.array(z.number().int().min(0).max(6)).min(1).safeParse(days)
  if (!parsed.success || !employeeId) return { error: await serverError('invalidInput') }

  await db.employee.update({ where: { id: employeeId }, data: { workWeek: parsed.data } })
  revalidatePath('/employees')
}
```

(add `import { z } from 'zod'` at top of the file)

- [ ] **Step 3: Form UI**

In the new-employee form client component, add a fieldset of seven checkboxes labeled Sun–Sat (use existing i18n pattern; add `employees.workWeek` label key + `employees.days.sun`…`sat` keys to en/ar messages), all named `workWeek`, value `0`…`6`, Sun–Thu checked by default.

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit && npm run lint && npm run test` (timeout ≥300000ms)
Expected: green

```bash
git add src/lib/validations/employee.ts src/lib/actions/employee.ts "src/app/[locale]/(hr)/employees/new" src/i18n/messages/en.json src/i18n/messages/ar.json
git commit -m "feat: per-employee weekly work pattern on employee forms"
```

---


