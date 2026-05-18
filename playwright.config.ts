import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'web',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'ios',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'android',
      use: { ...devices['Pixel 7'], channel: 'chrome' },
    },
  ],
});
