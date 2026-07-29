---
name: dp-e2e-testing
description: >
  Write, run, and maintain Playwright e2e tests for the dp-soda (Dawn Patrol) Expo React Native web app.
  Use this skill whenever the user asks about e2e tests, integration tests, Playwright tests, browser testing,
  smoke tests, or wants to verify that the web app works end-to-end. Also trigger when the user says things like
  "test that page", "verify the UI", "check if the app loads", "add a test for the new feature",
  "run the e2e tests", "the e2e test is failing", or mentions testing any tab or screen in the app.
  This skill knows the app's tab structure, existing test patterns, Expo-specific gotchas, and how to
  write tests that actually pass on the first try.
---

# dp-soda Playwright E2E Testing

You are writing and maintaining Playwright e2e tests for the **Dawn Patrol (dp-soda)** app — an Expo React Native app that monitors wind conditions at Colorado lakes for kiteboarding.

## Quick Reference

- **Test directory**: `e2e/`
- **Config**: `playwright.config.ts`
- **Shared fixture**: `e2e/fixtures.ts`
- **Run tests**: `npm run test:e2e` (headless) or `npm run test:e2e:headed` (visible browser)
- **Dev server**: Must be running on `http://localhost:8081` before tests run (do NOT start it yourself — the user always has it running)
- **Browser**: System Chrome via `channel: 'chrome'` (not Playwright's bundled Chromium)

## App Structure

The app has 4 tabs defined in `app/(tabs)/`:

| Tab | Route | Component | Key Content |
|-----|-------|-----------|-------------|
| **Soda Lake** | `/` (home) | `index.tsx` | Wind station data, current conditions, chart, external Ecowitt link |
| **Standley Lake** | `/standley-lake` | `standley-lake.tsx` | Wind station data, current conditions, chart (no external link) |
| **Wind Guru** | `/wind-guru` | `wind-guru.tsx` | Disabled by default (feature toggle). When enabled: predictions, timeline, collapsible sections |
| **Settings** | `/settings` | `settings.tsx` | Threshold slider, Wind Guru toggle (Switch), app info/version |

There's also a `+not-found.tsx` for unknown routes.

Both wind station tabs use the shared `WindStationTab` component which renders:
- Header image with title/subtitle
- Current Conditions card (Wind Speed, Direction, Humidity, Last Updated)
- Wind chart ("Today's Wind Speed")
- Recent Wind Analysis section
- External data link (Soda Lake only)
- Transmission quality indicators (Soda Lake only)

## Writing Tests — Patterns That Work

### Always import from the shared fixture

```typescript
import { test, expect } from './fixtures';
```

The fixture navigates to `/`, waits for the loading screen to clear, and dismisses the Expo dev mode error overlay. Every test gets a clean loaded app state.

### Expo Dev Mode Error Overlay

Expo's development mode renders an `#error-overlay` div that intercepts pointer events (triggered by deprecation warnings like "shadow* style props are deprecated"). The fixture handles dismissing it on initial load, but it can reappear after navigation.

**Always use `{ force: true }` when clicking interactive elements** — especially tabs, toggles, and buttons. This bypasses the overlay interception:

```typescript
// Good — works even with error overlay
await page.getByRole('tab', { name: /Settings/ }).click({ force: true });
await toggle.click({ force: true });

// Bad — will timeout if overlay is present
await page.getByRole('tab', { name: /Settings/ }).click();
```

### Strict Mode Violations (Duplicate Text)

React Native Web renders tab bar labels AND page content, so text like "Soda Lake" or "Settings" appears in both places. Playwright's strict mode throws an error when `getByText()` matches multiple elements.

**Fix with `.first()` for page-level headings that also appear in the tab bar:**

```typescript
// Good — matches the page heading, not the tab label
await expect(page.getByText('Soda Lake').first()).toBeVisible();
await expect(page.getByText('Settings').first()).toBeVisible();

// Good — unique text doesn't need .first()
await expect(page.getByText('Configure your app preferences')).toBeVisible();

// Good — use the full unique title
await expect(page.getByText('Standley Lake Wind Monitor')).toBeVisible();
```

### Timeouts for Live API Data

Tests run against the live Ecowitt API. Wind data takes time to load. Use generous timeouts:

```typescript
// Page titles load quickly
await expect(page.getByText('Soda Lake').first()).toBeVisible({ timeout: 10000 });

// API data needs more time
await expect(page.getByText(/mph/i)).toBeVisible({ timeout: 30000 });

// Charts need data to render
await expect(page.getByText("Today's Wind Speed")).toBeVisible({ timeout: 30000 });
```

### Test Isolation with Shared State

The Wind Guru feature toggle persists in-memory across the browser context. Tests that toggle this setting can interfere with each other.

**The config uses `workers: 1` (serial execution) for this reason.** If you need to modify settings in a test:

```typescript
test.describe('Wind Guru Tab (enabled)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    const toggle = page.locator('input[role="switch"]').first();
    await toggle.click({ force: true });
    await expect(page.getByText('Experimental Feature').first()).toBeVisible({ timeout: 5000 });
  });

  test.afterEach(async ({ page }) => {
    // Always restore default state
    await page.goto('/settings');
    const toggle = page.locator('input[role="switch"]').first();
    await toggle.click({ force: true });
  });
});
```

For tests that might run after other toggle-modifying tests, check the current state first:

```typescript
const warningText = page.getByText('Wind Guru features are under development');
if (await warningText.isVisible({ timeout: 1000 }).catch(() => false)) {
  await toggle.click({ force: true }); // disable first
  await page.waitForTimeout(500);
}
```

### React Native Switch on Web

The Switch component renders as `<input role="switch" type="checkbox">`. Always use:

```typescript
const toggle = page.locator('input[role="switch"]').first();
await toggle.click({ force: true });
```

### Tab Navigation

Tabs render as `<a role="tab">` elements. Navigate between them using:

```typescript
await page.getByRole('tab', { name: /Standley Lake/ }).click({ force: true });
```

### Direct URL Navigation

For tests that don't start on the home tab, navigate directly:

```typescript
await page.goto('/settings');
await page.goto('/standley-lake');
await page.goto('/wind-guru');
```

## Existing Test Coverage

Review the existing test files before adding new ones to avoid duplication:

- `e2e/soda-lake.spec.ts` — Station name, wind data, current conditions, chart, external link, subtitle
- `e2e/standley-lake.spec.ts` — Station name, wind data, subtitle, current conditions, no external link
- `e2e/settings.spec.ts` — Title, threshold section, preferences, app features, app info, toggle interaction
- `e2e/wind-guru.spec.ts` — Disabled state (message, instructions, warning), enabled state (full page, migration notice, timeline, footer, collapsible expand/collapse)
- `e2e/navigation.spec.ts` — Tab-to-tab navigation flow
- `e2e/not-found.spec.ts` — 404 page, error message, link-back-to-home

## Adding New Tests

When adding tests for new features:

1. Determine which tab/route the feature lives on
2. Check the existing spec file for that tab — add to it rather than creating a new file
3. Use the patterns above (fixture import, `.first()`, `force: true`, appropriate timeouts)
4. If the feature involves a setting toggle, handle state isolation
5. Run `npm run test:e2e` to verify, then `npm run lint` to ensure no issues
6. Add any new spec files to the test summary above

## Running Tests

```bash
# Headless (default)
npm run test:e2e

# With visible browser (debugging)
npm run test:e2e:headed

# Single file
npx playwright test e2e/settings.spec.ts

# Single test by name
npx playwright test --grep "toggle"

# View last HTML report
npx playwright show-report
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| All tests fail with "connection refused" | Dev server not running | Start `expo start --web --port 8081` |
| "Executable doesn't exist" | Browser binary missing | Use `channel: 'chrome'` in config (system Chrome) |
| "strict mode violation" | Text matches multiple DOM elements | Use `.first()` or more specific text |
| Click timeout with overlay intercept | Expo error overlay blocking | Use `{ force: true }` on click |
| Flaky toggle tests | Shared in-memory state between tests | Use `workers: 1`, add state checks in beforeEach |
| "Process from webServer exited early" | Bad webServer config | Remove webServer block entirely (server runs independently) |
