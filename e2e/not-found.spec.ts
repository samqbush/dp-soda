import { test, expect } from './fixtures';

test.describe('Not Found Page', () => {
  test('shows error message for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText('This screen does not exist.')).toBeVisible({ timeout: 10000 });
  });

  test('shows link to go home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByText('Go to home screen!')).toBeVisible({ timeout: 10000 });
  });

  test('link navigates back to home', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await page.getByText('Go to home screen!').click();
    await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });
  });
});
