d4e4b81 chore: remove test artifacts and harden gitignore
 TASK-STATE.md            | 52 ------------------------------------------------
 e2e/debug-select.spec.ts | 46 ------------------------------------------
 2 files changed, 98 deletions(-)
diff --git a/TASK-STATE.md b/TASK-STATE.md
deleted file mode 100644
index 6dc5f86..0000000
--- a/TASK-STATE.md
+++ /dev/null
@@ -1,52 +0,0 @@
-# Task State: Fix Failing E2E Leave Request Test
-
-## Objective
-Fix failing Playwright E2E test `Employee Leave Request ΓÇ║ Employee can submit a leave request` (`e2e/leave-request.spec.ts`) in the Riman HR app.
-
-## Current Status
-**In progress ΓÇö root cause narrowed down, debug test written but not yet run.**
-
-## Key Findings (verified)
-1. Failure point: `e2e/leave-request.spec.ts:23` ΓÇö `await page.getByRole('option').first().click()` times out after 90s. The click on the combobox (line 22) succeeds; combobox shows `[active]` in snapshot but NO listbox/options ever appear in DOM.
-2. `src/components/ui/select.tsx` uses **Base UI** (`@base-ui/react/select` v1.4.1), not Radix.
-3. Base UI ARIA roles are CORRECT (verified in node_modules source):
-   - Trigger ΓåÆ `role="combobox"` (SelectTrigger.js:145)
-   - List ΓåÆ `role="listbox"` (SelectList.js:39)
-   - Item ΓåÆ `role="option"` (SelectItem.js:122)
-4. Therefore the popup itself never opens (or opens+instantly closes). Suspected causes:
-   - Click happens before React hydration completes (dev server compile is slow: pages took 30-40s to load during tests), OR
-   - Popup opens but immediately closes (focus/event issue).
-5. Stale red herring: `[auth][error] MissingCSRF` in dev-err.log is OLD (from earlier manual smoke tests). Auth works fine ΓÇö other E2E tests (auth-roles.spec.ts) pass.
-
-## Next Steps (in order)
-1. Run the debug spec already written at `e2e/debug-select.spec.ts`:
-   ```
-   npx playwright test e2e/debug-select.spec.ts --reporter=list
-   ```
-   It logs in as fatima@riman.com, goes to /en/leave/new, clicks the combobox, then prints:
-   - aria-expanded before/after click
-   - counts of option/listbox/[data-slot="select-item"]/[data-slot="select-content"]
-   - dumps select-content HTML if present
-   - screenshot to test-results/debug-select.png
-2. Interpret results:
-   - If `aria-expanded` stays "false" after click ΓåÆ popup never opens. Check for JS errors in browser console; likely hydration timing or an error in SubmitLeaveForm. Try adding `await page.waitForLoadState('networkidle')` or wait for hydration before clicking.
-   - If `aria-expanded` = "true" but option count = 0 ΓåÆ popup opens but items don't render; inspect how leaveTypes data reaches SelectItem (check `src/app/[locale]/(hr)/leave/new/page.tsx` passes `leaveTypes` prop, and `submit-leave-form.tsx` maps them).
-   - If counts > 0 ΓåÆ selector/timing issue only; fix test with proper waits.
-3. Apply fix, delete `e2e/debug-select.spec.ts`, re-run full suite:
-   ```
-   npx playwright test --reporter=list
-   ```
-
-## Environment Notes
-- Windows, PowerShell (pwsh). Working dir: `E:\riman hr management v2`.
-- Dev server runs on localhost:3000 (started separately, logs piped to dev-out.log / dev-err.log ΓÇö both locked by the running process, cannot Clear-Content).
-- Playwright MCP browser tools unavailable ("Playwright MCP Bridge" extension not installed) ΓÇö use CLI `npx playwright test` only.
-- Test creds used by this spec: fatima@riman.com / employee123 (EMPLOYEE role).
-- Other specs in e2e/ were previously fixed and passing: auth-roles.spec.ts (HR_ADMIN manager-leaves access).
-
-## Relevant Files
-- `e2e/leave-request.spec.ts` ΓÇö the failing test (45 lines; login lines 6-9, select interaction lines 22-23, form fill 33-36, submit line 39).
-- `e2e/debug-select.spec.ts` ΓÇö NEW debug spec, ready to run.
-- `src/components/ui/select.tsx` ΓÇö Base UI Select wrapper (199 lines, fully read). Items render via `SelectPrimitive.Item` with `data-slot="select-item"`.
-- `src/app/[locale]/(hr)/leave/new/page.tsx` ΓÇö server page passing `leaveTypes` to form (18 lines, read OK).
-- `src/app/[locale]/(hr)/leave/new/submit-leave-form.tsx` ΓÇö NOT yet read; likely needed if items don't render.
diff --git a/e2e/debug-select.spec.ts b/e2e/debug-select.spec.ts
deleted file mode 100644
index 10877ca..0000000
--- a/e2e/debug-select.spec.ts
+++ /dev/null
@@ -1,46 +0,0 @@
-import { test } from '@playwright/test';
-
-test('debug select via client navigation (replicates failing spec)', async ({ page }) => {
-  const consoleMsgs: string[] = [];
-  const pageErrors: string[] = [];
-  page.on('console', (m) => {
-    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`);
-  });
-  page.on('pageerror', (e) => pageErrors.push(`[pageerror] ${String(e).slice(0, 300)}`));
-
-  await page.goto('/en/auth/signin');
-  await page.fill('#email', 'fatima@riman.com');
-  await page.fill('#password', 'employee123');
-  await page.click('button[type="submit"]');
-  await page.waitForURL(/\/dashboard/);
-
-  // Same client-side navigation path as the failing spec
-  await page.click('text=My Leaves');
-  await page.waitForURL(/\/leave/);
-  await page.click('text=Submit Leave Request');
-
-  const trigger = page.getByRole('combobox').first();
-  await trigger.waitFor({ state: 'visible', timeout: 30000 });
-  console.log('URL now:', page.url());
-
-  console.log('BEFORE CLICK aria-expanded:', await trigger.getAttribute('aria-expanded'));
-  await trigger.click();
-  await page.waitForTimeout(1500);
-  console.log('AFTER CLICK #1 aria-expanded:', await trigger.getAttribute('aria-expanded'));
-  console.log('option count after #1:', await page.getByRole('option').count());
-
-  if ((await page.getByRole('option').count()) === 0) {
-    console.log('-- retrying click after 2s (hydration/transition theory) --');
-    await page.waitForTimeout(2000);
-    await trigger.click();
-    await page.waitForTimeout(1500);
-    console.log('AFTER CLICK #2 aria-expanded:', await trigger.getAttribute('aria-expanded'));
-    console.log('option count after #2:', await page.getByRole('option').count());
-  }
-
-  console.log('listbox count:', await page.getByRole('listbox').count());
-  console.log('console msgs:', consoleMsgs.length ? consoleMsgs.join('\n') : '(none)');
-  console.log('page errors:', pageErrors.length ? pageErrors.join('\n') : '(none)');
-
-  await page.screenshot({ path: 'test-results/debug-select-v2.png', fullPage: true });
-});
