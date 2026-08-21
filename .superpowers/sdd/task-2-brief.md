### Task 2: Schema migration (workWeek + Holiday)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via CLI

**Interfaces:**
- Produces: `Employee.workWeek: number[]` (default `[0,1,2,3,4]`), `db.holiday` model with `findMany/findUnique/create/update/delete`.

- [ ] **Step 1: Edit schema**

In `model Employee`, add after `isActive Boolean @default(true)`:

```prisma
  workWeek              Int[]          @default([0, 1, 2, 3, 4])
```

Add new model after `LeaveType`:

```prisma
model Holiday {
  id        String   @id @default(cuid())
  name      String
  nameAr    String?
  date      DateTime @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Create and apply migration**

Run: `npx prisma migrate dev --name workweek_and_holidays` (timeout ≥180000ms)
Expected: migration applied cleanly to dev DB

- [ ] **Step 3: Regenerate client and typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: clean

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "feat: add Employee.workWeek and Holiday table"
```

---


