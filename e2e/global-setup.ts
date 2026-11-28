import { chromium, webkit, type FullConfig } from '@playwright/test';

// Metro compiles the web bundles on the first request, which takes 30s+ on a
// cold CI runner. Loading the app once here keeps that out of the first test's
// timeout. Any browser compiles the same bundle, so fall back to WebKit when
// Chrome isn't installed (e.g. running only the `ios` project).
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? 'http://localhost:8081';
  const browser = await chromium.launch({ channel: 'chrome' }).catch(() => webkit.launch());
  try {
    const page = await browser.newPage();
    await page.goto(baseURL, { timeout: 180000 });
    await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 180000 });
  } finally {
    await browser.close();
  }
}
