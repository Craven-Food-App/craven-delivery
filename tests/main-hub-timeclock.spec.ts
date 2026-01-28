import { test, expect, Page } from '@playwright/test';

// This test is meant to be run locally against your dev server at http://localhost:8080
// Run it headed so you can watch it exercise the time clock live:
//   npm run test:e2e -- tests/main-hub-timeclock.spec.ts -- --headed --project=chromium

async function gotoHub(page: Page) {
  await page.goto('http://localhost:8080/hub', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });

  // If redirected to auth, stop early and surface that in the trace
  const url = page.url();
  if (url.includes('/auth') || url.includes('/business-auth')) {
    console.warn('⚠️ Not logged in – time clock test requires an authenticated session at /hub.');
  }
}

test.describe('Main Hub – Time Clock end‑to‑end behaviour', () => {
  test('stays in sync across navigation and refresh', async ({ page }) => {
    // 1) Go to Main Hub
    await gotoHub(page);

    // Wait for the time clock card to appear
    const timeClock = page.getByTestId('time-clock-card');
    await expect(timeClock, 'Time clock card should be visible on hub').toBeVisible({ timeout: 20000 });

    const status = page.getByTestId('time-clock-status');
    const clockInBtn = page.getByTestId('time-clock-clock-in');
    const clockOutBtn = page.getByTestId('time-clock-clock-out');

    // Snapshot initial state
    const initialStatus = await status.textContent();
    console.log('Initial time clock status:', initialStatus);

    // 2) If already clocked in, clock out first so we start clean
    if ((initialStatus || '').toLowerCase().includes('clocked in')) {
      await expect(clockOutBtn).toBeEnabled();
      await clockOutBtn.click();
      await page.waitForTimeout(1500);
      await expect(status).toHaveText(/clocked out/i, { timeout: 10_000 });
    }

    // 3) Clock in
    await expect(clockInBtn).toBeEnabled();
    await clockInBtn.click();

    // If SSN verification modal is shown, this test will currently stop here;
    // you can adapt it later to also fill that flow. For now, just wait a bit.
    await page.waitForTimeout(2000);

    // Verify UI shows "Clocked In"
    await expect(status).toHaveText(/clocked in/i, { timeout: 15_000 });

    // 4) Navigate away to a portal and back to hub
    // Use any portal tile that exists for you – this is generic and may need minor selector tweaks.
    // Try Company portal first, then fallback.
    const portalSelectors = [
      'text=Company Portal',
      'text=Company',
      '[data-testid="portal-company"]',
    ];

    let clickedPortal = false;
    for (const selector of portalSelectors) {
      const portal = page.locator(selector).first();
      if (await portal.isVisible().catch(() => false)) {
        await portal.click();
        clickedPortal = true;
        break;
      }
    }

    if (clickedPortal) {
      // Give routing a moment
      await page.waitForTimeout(2000);

      // Navigate back to hub explicitly
      await page.goto('http://localhost:8080/hub', {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await expect(timeClock).toBeVisible({ timeout: 20_000 });

      // 5) After navigation back, UI should STILL show Clocked In
      await expect(status, 'After portal navigation back to hub, status should still be Clocked In')
        .toHaveText(/clocked in/i, { timeout: 15_000 });
    }

    // 6) Refresh the page and re‑check
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(timeClock).toBeVisible({ timeout: 20_000 });
    await expect(status, 'After full page reload, status should still be Clocked In')
      .toHaveText(/clocked in/i, { timeout: 15_000 });

    // 7) Attempt to clock in again – button should be disabled when already clocked in
    await expect(clockInBtn, 'Clock In button should be disabled while already clocked in')
      .toBeDisabled();

    // 8) Finally, clock out and verify state
    await expect(clockOutBtn).toBeEnabled();
    await clockOutBtn.click();
    await page.waitForTimeout(1500);
    await expect(status).toHaveText(/clocked out/i, { timeout: 15_000 });
  });
});


