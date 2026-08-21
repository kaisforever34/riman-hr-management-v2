### Task 11: Database indexes for hot query paths

**Files:**
- Modify: `prisma/schema.prisma`
- Create: new migration via `npx prisma migrate dev --name add_performance_indexes`

**Context:** Manager lists filter by status/date frequently; notifications poll unread per user.

- [ ] **Step 1: Add indexes to schema**

In `LeaveRequest`:
```prisma
  @@index([employeeId, status])
  @@index([status, startDate, endDate])
```

In `AttendanceRecord`:
```prisma
  @@index([employeeId, date])
```
(unique already covers this — skip; instead add)
```prisma
  @@index([date])
```

In `Notification`:
```prisma
  @@index([userId, isRead])
```

In `Payslip`:
```prisma
  @@index([employeeId])
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name add_performance_indexes`
Expected: migration created and applied to dev DB

- [ ] **Step 3: Verify build + tests**

Run: `npx prisma generate && npm run verify`
Expected: green

- [ ] **Step 4: Commit**

```bash
git add prisma
git commit -m "perf: add indexes for leave, attendance, notification queries"
```

---


