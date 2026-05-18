import { test, expect } from './fixtures';

test.describe('Tab Navigation', () => {
  test('can navigate between all tabs', async ({ page }) => {
    // Start on Soda Lake (home)
    await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Standley Lake
    await page.getByRole('tab', { name: /Standley Lake/ }).click({ force: true });
    await expect(page.getByText('Standley Lake Wind Monitor')).toBeVisible({ timeout: 10000 });

    // Navigate to Settings
    await page.getByRole('tab', { name: /Settings/ }).click({ force: true });
    await expect(page.getByText('Configure your app preferences')).toBeVisible({ timeout: 10000 });

    // Navigate back to Soda Lake
    await page.getByRole('tab', { name: /Soda Lake/ }).click({ force: true });
    await expect(page.getByText('Ecowitt monitor located at the head of the lake')).toBeVisible({ timeout: 10000 });
  });
});
