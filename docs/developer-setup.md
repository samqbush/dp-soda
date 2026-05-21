# Developer Setup

Complete setup guide for developers working on the Dawn Patrol Alarm project.

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
cd dp-react
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
# Run unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:wind
npm run test:data
npm run test:utils

# End-to-end tests (Playwright)
npm run test:e2e
npm run test:e2e:web
npm run test:e2e:headed
```

## Project Structure

```
dp-react/
├── app/                       # Screens (Expo Router file-based routing)
│   ├── _layout.tsx            # Root layout and navigation
│   ├── +not-found.tsx         # 404 screen
│   └── (tabs)/                # Tab navigation
│       ├── _layout.tsx        # Tab bar configuration
│       ├── index.tsx          # Home/Soda Lake tab
│       ├── standley-lake.tsx  # Standley Lake wind tab
│       ├── boulder-res.tsx    # Boulder Reservoir wind tab
│       ├── wind-guru.tsx      # Wind Guru predictions tab
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

### Git Workflow

1. **Create feature branches** from `main`
2. **Make small, focused commits** with clear messages
3. **Run linting** before committing: `npm run lint` (enforced by Husky pre-commit hook)
4. **Create pull requests** for code review
5. **Merge after review** and CI checks pass
6. **Production build** triggers automatically on merge to main

---

## Build Process & Deployment

**All production builds run via GitHub Actions** (`.github/workflows/build-and-release.yml`):
- ✅ No local build setup required for releases
- ✅ Consistent build environment (macOS for iOS, Ubuntu for Android)
- ✅ Integrated linting, testing, and code signing
- ✅ Automatic version increment
- ✅ Artifacts published to GitHub Releases

### Build Triggers

- Push to `main` branch (automatic)
- Manual trigger via GitHub Actions "Run workflow" button

### Build Pipeline

1. **Lint & Test** (Ubuntu) — ESLint, TypeScript, Jest with coverage
2. **iOS Build** (macOS) — Expo prebuild → Xcode archive → signed IPA
3. **Android Build** (Ubuntu) — Expo prebuild → Gradle → signed AAB + APK
4. **Release** — Creates GitHub Release with all artifacts

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
gh workflow run "Build Dawn Patrol Alarm - Combined Release" --repo samqbush/dp-soda
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

**Android**: APK + AAB available as GitHub Release assets
**iOS**: IPA available for manual upload to App Store Connect / TestFlight

### Build Troubleshooting

| Error | Solution |
|-------|----------|
| Invalid keystore | Verify `ANDROID_KEYSTORE_BASE64` encoding |
| iOS signing failure | Check cert expiry, regenerate per steps above |
| Version conflict | Run `npm run increment-version` locally and push |

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
