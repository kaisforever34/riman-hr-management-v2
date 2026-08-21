### Task 6: Calendar shading

**Files:**
- Modify: `src/app/[locale]/(hr)/manager/leaves/calendar/page.tsx`
- Modify: `src/app/[locale]/(hr)/manager/leaves/calendar/calendar-client.tsx`

**Interfaces:**
- Consumes: `getHolidays()` (Task 4), `isWorkingDay`, `toUaeDateKey` (Task 1).

- [ ] **Step 1: Page passes data**

In `calendar/page.tsx`, fetch holidays alongside existing queries and pass down:
`const holidays = await getHolidays()` then prop `holidayKeys={JSON.parse(JSON.stringify(holidays.map((h) => h.date.toISOString())))}`.
Simpler and safer: pass raw dates and convert in client with `toUaeDateKey(new Date(h.date))` — pass `holidays={JSON.parse(JSON.stringify(holidays))}`.

- [ ] **Step 2: Client shades cells**

In `calendar-client.tsx`:
- Build `const holidaySet = new Set(holidays.map((h) => toUaeDateKey(new Date(h.date))))`.
- For each rendered day cell, determine its date key and apply a muted/grey class when `!isWorkingDay(key, workWeekOfCellContext, holidaySet)`. The calendar renders leave entries per employee — if employees' `workWeek` is available in existing props use it; otherwise pass `workWeek` per employee from the page query (add `workWeek: true` to the employee select in the page's query if it selects specific fields).
- Non-working cells get `className="... opacity-40 bg-muted"` merged with existing cell classes (match file's class style).

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npm run lint` 
Expected: green

```bash
git add "src/app/[locale]/(hr)/manager/leaves/calendar"
git commit -m "feat: shade non-working days and holidays on leave calendar"
```

---


