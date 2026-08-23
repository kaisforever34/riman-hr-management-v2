import { test, expect } from '@playwright/test';

test.describe('Employee Leave Request', () => {
  test('Employee can submit a leave request', async ({ page }) => {
    // Login as EMPLOYEE
    await page.goto('/en/auth/signin');
    await page.fill('#email', 'fatima@riman.com');
    await page.fill('#password', 'employee123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to my leaves
    await page.click('text=My Leaves');
    await expect(page).toHaveURL(/\/leave/);

    // Click on request leave
    await page.click('text=Submit Leave Request');

    // Fill the form
    // Open the leave type select and choose the first option (usually Annual)
    const consoleMsgs: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleMsgs.push(`[console.error] ${m.text().slice(0, 200)}`);
    });
    page.on('pageerror', (e) => pageErrors.push(`[pageerror] ${String(e).slice(0, 200)}`));

    const trigger = page.getByRole('combobox').first();
    await trigger.click();

    // Poll aria-expanded for 4s to detect open->close flash
    const seen: string[] = [];
    for (let i = 0; i < 40; i++) {
      seen.push((await trigger.getAttribute('aria-expanded')) ?? 'null');
      await page.waitForTimeout(100);
    }
    console.log('aria-expanded timeline:', seen.join(','));
    console.log('console errors:', consoleMsgs.length ? consoleMsgs.join(' | ') : '(none)');
    console.log('page errors:', pageErrors.length ? pageErrors.join(' | ') : '(none)');
    await page.screenshot({ path: 'test-results/failing-after-combo-click.png' });

    if ((await page.getByRole('option').count()) === 0) {
      console.log('-- no options; retrying combobox click --');
      await trigger.click();
      await page.waitForTimeout(1000);
      console.log('after retry aria-expanded:', await trigger.getAttribute('aria-expanded'));
      console.log('after retry option count:', await page.getByRole('option').count());
    }

    await page.getByRole('option').first().click();
    
    const today = new Date();
    // Use a far-future window so repeated runs don't collide with earlier PENDING requests
    const startOffset = 30 + Math.floor(Math.random() * 20);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() + startOffset);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    await page.fill('#startDate', formatDate(startDate));
    await page.fill('#endDate', formatDate(endDate));
    const testReason = `Test leave request ${Math.random().toString(36).substring(7)}`;
    await page.fill('#reason', testReason);

    // Submit
    await page.click('button[type="submit"]:has-text("Submit Leave Request")');

    // Should be back on /leave and see the new request row (list shows type/dates/status, not reason)
    await expect(page).toHaveURL(/\/leave/);
    const newRow = page.getByRole('row').filter({ hasText: 'Pending' }).first();
    await expect(newRow).toBeVisible();
    await expect(newRow).toContainText('Annual');
  });
});
