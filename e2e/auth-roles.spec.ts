import { test, expect } from '@playwright/test';

test.describe('Role-based Access Control', () => {
  test('HR_ADMIN can access manager leaves page without redirect', async ({ page }) => {
    // Login as HR_ADMIN
    await page.goto('/en/auth/signin');
    await page.fill('#email', 'admin@riman.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for dashboard or navigation
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to leave requests
    await page.click('text=Leave Requests');
    
    // Check if we are on the manager leaves page and NOT redirected to signin
    await expect(page).toHaveURL(/\/manager\/leaves/);
    await expect(page.locator('h1')).toContainText(/Leave Requests|طلبات الإجازات/);
  });

  test('HR_ADMIN can access all manager pages', async ({ page }) => {
    // Login as HR_ADMIN
    await page.goto('/en/auth/signin');
    await page.fill('#email', 'admin@riman.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    const pages = [
      { url: '/en/manager/attendance', title: 'Attendance' },
      { url: '/en/manager/payroll', title: 'Payroll' },
      { url: '/en/manager/performance', title: 'Performance' },
      { url: '/en/manager/documents', title: 'Documents' },
    ];

    for (const p of pages) {
      await page.goto(p.url);
      await expect(page).toHaveURL(p.url);
      // We check for the presence of the title or at least that we are not redirected
      await expect(page).not.toHaveURL(/\/auth\/signin/);
    }
  });

  test('EMPLOYEE cannot access manager leaves page', async ({ page }) => {
    // Login as EMPLOYEE
    await page.goto('/en/auth/signin');
    await page.fill('#email', 'fatima@riman.com');
    await page.fill('#password', 'employee123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/dashboard/);

    // Try to navigate directly to manager leaves
    await page.goto('/en/manager/leaves');

    // Middleware redirects employees away from /manager/* to their dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
