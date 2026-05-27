import { test, expect } from './fixtures';

test.describe('Standley Lake Tab', () => {
  test('loads and displays station name', async ({ page }) => {
    await page.goto('/standley-lake');
    await expect(page.getByText('Standley Lake Wind Monitor')).toBeVisible({ timeout: 10000 });
  });

  test('displays wind data after loading', async ({ page }) => {
    await page.goto('/standley-lake');
    await expect(page.getByText(/mph/i)).toBeVisible({ timeout: 30000 });
  });

  test('shows subtitle description', async ({ page }) => {
    await page.goto('/standley-lake');
    await expect(page.getByText('Ecowitt monitor located on the west side of the lake')).toBeVisible({ timeout: 10000 });
  });

  test('shows current conditions card', async ({ page }) => {
    await page.goto('/standley-lake');
    await expect(page.getByText('Current Conditions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Wind Speed')).toBeVisible();
    await expect(page.getByText('Humidity')).toBeVisible();
  });

  test('does not show external data link (Standley-specific)', async ({ page }) => {
    await page.goto('/standley-lake');
    await expect(page.getByText('Current Conditions')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Detailed Weather Data')).not.toBeVisible();
  });
});
