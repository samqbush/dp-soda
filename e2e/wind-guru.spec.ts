import { test, expect } from './fixtures';

test.describe('Wind Guru Tab (disabled)', () => {
  test('shows disabled message when feature is off', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText('Wind Guru Disabled')).toBeVisible({ timeout: 10000 });
  });

  test('shows instructions to enable feature', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText(/Go to the Settings tab/)).toBeVisible({ timeout: 10000 });
  });

  test('shows experimental warning in disabled state', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText('Experimental Feature').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Wind Guru Tab (enabled)', () => {
  test.beforeEach(async ({ page }) => {
    // Enable Wind Guru via Settings first
    await page.goto('/settings');
    const toggle = page.locator('input[role="switch"]').first();
    await toggle.click({ force: true });
    await expect(page.getByText('Experimental Feature').first()).toBeVisible({ timeout: 5000 });
  });

  test.afterEach(async ({ page }) => {
    // Disable Wind Guru to restore default state
    await page.goto('/settings');
    const toggle = page.locator('input[role="switch"]').first();
    await toggle.click({ force: true });
  });

  test('shows full Wind Guru page when enabled', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText('Wind Guru - Morrison, CO')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Server-Based Wind Prediction')).toBeVisible();
  });

  test('shows migration notice and under development card', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText('Moving to Server-Based Predictions')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Under Development')).toBeVisible();
  });

  test('shows development timeline', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText('Development Timeline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Local prediction logic removed')).toBeVisible();
  });

  test('shows coming soon footer', async ({ page }) => {
    await page.goto('/wind-guru');
    await expect(page.getByText(/Coming Soon: Server-Powered Wind Predictions/)).toBeVisible({ timeout: 10000 });
  });

  test('collapsible section expands and collapses', async ({ page }) => {
    await page.goto('/wind-guru');
    // Initially collapsed
    await expect(page.getByText('How Server Predictions Will Work')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tap to learn about our server-based approach')).toBeVisible();

    // Expand
    await page.getByText('How Server Predictions Will Work').click();
    await expect(page.getByText('Tap to collapse')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Faster Processing')).toBeVisible();
    await expect(page.getByText('Improved Accuracy')).toBeVisible();
    await expect(page.getByText('New Server Features')).toBeVisible();

    // Collapse
    await page.getByText('How Server Predictions Will Work').click();
    await expect(page.getByText('Tap to learn about our server-based approach')).toBeVisible({ timeout: 5000 });
  });
});
