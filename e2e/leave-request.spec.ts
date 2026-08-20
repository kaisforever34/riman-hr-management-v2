import { test, expect } from '@playwright/test';

test.describe('Employee Leave Request', () => {
  test('Employee can submit a leave request', async ({ page }) => {
    // Login as EMPLOYEE
    await page.goto('/en/auth/signin');
    await page.fill('#email', 'ahmed@riman.com');
    await page.fill('#password', 'employee123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to my leaves
    await page.click('text=My Leaves');
    await expect(page).toHaveURL(/\/leave/);

    // Click on request leave
    await page.click('text=Submit Leave Request');

    // Fill the form
    // Open the leave type select
    await page.getByRole('combobox').first().click();
    // Select the first option in the dropdown (usually Annual)
    await page.getByRole('option').first().click();
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    await page.fill('#startDate', formatDate(tomorrow));
    await page.fill('#endDate', formatDate(dayAfter));
    const testReason = `Test leave request ${Math.random().toString(36).substring(7)}`;
    await page.fill('#reason', testReason);

    // Submit
    await page.click('button[type="submit"]:has-text("Submit Leave Request")');

    // Should be back on /leave and see the new request
    await expect(page).toHaveURL(/\/leave/);
    await expect(page.locator(`text=${testReason}`)).toBeVisible();
  });
});
