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
│   ├── useKatabaticAnalyzer.ts # Prediction logic
│   └── ...                # Hook files
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

## Recent Major Updates

### Mountain Wave-Katabatic Interaction (MKI) Integration (Phase 4)
The prediction system has been enhanced with sophisticated atmospheric science based on research from "Interaction of Katabatic Flow and Mountain Waves":

- **Enhanced 6-Factor Analysis**: Upgraded from 4-factor to 6-factor prediction system
- **New Services**: Added `mountainWaveAnalyzer.ts` for advanced atmospheric modeling
- **Improved Accuracy**: 15-25% improvement target through MKI consideration
- **Scientific Foundation**: First consumer implementation of MKI atmospheric research

**Key Files:**
- `services/mountainWaveAnalyzer.ts` - New MKI analysis engine
- `services/katabaticAnalyzer.ts` - Enhanced with 6-factor system
- `docs/wind-prediction-guide.md` - Updated with comprehensive MKI theory and 6-factor system
- `docs/architecture.md` - Updated with MKI service architecture details

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
