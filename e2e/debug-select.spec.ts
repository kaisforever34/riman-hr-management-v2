import { test } from '@playwright/test';

test('debug select via client navigation (replicates failing spec)', async ({ page }) => {
  const consoleMsgs: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`[console.${m.type()}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => pageErrors.push(`[pageerror] ${String(e).slice(0, 300)}`));

  await page.goto('/en/auth/signin');
  await page.fill('#email', 'fatima@riman.com');
  await page.fill('#password', 'employee123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);

  // Same client-side navigation path as the failing spec
  await page.click('text=My Leaves');
  await page.waitForURL(/\/leave/);
  await page.click('text=Submit Leave Request');

  const trigger = page.getByRole('combobox').first();
  await trigger.waitFor({ state: 'visible', timeout: 30000 });
  console.log('URL now:', page.url());

  console.log('BEFORE CLICK aria-expanded:', await trigger.getAttribute('aria-expanded'));
  await trigger.click();
  await page.waitForTimeout(1500);
  console.log('AFTER CLICK #1 aria-expanded:', await trigger.getAttribute('aria-expanded'));
  console.log('option count after #1:', await page.getByRole('option').count());

  if ((await page.getByRole('option').count()) === 0) {
    console.log('-- retrying click after 2s (hydration/transition theory) --');
    await page.waitForTimeout(2000);
    await trigger.click();
    await page.waitForTimeout(1500);
    console.log('AFTER CLICK #2 aria-expanded:', await trigger.getAttribute('aria-expanded'));
    console.log('option count after #2:', await page.getByRole('option').count());
  }

  console.log('listbox count:', await page.getByRole('listbox').count());
  console.log('console msgs:', consoleMsgs.length ? consoleMsgs.join('\n') : '(none)');
  console.log('page errors:', pageErrors.length ? pageErrors.join('\n') : '(none)');

  await page.screenshot({ path: 'test-results/debug-select-v2.png', fullPage: true });
});
