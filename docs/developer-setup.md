# Developer Setup

Complete setup guide for developers working on the Dawn Patrol Alarm project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Development Workflow](#development-workflow)
4. [Project Structure](#project-structure)
5. [Key Technologies](#key-technologies)
6. [Development Guidelines](#development-guidelines)

## Prerequisites

### Required Tools

- **Node.js** (v18 or higher)
- **npm** (comes with Node.js)
- **Expo CLI** (installed via npm)
- **Git** for version control

### Mobile Development

**For iOS Development:**
- macOS with Xcode installed
- iOS Simulator or physical iOS device

**For Android Development:**
- Android Studio with Android SDK
- Android Emulator or physical Android device
- USB debugging enabled for physical devices

### API Accounts (Optional but Recommended)

- **OpenWeatherMap**: Free API key for real weather data
- **Ecowitt**: API credentials for Standley Lake monitoring

## Environment Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone [repository-url]
cd dp-react

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env
```

Edit `.env` file with your API credentials:

```bash
# OpenWeatherMap API (recommended for real data)
OPENWEATHER_API_KEY=your_api_key_here

# Ecowitt API (optional - for Standley Lake monitoring) 
ECOWITT_APPLICATION_KEY=your_application_key_here
ECOWITT_API_KEY=your_api_key_here
```

**Note**: The app works without API keys using cached/mock data, but real API keys provide better accuracy.

### 3. Verify Setup

```bash
# Start development server
npm start

# Alternative: start with tunnel for external device testing
npx expo start --tunnel
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
   - Scan QR code with Expo Go app on physical device

3. **Live reload** - Changes automatically refresh the app

### Code Quality

```bash
# Check for linting issues and compilation errors
npm run lint

# Fix auto-fixable linting issues
npm run lint:fix

# Type checking (TypeScript)
npx tsc --noEmit
```

### Testing

```bash
# Run unit tests  
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

## Project Structure

```
dp-react/
├── app/                    # Main application screens (Expo Router)
│   ├── _layout.tsx         # Root layout and navigation
│   ├── (tabs)/            # Tab-based navigation screens
│   └── +not-found.tsx     # 404 error screen
├── components/             # Reusable UI components
│   ├── ui/                # Generic UI components  
│   ├── WindChart.tsx      # Wind data visualization
│   ├── WindDataDisplay.tsx # Wind data presentation
│   └── ...                # Component files
├── hooks/                  # Custom React hooks
│   ├── useWindData.ts     # Wind data fetching
│   └── ...                # Hook files (useWeatherData.ts removed)
├── services/               # Business logic and API services
│   ├── weatherService.ts  # Weather API integration
│   ├── alarmAudioService.ts # Audio/notification handling
│   └── ...                # Service files
├── utils/                  # Helper functions and utilities
├── config/                 # Configuration files
├── assets/                 # Static assets (images, fonts, sounds)
├── docs/                   # Documentation (you are here!)
└── ...                    # Root configuration files
```

### Key Directories Explained

**`/app`** - Screen components using Expo Router
- File-based routing system
- Each file represents a screen or layout
- Supports nested routes and tabs

**`/components`** - Reusable UI components
- Organized by functionality
- Includes both generic and app-specific components
- Android-specific fixes and wrappers

**`/hooks`** - Custom React hooks
- Data fetching and state management
- Business logic abstraction
- Reusable stateful logic

**`/services`** - Core business logic
- API integrations (OpenWeatherMap, Ecowitt)
- Data processing and analysis
- Audio and notification services
- **Note**: Wind prediction services moved to server-based architecture

## Recent Major Updates

### Wind Guru Server Migration (June 30, 2025)
The Wind Guru prediction system has been converted from a complex local prediction system to a server-based solution:

**Migration Overview:**
- **Removed Local Prediction Logic**: Eliminated 3000+ lines of complex katabatic analysis code
- **Simplified Client**: Wind Guru tab now shows server migration status and coming features
- **Enhanced Performance**: Server-based predictions will provide faster and more accurate results
- **Code Reduction**: 87% reduction in Wind Guru related code (from ~3000+ lines to ~400 lines)

**Removed Services:**
- `services/katabaticAnalyzer.ts` (1165 lines) - Main prediction algorithm
- `services/predictionStateManager.ts` (~400 lines) - Locked prediction state management
- `services/predictionTrackingService.ts` (~500 lines) - Accuracy tracking and outcomes
- `services/eveningWeatherRefreshService.ts` (~300 lines) - Auto 6PM data refresh
- `services/freeHistoricalWeatherService.ts` (~275 lines) - Historical weather enhancement
- `hooks/useKatabaticAnalyzer.ts` (~200 lines) - React hook for prediction analysis

**Simplified Files:**
- `app/(tabs)/wind-guru.tsx` - From 2057 lines to ~400 lines (80% reduction)
- `hooks/useWeatherData.ts` - **REMOVED** (was simplified from 977 to 152 lines, then removed entirely)
- `app/_layout.tsx` - Removed wind prediction service initialization

**Previous System (Removed):**
- ~~Local 5-factor hybrid MKI analysis~~
- ~~Real-time prediction state management~~
- ~~Historical verification tracking~~
- ~~Evening weather refresh automation~~
- ~~Complex atmospheric stability calculations~~
- ~~Thermal cycle temperature analysis~~
- ~~Wave pattern enhancement detection~~

**New System (In Development):**
- Server-based katabatic wind analysis
- Enhanced machine learning models
- Improved atmospheric pattern recognition
- Multi-location comparative analysis
- Centralized prediction logic for better maintainability

**Benefits of Server Migration:**
1. **Reduced Client Complexity**: Massive code reduction and simplified architecture
2. **Better Performance**: No local processing overhead, instant server results
3. **Enhanced Accuracy**: Access to more comprehensive weather datasets and ML models
4. **Improved Maintainability**: Centralized logic, easier updates and debugging
5. **Scalability**: Server can handle complex calculations and real-time data processing

## Recent Improvements

### Wind Data Chart Enhancements (Latest)

**Key Improvements Made:**
- ✅ **Eliminated data gaps** by implementing combined historical + real-time API approach
- ✅ **Improved chart UX** with CustomWindChart component featuring:
  - Professional time-based x-axis labeling (hourly with AM/PM, quarter-hour marks)
  - Horizontal scrolling with sticky Y-axis labels
  - Proper gap handling (line breaks for missing data)
  - Dynamic width based on data range
- ✅ **Streamlined refresh UX** - removed refresh button, now pull-to-refresh only
- ✅ **Optimized performance** - auto-refresh only on first navigation to tabs
- ✅ **Better data freshness** - shows current time coverage and last updated timestamp

**Technical Changes:**
- **ecowittService.ts**: Added `fetchEcowittCombinedWindDataForDevice()` combining historical and real-time APIs
- **CustomWindChart.tsx**: SVG-based chart replacing legacy React Native Chart Kit implementation  
- **Removed unused components**: VictoryWindChart, legacy WindChart
- **Cleaned debug scripts**: Removed 20+ temporary investigation scripts

**Data Coverage Solution:**
- Historical API provides data from start of day up to ~10:20am
- Real-time API provides current conditions and recent data
- Combined approach eliminates the 7am-1pm data gap issue

## Wind Data Gap Investigation (Resolved)

### Issue
Large gaps appeared in wind data charts between 7AM-1PM, despite Ecowitt web UI showing data for those periods.

### Investigation Results
Comprehensive API testing with multiple parameters, timezones, and cycle types revealed:

**✅ Root Cause Confirmed**: Gaps exist in the raw Ecowitt API data itself, not in app processing.

**Key Findings**:
- API returns 130 total data points but with consistent gaps:
  - GAP 1: 07:00 AM → 08:25 AM (85 minutes)
  - GAP 2: 08:35 AM → 11:40 AM (185 minutes) ← Main visible gap
  - GAP 3: 04:20 PM → 05:00 PM (40 minutes)
- Same gaps appear across all test scenarios (different timezones, cycle types, parameters)
- Even when requesting ONLY 7AM-1PM data, API returns the same internal gaps
- Real-time API works but only provides current moment, not historical gap-filling

**Conclusion**: The weather station itself had data collection/transmission issues during these periods. The Ecowitt web UI may show interpolated or cached data that the API doesn't provide.

### Solution
**Accepted as normal behavior** for historical weather APIs. The app correctly processes all available data.

**Current Implementation**:
- Uses `fetchEcowittCombinedWindDataForDevice()` for historical + real-time data
- CustomWindChart properly displays gaps with line breaks (no false interpolation)
- Professional chart with proper time labeling and horizontal scrolling

## Key Technologies

### Core Framework
- **Expo** - React Native framework with managed workflow
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript development
- **Expo Router** - File-based navigation system

### State Management  
- **React Hooks** - Built-in state management
- **Custom Reducers** - Complex state logic
- **Context API** - Global state sharing

### UI/UX
- **React Navigation v7** - Navigation library
- **Expo Vector Icons** - Icon library
- **Custom Themes** - Light/dark mode support
- **Responsive Design** - Mobile-first approach

### APIs & Data
- **OpenWeatherMap API** - Real weather data
- **Ecowitt API** - Standley Lake monitoring
- **AsyncStorage** - Local data persistence
- **Expo SecureStore** - Secure credential storage

### Development Tools
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting
- **TypeScript** - Static type checking
- **Jest** - Unit testing framework

## Development Guidelines

### Code Style

1. **Follow TypeScript best practices**
   - Use proper type annotations
   - Avoid `any` types when possible
   - Define interfaces for complex objects

2. **Component Structure**
   ```typescript
   // Good component structure
   interface ComponentProps {
     // Define props with types
   }
   
   export function ComponentName({ prop1, prop2 }: ComponentProps) {
     // Hooks at the top
     const [state, setState] = useState();
     
     // Event handlers
     const handleAction = () => {
       // Handler logic
     };
     
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

1. **Use the weatherService abstraction**
   ```typescript
   // Good - use the service
   import { weatherService } from '@/services/weatherService';
   
   // Bad - direct API calls in components
   ```

2. **Handle errors gracefully**
   ```typescript
   try {
     const data = await weatherService.getCurrentWeather();
     // Handle success
   } catch (error) {
     // Handle error with user-friendly message
   }
   ```

3. **Implement proper loading states**
   ```typescript
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState<string | null>(null);
   ```

### Android-Specific Considerations

1. **Use Android-safe wrappers** for crash-prone components
2. **Test on physical devices** - emulators may not catch all issues
3. **Implement proper error boundaries** for crash recovery
4. **Use debugging components** when troubleshooting Android issues

### Build Process & Deployment

**Dawn Patrol Alarm uses GitHub Actions for all production builds**:
- ✅ **No local build setup required**
- ✅ **Consistent build environment**
- ✅ **Automated Android optimizations**
- ✅ **Integrated testing and validation**
- ✅ **Automatic version management**

#### Local Development
Use `npm start` for testing and development

#### Production Builds
All production builds are handled automatically via GitHub Actions workflow (`.github/workflows/build.yml`):

**Supported Platforms**:
- **Android**: APK and AAB (Android App Bundle) builds
- **iOS**: IPA builds for TestFlight distribution

**Build Triggers**:
- Push to `main` branch (automatic)
- Manual trigger via GitHub Actions "Run workflow" button

**Build Process**:
1. Environment setup (Node.js, Expo CLI, Android SDK)
2. Dependency installation with caching
3. Code quality checks (ESLint, TypeScript, tests)
4. Version increment (patch level)
5. Platform-specific optimizations
6. Artifact generation and distribution

#### GitHub Repository Secrets

Required secrets for the build process:

**Android Signing**:
```
ANDROID_KEYSTORE_BASE64    # Base64 encoded keystore file
ANDROID_KEY_ALIAS          # Key alias for signing
ANDROID_KEY_PASSWORD       # Key password
ANDROID_KEYSTORE_PASSWORD  # Keystore password
```

**API Keys**:
```
OPENWEATHER_API_KEY        # OpenWeatherMap API key
ECOWITT_APPLICATION_KEY    # Ecowitt app key (optional)
ECOWITT_API_KEY           # Ecowitt API key (optional)
```

**Setting Up Secrets**:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each required secret with the exact name and value

#### Release Process

1. **Prepare Release**: Ensure features are complete and tested
2. **Trigger Build**: Push to main branch or manually trigger workflow
3. **Monitor Build**: Watch GitHub Actions progress
4. **Distribute**: Download artifacts and distribute via chosen channels

#### Distribution

**Android APK**:
- Primary distribution via GitHub Releases
- Direct APK download links
- Manual installation requires "Unknown Sources" permission

**iOS TestFlight** (if configured):
- Automatic upload to TestFlight
- Beta tester notifications
- Internal testing (up to 100 testers, no review)
- External testing (up to 10,000 testers, requires Beta App Review)

#### Build Troubleshooting

**Common Issues**:
- "Invalid keystore" Error: Verify keystore base64 encoding and secrets
- "API key missing" Warning: Non-critical, app uses fallback data
- "Version conflict" Error: Manual version bump may be needed

**Debug Commands**:
```bash
# Test locally before pushing
npm run lint
npm run test

# Environment debugging
npm run debug-env          # Check environment variables
npm run validate-keys      # Validate API keys  
npm run test-apis          # Test API connectivity
```

### Git Workflow

1. **Create feature branches** from `main`
2. **Make small, focused commits** with clear messages
3. **Run linting** before committing: `npm run lint`
4. **Create pull requests** for code review
5. **Merge after review** and CI checks pass
6. **Production build** triggers automatically on merge to main

### Debugging

1. **Use React Developer Tools** for component inspection
2. **Enable remote debugging** in Expo DevTools
3. **Use console.log** strategically (remove before production)
4. **Utilize Android debugging components** for Android-specific issues
5. **Check network requests** in browser dev tools

### Performance

1. **Minimize API calls** - use caching where appropriate
2. **Optimize images** - use appropriate formats and sizes
3. **Lazy load components** when possible
4. **Profile performance** using React DevTools Profiler
5. **Test on lower-end devices** to ensure smooth experience

## Evening Weather Refresh Service

The app includes an automatic evening weather refresh system that ensures accurate overnight wind predictions.

### Purpose
The evening refresh service solves the issue where pressure change and temperature differential would show 0.0 values when the app transitions from afternoon to evening analysis mode at 6 PM.

### How It Works
1. **Automatic Scheduling**: Service schedules a background notification for 6 PM daily
2. **Silent Refresh**: At 6 PM, weather data is automatically refreshed in the background
3. **Fresh Data**: Ensures pressure trends and temperature differentials are calculated with current data
4. **User Transparency**: Status is visible in the Wind Guru screen header

### Key Files
- `services/generalNotificationService.ts` - General purpose notification system
- `services/eveningWeatherRefreshService.ts` - Main service implementation
- `services/alarmNotificationService.ts` - Alarm-specific notifications (separate from general)
- `app/(tabs)/wind-guru.tsx` - UI status display

### Debug Commands
```bash
# Test the evening refresh service
npm run debug-evening-refresh

# Check current status and trigger manual refresh
node scripts/debug-evening-refresh.mjs
```

### Configuration
The service automatically initializes when the app starts and requires notification permissions to function properly. No additional configuration is needed.

## Prediction Lifecycle Management

The app implements a robust prediction lifecycle management system to ensure wind predictions are locked at appropriate times and maintain consistency throughout the prediction window.

> **📋 For complete workflow details, see [Wind Guru Prediction Workflow](./wind-guru-prediction-workflow.md)**

### Purpose
The prediction lifecycle management solves timing issues where predictions would dramatically change after midnight due to forecast data transitions. It implements a structured approach to prediction reliability:

### Lifecycle Stages
1. **Preview (Morning-Evening)**: Predictions calculated normally, updated with fresh data
2. **Evening Lock (6 PM)**: First lock point - prediction locked for evening review
3. **Final Lock (11 PM)**: Second lock point - prediction locked for dawn execution
4. **Active (Midnight-8 AM)**: Locked prediction used, no recalculation
5. **Verification (8 AM)**: Compare predicted vs actual conditions

### Key Features
- **Automatic Locking**: Predictions automatically lock at 6 PM and 11 PM
- **State Persistence**: Locked predictions saved and restored between app sessions
- **Consistent Results**: Same prediction shown from evening through dawn
- **Verification**: Post-event analysis to improve prediction accuracy

### Key Files
- `services/predictionStateManager.ts` - Core prediction lifecycle management
- `services/katabaticAnalyzer.ts` - Integrated prediction analysis with state management

### Testing
```bash
# Debug current prediction state and real wind data
npm run debug-stations  # Shows real wind data for verification
```

### Configuration
The prediction lifecycle system automatically initializes when first accessed and requires no manual configuration. It uses AsyncStorage for persistence and includes automatic cleanup of old predictions.

## Getting Help

- **Issues**: Create GitHub issues for bugs or feature requests  
- **Architecture**: See [Architecture Guide](architecture.md) for system design
- **Wind Prediction**: See [Wind Prediction Guide](wind-prediction-guide.md) for technical details

## Next Steps

Once you have the development environment set up:

1. **Explore the codebase** - Start with `/app` directory for main screens
2. **Review architecture** - Read [Architecture Guide](architecture.md)
3. **Understand wind prediction** - See [Wind Prediction Guide](wind-prediction-guide.md)
4. **Make your first change** - Try updating a component or adding a feature
5. **Test thoroughly** - Ensure changes work on both iOS and Android
6. **Deploy** - Push to main branch to trigger automated build and release

## Ecowitt Sensor Investigation & Troubleshooting

The app uses real weather data from Ecowitt weather stations at Standley Lake and Soda Lake. This section documents investigation findings and troubleshooting procedures.

### Current Status (Last Updated: June 2025)

**Standley Lake Station (GW2000B_V3.2.5)**:
- ✅ **Excellent reliability**: 100% data coverage with no gaps
- ✅ **All sensors operational**: Wind, temperature, humidity, pressure, rain, solar
- ✅ **Consistent wind data**: Reliable source for wind predictions
- 📍 **Location**: 39.870467, -105.151622

**Soda Lake Station (GW3000B_V1.0.6)**:  
- ⚠️ **Intermittent wind data**: ~52% coverage (151/288 daily readings have wind data)
- ✅ **Sensors functional**: When connected, all sensors work properly
- ✅ **Temperature/humidity reliable**: Consistent outdoor readings
- 🔧 **Issue**: Periodic RF connectivity problems with wind sensor array
- 📍 **Location**: 39.646115, -105.174958

### Device Comparison

| Feature | Standley (GW2000B) | Soda (GW3000B) |
|---------|-------------------|----------------|
| **Gateway Type** | Basic outdoor gateway | Advanced console with display |
| **Indoor Sensors** | Via external sensors only | Built-in to console unit |
| **Reliability** | Excellent (100%) | Good but intermittent wind |
| **Sensor Array** | Haptic array, 2.6V battery | Haptic array, 3.18V battery |
| **Connectivity** | Stable RF connection | Intermittent RF issues |

### Common Issues & Solutions

**Missing Wind Data**:
- **Symptom**: Historical data shows gaps in wind readings
- **Cause**: RF interference or signal strength issues 
- **Solution**: Improve Soda Lake RF connectivity (antenna placement, signal strength)

**Indoor Temperature Readings**:
- **Normal Behavior**: GW3000B consoles measure indoor conditions where installed
- **Explanation**: Gateway unit placed indoors provides indoor temp/humidity
- **Not a Bug**: This is expected behavior for console-type devices

**Battery Status**:
- **Healthy Range**: 2.4V - 3.2V for sensor arrays
- **Warning**: <2.4V may cause connectivity issues
- **Critical**: <2.2V requires immediate battery replacement

### Investigation Tools

Use these debugging scripts to investigate sensor issues:

```bash
# Check individual station data and connectivity
npm run debug-stations

# Verify device connectivity and sensor status
npm run debug-devices

# Verify NOAA weather data quality  
npm run verify-noaa
```

### Key Findings from Investigation

1. **API Data Accuracy**: Ecowitt API returns correct data counts (288 5-minute intervals = 24 hours)
2. **Sensor Connectivity**: Both stations show all sensors connected in real-time checks
3. **Intermittent Issues**: Soda Lake wind sensor has periodic RF connectivity problems
4. **Hardware Status**: All sensor batteries healthy, no hardware failures detected
5. **Indoor Sensors**: Normal operation for GW3000B console units

### Recommendations for App Development

1. **Data Quality Focus**: Improve Soda Lake sensor connectivity for more reliable wind data
2. **Data Validation**: Add checks for missing wind periods and implement graceful fallbacks
3. **User Feedback**: Display data quality indicators and gaps clearly in UI
4. **Monitoring**: Set up alerts for extended sensor outages at the primary location
5. **RF Optimization**: Consider antenna placement and signal strength improvements

### Technical Details

**Compatible Sensor Arrays**:
- WS85, WS90, WS80, WS68, WS69 (wind/weather arrays)
- WH40 (rain gauge), WH57 (lightning detector)
- WH45/WH46 (air quality), WN34L/S/D (temperature sensors)

**RF Specifications**:
- Frequency: 915MHz (US), 868MHz (EU), 433MHz (Asia)
- Range: 100+ meters in open areas
- Protocol: Proprietary Ecowitt wireless

## API Migration History

### Phase 1: Open-Meteo Migration (Completed June 21, 2025)

Successfully migrated from OpenWeatherMap to Open-Meteo API to eliminate API blocking issues and costs.

#### Objectives Achieved
1. **Primary Weather API Switch**
   - **From**: OpenWeatherMap (rate-limited, paid, blocked)
   - **To**: Open-Meteo (unlimited, free, high-quality)
   - **Result**: ✅ Eliminated API blocking issues

2. **Aggressive Caching Implementation**
   - **From**: 30-minute cache duration
   - **To**: 6-hour cache duration (12x improvement)
   - **Benefits**: 
     - 🚀 Reduced API dependency
     - ⚡ Faster app performance  
     - 📶 Better offline capability
     - 💰 Zero API costs

#### Technical Implementation
- **New Files Created**:
  - `services/openMeteoWeatherService.ts` - Complete Open-Meteo integration
  - `scripts/test-open-meteo-integration.mjs` - API validation script

- **Files Modified**:
  - `hooks/useWeatherData.ts` - Switched to Open-Meteo service
  - `app/(tabs)/wind-guru.tsx` - Updated UI to show new data source
  - `package.json` - Added test script

#### Key Features
- **No API Keys Required** - Open-Meteo is completely free
- **Comprehensive Data** - Current weather + 7-day hourly forecasts
- **High Quality Sources** - European reanalysis data (ERA5, ECMWF IFS)
- **Smart Caching** - 6-hour cache with stale data fallback
- **Error Recovery** - Graceful degradation with mock data

#### Performance Results
```
✅ Morrison API Response: 200
   Current Temp: 33.2°C
   Pressure: 985.4 hPa
   Wind: 2.51 m/s
   Forecast Hours: 168

✅ Evergreen API Response: 200
   Current Temp: 30.5°C
   Pressure: 985.8 hPa

🌡️ Temperature Differential: 2.7°C
⚡ API Performance: ~159ms average
```

#### Benefits Achieved
- **Cost Elimination**: $0 API costs with Open-Meteo
- **Reliability Improvement**: No limits, no blocks, unlimited requests
- **Performance Enhancement**: 6-hour cache, 12x fewer API calls
- **Development Velocity**: Zero configuration, works immediately
