import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.goto('/');
    // Wait for the app to finish loading (splash screen shows "Loading...")
    await expect(page.getByText('Loading...')).toBeHidden({ timeout: 15000 });
    // Dismiss Expo dev mode error overlay if present (deprecated style warnings etc.)
    const dismissButton = page.locator('#error-overlay button, #error-overlay [role="button"]').first();
    if (await dismissButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissButton.click();
    }
    await use(page);
  },
});

export { expect };
