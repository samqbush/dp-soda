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

  test('shows App Information with version and platform', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('App Information')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Version')).toBeVisible();
    await expect(page.getByText('Platform')).toBeVisible();
  });
});
