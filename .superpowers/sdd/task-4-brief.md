### Task 4: Global error boundary + error.tsx for root

**Files:**
- Check existing: `src/app/[locale]/(hr)/error.tsx` (exists)
- Create: `src/app/[locale]/error.tsx`
- Create: `src/app/[locale]/(auth)/error.tsx` (only if missing)
- Create: `src/app/global-error.tsx`

**Interfaces:**
- Produces: error UI at every route segment level; `global-error.tsx` catches root layout crashes.

- [ ] **Step 1: Read `src/app/[locale]/(hr)/error.tsx` and mirror its pattern (i18n + reset button) for `src/app/[locale]/error.tsx` and `src/app/global-error.tsx`.**

`src/app/global-error.tsx` (must render its own html/body):

```tsx
'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui', display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>Something went wrong</h1>
          <button onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>Try again</button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success

- [ ] **Step 3: Commit**

```bash
git add src/app
git commit -m "feat: add global and locale-level error boundaries"
```

---


