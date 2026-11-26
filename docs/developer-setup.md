# Developer Setup

Complete setup guide for developers working on the Colorado Lakes Wind Monitor project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Key Technologies](#key-technologies)
6. [Development Guidelines](#development-guidelines)
7. [Build & Deployment](#build-process--deployment)
8. [Ecowitt Sensors](#ecowitt-sensor-troubleshooting)

## Prerequisites

### Required Tools

- **Node.js** (v20 or higher)
- **npm** (comes with Node.js)
- **Expo CLI** (installed via npm)
- **Git** for version control
- **JDK 17** for Android builds (`JAVA_HOME=/opt/homebrew/opt/openjdk@17`)

### Mobile Development

**For iOS Development:**
- macOS with Xcode installed
- iOS Simulator or physical iOS device

**For Android Development:**
- Android Studio with Android SDK
- Android Emulator or physical Android device
- USB debugging enabled for physical devices
- `ANDROID_HOME` and `ANDROID_SDK_ROOT` environment variables set

### API Accounts

- **Ecowitt**: API credentials for Standley Lake and Soda Lake monitoring (required)
- **OpenWeatherMap**: API key for weather forecasts (required)

## Environment Setup

### 1. Clone and Install

```bash
git clone https://github.com/samqbush/dp-soda.git
cd dp-soda
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your API credentials:

```bash
ECOWITT_APPLICATION_KEY=your_application_key_here
ECOWITT_API_KEY=your_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

**Note**: The app requires valid API keys. Without them, data will not load and errors will be displayed.

### 3. Verify Setup

```bash
npm start
```

## Development Workflow

### Daily Development

1. **Start the development server**
   ```bash
   npm start
   ```

2. **Choose your development platform**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Press `w` for web browser
   - Scan QR code with Expo Go on a physical device

3. **Live reload** — changes automatically refresh the app

### Running on Android

```bash
# Run on connected emulator/device
npm run android

# If you get Java Runtime errors in VS Code tasks, run directly in terminal:
npx expo run:android
```

**Common Android Issues:**
- **"Unable to locate a Java Runtime"** → Ensure `JAVA_HOME` points to JDK 17
- **Emulator not detected** → Verify `ANDROID_HOME` is set and emulator is running
- **ADB not found** → Add `$ANDROID_HOME/platform-tools` to PATH

### Running on iOS

```bash
npm run ios
```

### Code Quality

```bash
# Lint (ESLint + TypeScript + YAML workflow validation)
npm run lint

# Type checking only
npx tsc --noEmit
```

### Testing

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run a specific test file
npm test -- __tests__/services/windAnalysis.test.ts
```

#### End-to-End Tests (Playwright)

The dev server starts automatically when you run any E2E command. If one is already running, it will be reused. Before any test runs, `e2e/global-setup.ts` loads the app once so Metro compiles its web bundles up front; on a cold CI runner that takes 30s+ and would otherwise time out the first test.

All E2E projects test the **web build** in a browser — the "ios" and "android" projects use mobile viewport emulation (iPhone 14, Pixel 7), not native apps.

```bash
# Primary command — run this before pushing UI changes
npm run test:e2e              # All viewports (desktop, iPhone 14, Pixel 7), headless
```

Optional commands for targeted runs or debugging:

```bash
npm run test:e2e:web          # Desktop Chrome viewport only (fastest, good for quick checks)
npm run test:e2e:ios          # iPhone 14 viewport only
npm run test:e2e:android      # Pixel 7 viewport only
npm run test:e2e:headed       # All viewports with a visible browser (for debugging failures)
```

## Project Structure

```
dp-soda/
├── app/                       # Screens (Expo Router file-based routing)
│   ├── _layout.tsx            # Root layout and navigation
│   ├── +not-found.tsx         # 404 screen
│   └── (tabs)/                # Tab navigation
│       ├── _layout.tsx        # Tab bar configuration
│       ├── index.tsx          # Home/Soda Lake tab
│       ├── standley-lake.tsx  # Standley Lake wind tab
│       ├── boulder-res.tsx    # Boulder Reservoir wind tab
│       └── settings.tsx       # Settings tab
├── components/                # Reusable UI components
│   ├── ui/                    # Generic UI primitives
│   ├── CustomWindChart.tsx    # SVG wind chart with scrolling
│   ├── WindStationTab.tsx     # Shared wind station display
│   ├── DayPredictionCard.tsx  # Wind prediction card
│   ├── WeeklyForecast.tsx     # 7-day forecast display
│   ├── ThresholdSlider.tsx    # Wind threshold config
│   ├── ErrorBoundary.tsx      # Crash recovery wrapper
│   └── ...                    # Other shared components
├── hooks/                     # Custom React hooks
│   ├── useStationWind.ts      # Base wind data hook
│   ├── useStandleyLakeWind.ts # Standley Lake data
│   ├── useSodaLakeWind.ts     # Soda Lake data
│   ├── useBoulderResWind.ts   # Boulder Reservoir data
│   ├── useWindThreshold.ts    # Threshold settings
│   └── useColorScheme.ts      # Theme detection
├── services/                  # Business logic and APIs
│   ├── ecowittService.ts      # Ecowitt API integration
│   ├── windService.ts         # Wind data processing
│   ├── windThresholdService.ts # Threshold persistence
│   ├── sunriseService.ts      # Sunrise/sunset times
│   ├── storageService.ts      # AsyncStorage wrapper
│   ├── appLogger.ts           # Logging utility
│   └── fallbackData.ts        # Fallback data for errors
├── config/                    # Configuration
│   └── ecowittConfig.ts       # Station device configs
├── scripts/                   # Dev/debug scripts
│   ├── debug-dp-stations.mjs  # Station data debugging
│   ├── debug-ecowitt-devices.mjs # Device connectivity
│   ├── verify-noaa-data.mjs   # NOAA data quality check
│   └── increment-version.mjs  # Version bump utility
├── __tests__/                 # Test files (mirrors src structure)
├── assets/                    # Static assets (images, fonts, sounds)
├── docs/                      # Documentation
└── .github/workflows/         # CI/CD pipeline
```

## Key Technologies

### Core Framework
- **Expo SDK 55** — React Native framework (managed workflow)
- **React Native 0.83** — Cross-platform mobile
- **React 19** — UI library
- **TypeScript 5.9** — Type safety
- **Expo Router** — File-based navigation

### UI/UX
- **React Navigation v7** — Navigation library
- **React Native SVG** — Chart rendering
- **Expo Vector Icons** — Icon library
- **Light/Dark mode** — System theme support

### APIs & Data
- **Ecowitt API** — Wind station data (Standley Lake, Soda Lake)
- **OpenWeatherMap API** — Weather forecasts
- **AsyncStorage** — Local data persistence

### Development & Testing
- **ESLint** — Linting (with expo config)
- **Jest 29** — Unit testing
- **Playwright** — End-to-end testing
- **Husky** — Git hooks (pre-commit)

## Development Guidelines

### Code Style

1. **Follow TypeScript best practices**
   - Use proper type annotations
   - Avoid `any` types when possible
   - Define interfaces for complex objects

2. **Component Structure**
   ```typescript
   interface ComponentProps {
     // Define props with types
   }
   
   export function ComponentName({ prop1, prop2 }: ComponentProps) {
     // Hooks at the top
     const [state, setState] = useState();
     
     // Event handlers
     const handleAction = () => {};
     
     // Render
     return (
       // JSX here
     );
   }
   ```

3. **File Organization**
   - One component per file
   - Use descriptive file names
   - Group related files in directories

### API Integration

1. **Use service abstractions** — never make API calls directly in components
   ```typescript
   import { ecowittService } from '@/services/ecowittService';
   ```

2. **Handle errors gracefully** — display user-friendly error messages, never mock data

3. **Implement proper loading states**
   ```typescript
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

### Before Creating a PR

| Step | Command | When it runs |
|------|---------|--------------|
| Lint & type-check | `npm run lint` | ✅ Automatic on every commit (Husky pre-commit hook) and on every PR |
| Version validation | `npm run test-version` | ✅ Automatic on every commit (Husky pre-commit hook) and on release PRs into `main` |
| Unit tests | `npm test` | Run manually — CI will catch failures, but faster to verify locally |
| E2E tests | `npm run test:e2e` | Run manually — recommended for UI changes |

Both hook steps are **skipped automatically for documentation-only commits** — see below.

### Committing Documentation Changes

Documentation-only changes bypass both the pre-commit hook and the entire CI
pipeline. Without this, every typo fix would run a full TypeScript type-check
locally and a macOS + Android build in CI — and `npm run test-version` would
*fail*, because docs changes have no version bump to validate.

**Paths treated as documentation:**

- `README.md`
- `CHANGELOG.md`
- `LICENSE`
- `.github/copilot-instructions.md`
- Any `.md` file under `docs/` (including nested)
- Any `.md` file under `.github/skills/` (including nested)

Anything else — including **non-markdown** files under `docs/` or
`.github/skills/` — is treated as a code change.

**Locally**, `.husky/pre-commit` inspects the staged file list. If *every*
staged path is on the list above, it prints
`📝 Documentation-only change — skipping lint and version checks` and exits
immediately. Otherwise the full checks run.

**In CI**, `.github/workflows/build-and-release.yml` uses `paths-ignore` on its
`push` and `pull_request` triggers, so a docs-only change starts no jobs at all.
This means **a documentation-only merge to `main` does not cut a release** —
which is intended, since the app version is unchanged.

Important details:

- **Mixed commits always run the full checks.** If a commit touches both docs
  and code, nothing is skipped. Split the commit if you want the fast path.
- **Staged deletions and renames count as code.** Deleting a `.ts` file or
  renaming code into `docs/` will correctly run the full checks.
- **`git commit --amend` usually does not skip.** The hook compares the index
  against `HEAD`, not against the amended commit's parent, so an amend that
  stages only docs on top of a code commit still sees only the docs. Prefer a
  fresh commit, or accept the full checks.
- **Paths containing newlines are not supported** and fall through to the full
  checks.
- To override deliberately, use `git commit --no-verify`. There is no
  environment-variable bypass, and the version check also runs on release pull
  requests into `main`, so `--no-verify` defers the check rather than skipping it.

When adding a new documentation path, update **both** the `case` patterns in
`.husky/pre-commit` and the `paths-ignore` lists in
`.github/workflows/build-and-release.yml`. The two use different glob dialects:
POSIX `case` treats `*` as matching `/`, while GitHub Actions needs an explicit
`**` entry for nested paths.

### What CI Runs on Your PR

CI is split so feature work gets fast feedback and releases get the slow,
thorough checks:

| Check | Feature PR → `dev` (~3 min) | Release PR `dev` → `main` (~45 min) |
|-------|:---:|:---:|
| `npm run lint` — ESLint + TypeScript + YAML workflow validation | ✅ | ✅ |
| `npm run test:coverage` — unit tests with coverage | ✅ | ✅ |
| `npm run check:release-notes` — store note length limits | ✅ | ✅ |
| Playwright web e2e tests against the live APIs | ✅ | ✅ |
| `npm run test-version` — version incremented relative to `main` | — | ✅ |
| Signed iOS and Android builds | — | ✅ |
| Android smoke test on an emulator, including an upgrade from the previous release | — | ✅ |
| iOS smoke test on a Simulator | — | ✅ |

Documentation-only PRs skip this workflow entirely.

The version check runs on **release PRs only**. On a push to `main`, `origin/main`
is the commit being built, so the script would compare the version against
itself and always fail; feature PRs into `dev` don't bump the version.

#### Native smoke tests (Maestro)

The `android-smoke` and `ios-smoke` jobs run the [Maestro](https://maestro.dev)
flows in `.maestro/` against the real Release builds:

- `smoke.yaml` — launch, wait for live data, open every station tab, and check
  the version in Settings. Asserts only static text, since wind values change.
- `upgrade-before.yaml` / `upgrade-after.yaml` (Android only) — install the
  previous GitHub release's APK, raise the wind threshold to 35 mph, install
  the new APK over it (same signing key, like a Play Store update), and confirm
  the setting survived. `android-smoke.sh` drags the slider with `adb` because
  older releases have no `testID` on it. The previous release is the newest release, drafts included, whose
  tag isn't the current version.

The iOS job builds an unsigned Release `.app` for the Simulator separately,
because the App Store-signed IPA can't run there. Screenshots and logs are
uploaded as the `android-smoke-results` and `ios-smoke-results` artifacts.

After `smoke.yaml`, the Android job records the app's foreground memory
(`RssAnon` + `VmSwap` from `/proc/<pid>/status`, the same "Anon RSS + Swap"
metric as Play's memory vital) in the job summary and in `memory.txt` in the
artifact. It is informational and never fails the job. Play's bad-behavior
threshold for apps is 2 GB in the foreground on 4 GB devices, from February 2027
([technical quality requirements](https://support.google.com/googleplay/android-developer/answer/17492799)).
Play Console's Android vitals stay blank until enough opted-in users install
from Play, so this is the only memory reading for the closed-test app.

Flows tap tabs by `testID` (`tab-soda-lake`, `tab-standley-lake`,
`tab-boulder-res`, `tab-settings`, set in
`app/(tabs)/_layout.tsx`). When adding a station tab, give it a `testID` and add
a step to `smoke.yaml`. To run a flow locally against an emulator or simulator
with the app installed: `maestro test -e APP_VERSION=<version> .maestro/smoke.yaml`.

### Git Workflow

1. **Create branches from `dev`** named `<type>/<kebab-description>`:
   - `feature/` — new functionality (e.g. `feature/rename-colorado-lakes-wind-monitor`)
   - `fix/` — bug fixes
   - `chore/` — tooling, CI, refactors with no user-facing change
   - `docs/` — documentation only
   - `upgrade/` — dependency or SDK upgrades (e.g. `upgrade/expo-sdk-55`)
2. **Make small, focused commits** using [Conventional Commits](https://www.conventionalcommits.org/): `type(optional-scope): summary` — e.g. `feat: …`, `fix(ecowitt): …`, `ci: …`, `docs: …`, `chore: …`
3. **Run linting** before committing: `npm run lint` (enforced by Husky pre-commit hook, skipped for documentation-only commits)
4. **Open pull requests into `dev`** for code review
5. **Merge after review** and CI checks pass
6. **Release**: open a `dev` → `main` PR (bump the version first); the production build triggers automatically on merge to `main`

---

## Build Process & Deployment

**All production builds run via GitHub Actions** (`.github/workflows/build-and-release.yml`):
- ✅ No local build setup required for releases
- ✅ Consistent build environment (macOS for iOS, Ubuntu for Android)
- ✅ Integrated linting, testing, and code signing
- ✅ Artifacts published to GitHub Releases

**Version increments are manual.** CI only *reads* `expo.version` out of
`app.config.js`; nothing bumps it for you. Increment it before opening a release
PR:

```bash
node scripts/increment-version.mjs patch   # or minor / major
```

This keeps `expo.version`, `expo.ios.buildNumber` and `expo.android.versionCode`
in sync, which `npm run test-version` enforces on release PRs into `main`.

### Build Triggers

- Pull request into `dev` — lint and tests only
- Pull request into `main` — full pipeline including native builds and smoke
  tests (no release)
- Push to `main` branch (automatic) — **except** documentation-only pushes, which
  are filtered out by `paths-ignore`
- Manual trigger via GitHub Actions "Run workflow" button (always runs, even for
  docs-only changes)

Each native run takes about 45 minutes, so avoid redundant ones:

- While a `dev` → `main` release PR is open, every merge into `dev` re-runs the
  full native pipeline on it, even docs-only merges, because `pull_request` path
  filters check the PR's whole diff
  ([docs](https://docs.github.com/en/enterprise-cloud@latest/actions/reference/workflows-and-actions/workflow-syntax#git-diff-comparisons)).
  Batch changes into fewer merges, and don't start manual runs; the release PR's
  checks cover them.
- A new push to a PR cancels that PR's in-progress run (`concurrency` in the
  workflow). Pushes to `main` and manual runs each get their own group, so they
  are never cancelled or queued behind another run.
- Use a manual run only when no release PR is open and the change touches
  native config, `.maestro/`, `.github/scripts/` or the workflow itself.

### Build Pipeline

1. **Lint & Test** (Ubuntu) — ESLint, TypeScript, Jest with coverage, plus the
   version-increment check on release pull requests
2. **iOS Build** (macOS) — Expo prebuild → Xcode archive → signed IPA
3. **Android Build** (Ubuntu) — Expo prebuild → Gradle → signed AAB + APK.
   Release builds run R8 with code optimization, obfuscation and resource
   shrinking. The `expo-build-properties` plugin in `app.config.js` turns on
   minification and resource shrinking, and `plugins/withR8Optimization.js`
   switches the release ProGuard defaults from `proguard-android.txt` (which
   contains `-dontoptimize`) to `proguard-android-optimize.txt`. Google Play
   requires at least 25% optimization, obfuscation and shrinking for apps with
   more than 10 MB of DEX code from February 2027; without R8 this app ships
   about 36 MB. Check the three percentages for each upload in Play Console's
   app bundle explorer. If a release build crashes on a missing class, add a
   keep rule through the `expo-build-properties` `android.extraProguardRules` option.
4. **Native smoke tests** (release PRs and manual runs) — Maestro on an Android
   emulator and an iOS Simulator; see [Native smoke tests](#native-smoke-tests-maestro)
5. **Release** — Creates a **draft** GitHub Release tagged `v<version>` with all
   artifacts attached

Native builds install dependencies with `npm ci` and build exactly what is in
`package-lock.json`. To move to Expo's newer recommended versions, run
`npx expo install --fix` locally on an `upgrade/` branch and commit the updated
`package.json`/`package-lock.json`. (CI no longer runs `--fix`, because it made
builds non-reproducible and broke them whenever Expo published conflicting patches.)

Upgrade notes:
- `react-native-reanimated` and `react-native-worklets` are deliberately newer
  than the SDK 55 pins and are listed in `expo.install.exclude` in `package.json`,
  so `--fix` leaves them alone.
- If `--fix` fails with `ERESOLVE` on an exact-pinned peer (for example
  `@expo/log-box`), the lockfile is holding an old transitive version. Delete
  only the conflicting `node_modules/...` entries from `package-lock.json` and
  rerun `npm install`. Then run `npm test`: re-resolving can un-hoist packages
  that tooling loads by bare name (`babel-preset-expo` is a direct devDependency
  for this reason, because `jest.config.js` loads it).
- If you install through a private npm mirror, rewrite the `resolved` URLs in
  `package-lock.json` back to `https://registry.npmjs.org/` before committing.
  CI installs from public npm.

The `create-release` job is gated on `if: github.event_name == 'push'`, so it
runs **only when something lands on `main`**. A manual "Run workflow" instead
runs `upload-artifacts`, which bundles the IPA/AAB/APK as a workflow artifact
and creates no tag or release. The draft release is never published
automatically — review it, then publish and upload to the stores by hand.

### GitHub Repository Secrets

Required secrets for the build process:

**Android Signing**:
```
ANDROID_KEYSTORE_BASE64    # Base64 encoded keystore file
ANDROID_KEY_ALIAS          # Key alias for signing
ANDROID_KEY_PASSWORD       # Key password
ANDROID_KEYSTORE_PASSWORD  # Keystore password
```

**Expo**:
```
EXPO_TOKEN                 # Expo authentication token for CI builds
```

**iOS Signing** (Team ID: FAF3YHR4P4):
```
IOS_DIST_CERTIFICATE_P12_BASE64       # Base64 encoded .p12 distribution certificate
IOS_DIST_CERTIFICATE_PASSWORD         # Password for the .p12 file
IOS_DIST_PROVISIONING_PROFILE_BASE64  # Base64 encoded .mobileprovision file
IOS_DIST_CODE_SIGN_IDENTITY           # e.g. "Apple Distribution: Samuel James (FAF3YHR4P4)"
```

**API Keys**:
```
OPENWEATHER_API_KEY        # OpenWeatherMap API key
ECOWITT_APPLICATION_KEY    # Ecowitt app key
ECOWITT_API_KEY           # Ecowitt API key
```

**Setting Up Secrets via `gh` CLI**:
```bash
gh secret set SECRET_NAME --repo samqbush/dp-soda < secret_file.txt
# or inline:
gh secret set SECRET_NAME --repo samqbush/dp-soda --body "value"
```

### iOS Distribution Certificate Renewal

The iOS Distribution Certificate expires annually. Apple sends an email 30 days before expiry. Follow these steps to renew.

**Prerequisites**:
- Apple Developer account access (Team ID: FAF3YHR4P4)
- Keychain Access app (macOS)
- `gh` CLI authenticated (`gh auth status`)

**Step 1: Generate a new certificate in Apple Developer Portal**

1. Sign in at https://developer.apple.com/account/resources/certificates/list
2. Click the **+** button to create a new certificate
3. Select **Apple Distribution** and click Continue
4. Upload a Certificate Signing Request (CSR):
   - Open **Keychain Access** → Certificate Assistant → Request a Certificate From a Certificate Authority
   - Enter your email, select "Saved to disk", click Continue
   - Upload the generated `.certSigningRequest` file
5. Download the generated `.cer` file

**Step 2: Export as .p12 from Keychain Access**

1. Double-click the downloaded `.cer` file to install it in Keychain Access
2. In Keychain Access, find the certificate under "My Certificates"
3. Right-click → Export → choose `.p12` format
4. Set a strong password (you'll need this for the secret)
5. Save as `distribution.p12`

**Step 3: Regenerate the Provisioning Profile**

1. Go to https://developer.apple.com/account/resources/profiles/list
2. Find your App Store distribution profile (or create a new one)
3. Edit it and select the **new** distribution certificate
4. Download the `.mobileprovision` file

**Step 4: Get the Code Sign Identity name**

```bash
security find-identity -v -p codesigning | grep "Apple Distribution"
```

Output will look like:
```
1) ABC123... "Apple Distribution: Samuel James (FAF3YHR4P4)"
```

**Step 5: Update GitHub secrets with `gh` CLI**

```bash
# Base64 encode the certificate and provisioning profile
base64 -i distribution.p12 > cert_b64.txt
base64 -i profile.mobileprovision > profile_b64.txt

# Update all iOS signing secrets
gh secret set IOS_DIST_CERTIFICATE_P12_BASE64 --repo samqbush/dp-soda < cert_b64.txt
gh secret set IOS_DIST_CERTIFICATE_PASSWORD --repo samqbush/dp-soda --body "your-p12-password"
gh secret set IOS_DIST_PROVISIONING_PROFILE_BASE64 --repo samqbush/dp-soda < profile_b64.txt
gh secret set IOS_DIST_CODE_SIGN_IDENTITY --repo samqbush/dp-soda --body "Apple Distribution: Samuel James (FAF3YHR4P4)"

# Clean up sensitive files
rm -f distribution.p12 cert_b64.txt profile_b64.txt profile.mobileprovision
```

**Step 6: Verify the new certificate works**

```bash
gh workflow run "Build Colorado Lakes Wind Monitor - Combined Release" --repo samqbush/dp-soda
gh run watch --repo samqbush/dp-soda
```

**Notes**:
- The old certificate can be revoked after confirming the new build succeeds
- Provisioning profiles are tied to a specific certificate — always regenerate after cert renewal
- The code sign identity string rarely changes unless you change your developer account name

### Release & Distribution

1. Push to `main` or manually trigger the workflow
2. Monitor at: `https://github.com/samqbush/dp-soda/actions`
3. On success, artifacts are attached to a GitHub Release

**Android**: APK + AAB available for upload Android Play store

**iOS**: IPA available for manual upload to App Store Connect / TestFlight

### App Naming

- **Public name**: "Colorado Lakes Wind Monitor" (formerly "Dawn Patrol Alarm"). Used in-app, in docs, release titles, and as the store listing name. Store listing names are set manually in App Store Connect and Play Console, not by the build.
- **Home-screen label**: `expo.name` in `app.config.js` is "CO Lakes Wind" because iOS truncates icon labels at ~12 characters. Expo prebuild also derives the Xcode workspace/scheme from it (`COLakesWind`); the iOS build job reads the scheme from the generated workspace, so no workflow change is needed if it changes again.
- **Do not change** `bundleIdentifier`/`package` (`com.samqbush.dpsoda`), `slug` (`dp-soda`), or `scheme` (`dpsoda`). Changing them creates a new store app or unlinks the EAS project.

### Manual Release
#### Android
- https://play.google.com/console/u/0/developers & select app
- Test and release > Testing > Closed testing > manage track > Create new release

#### iOS
- https://appstoreconnect.apple.com/apps & select app
- TestFlight > update App Encyryption Documentation
- Click + under iOS & add package for submission when ready for publishing

---

## Ecowitt Sensor Troubleshooting

The app uses real weather data from Ecowitt weather stations at Standley Lake and Soda Lake.

### Station Status

**Standley Lake (GW2000B_V3.2.5)**:
- ✅ Excellent reliability: ~100% data coverage
- 📍 Location: 39.870467, -105.151622

**Soda Lake (GW3000B_V1.0.6)**:
- ⚠️ Intermittent wind data (~52% coverage due to RF issues)
- 📍 Location: 39.646115, -105.174958

### Debug Scripts

```bash
npm run debug-stations       # Station data and wind readings
npm run debug-devices        # Device connectivity and sensor status
npm run verify-noaa          # NOAA data quality check
```

### Common Issues

- **Missing wind data gaps** → Normal for Ecowitt API; the app handles gaps gracefully with line breaks in charts
- **Indoor temperature on Soda Lake** → Expected behavior for GW3000B console units (measures where installed)
- **Battery warning** → Sensor arrays need replacement below 2.4V
