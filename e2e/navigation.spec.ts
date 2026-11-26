import { test, expect } from './fixtures';

test.describe('Tab Navigation', () => {
  test('can navigate between all tabs', async ({ page }) => {
    // Start on Soda Lake (home)
    await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Standley Lake
    await page.getByRole('tab', { name: /Standley Lake/ }).click({ force: true });
    await expect(page.getByText('Standley Lake Wind Monitor')).toBeVisible({ timeout: 10000 });

    // Navigate to Boulder Reservoir
    await page.getByRole('tab', { name: /Boulder/ }).click({ force: true });
    await expect(page.getByText('Boulder Reservoir Wind Monitor')).toBeVisible({ timeout: 10000 });

    // Navigate to Settings
    await page.getByRole('tab', { name: /Settings/ }).click({ force: true });
    await expect(page.getByText('Configure your app preferences')).toBeVisible({ timeout: 10000 });

    // Navigate back to Soda Lake
    await page.getByRole('tab', { name: /Soda Lake/ }).click({ force: true });
    await expect(page.getByText('Ecowitt monitor located at the head of the lake')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('App startup', () => {
  // Requests `context` instead of `page` so the shared fixture doesn't load the
  // app before the font request is blocked.
  test('renders even when the custom font fails to load', async ({ context }) => {
    test.setTimeout(60000);
    await context.route((url) => url.href.includes('SpaceMono'), (route) => route.abort());
    const page = await context.newPage();
    await page.goto('/');
    // expo-font gives up on web after 12s; the app must fall back to the system font.
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 30000 });
    await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });
  });
});
