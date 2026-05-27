import { test, expect } from './fixtures';

test.describe('Settings Tab', () => {
  test('loads and displays settings title', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows wind speed threshold section', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Wind Speed Threshold').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows app preferences description', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('Configure your app preferences')).toBeVisible({ timeout: 10000 });
  });

  test('shows App Features section with Wind Guru toggle', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('App Features')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Wind Guru Tab')).toBeVisible();
    await expect(page.getByText('Enable experimental wind forecasting features')).toBeVisible();
  });

  test('shows App Information with version and platform', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('App Information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Version')).toBeVisible();
    await expect(page.getByText('Platform')).toBeVisible();
  });

  test('Wind Guru toggle shows warning when enabled', async ({ page }) => {
    await page.goto('/settings');
    const toggle = page.locator('input[role="switch"]').first();
    const warningText = page.getByText('Wind Guru features are under development');

    // Check current state and ensure we start from disabled
    if (await warningText.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Already enabled from another test — disable first
      await toggle.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Now toggle ON and verify warning appears
    await toggle.click({ force: true });
    await expect(page.getByText('Experimental Feature').first()).toBeVisible({ timeout: 5000 });
    await expect(warningText).toBeVisible();

    // Toggle OFF to clean up
    await toggle.click({ force: true });
    await page.waitForTimeout(500);
  });
});
