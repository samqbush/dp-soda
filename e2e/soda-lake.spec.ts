import { test, expect } from './fixtures';

test.describe('Soda Lake Tab', () => {
  test('loads and displays station name', async ({ page }) => {
    await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });
  });

  test('displays wind data after loading', async ({ page }) => {
    await expect(page.getByText(/mph/i)).toBeVisible({ timeout: 30000 });
  });

  test('shows current conditions card', async ({ page }) => {
    await expect(page.getByText('Current Conditions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Wind Speed')).toBeVisible();
    await expect(page.getByText('Direction')).toBeVisible();
    await expect(page.getByText('Humidity')).toBeVisible();
    await expect(page.getByText('Last Updated')).toBeVisible();
  });

  test('shows wind chart when data is available', async ({ page }) => {
    await expect(page.getByText("Today's Wind Speed")).toBeVisible({ timeout: 30000 });
  });

  test('shows external data link for Soda Lake', async ({ page }) => {
    await expect(page.getByText('Detailed Weather Data').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('📊 View Detailed Weather Data').first()).toBeVisible();
  });

  test('shows subtitle description', async ({ page }) => {
    await expect(page.getByText('Ecowitt monitor located at the head of the lake')).toBeVisible({ timeout: 10000 });
  });
});
