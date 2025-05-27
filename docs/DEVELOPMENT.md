# Wind Trend Analyzer - Developer Documentation

This document contains information for developers working on the Wind Trend Analyzer project. For end-user documentation, see [README.md](./README.md).

## Project Overview

The Wind Trend Analyzer is a React Native app built with Expo that analyzes wind conditions at Bear Creek Lake (Colorado) to determine if conditions are favorable for beach activities. It fetches data from WindAlert API, processes it, and presents results to users.

## Development Environment

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- For iOS: macOS with Xcode 14+
- For Android: Android Studio with SDK 33+
- Git

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/wind-trend-analyzer.git
cd wind-trend-analyzer
```

2. Install dependencies
```bash
npm install
```

3. Start development server
```bash
# For local network 
npx expo start

# For public network
npx export start --tunnel
```

## Project Structure

For a detailed breakdown of all files and their purposes, see [FILE_STRUCTURE.md](./docs/FILE_STRUCTURE.md).

Key directories:
- `/app` - Main application screens using Expo Router
- `/components` - Reusable React components
- `/services` - Core business logic and API services
- `/hooks` - Custom React hooks
- `/assets` - Static assets like images and fonts

## Implementation Details

For a detailed overview of implemented features, see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md).

## Building for Production

### Using GitHub Actions

The project includes a GitHub Actions workflow (`build.yml`) that builds the app with specialized Android optimizations and white screen fixes. See the workflow file for details.

### Local Builds

For instructions on building locally, see [LOCAL_BUILD_INSTRUCTIONS.md](./docs/LOCAL_BUILD_INSTRUCTIONS.md).

### Expo Application Services (EAS)

This project uses EAS for managed builds. Configuration is in `eas.json`.

```bash
# Build for production
eas build --platform android --profile production
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific tests
npm test -- -t "WindService"
```

### Testing Components

The `components/WindDataTest.tsx` component can be used for debugging and testing wind service functionality:
- Tests API connectivity
- Validates data parsing and analysis
- Shows console-style output for debugging

### Standalone Script

A standalone script is available for testing wind data fetching and analysis without the full app:

```bash
npm run fetch-wind
```

This creates JSON and CSV files with current wind data and analysis, mimicking the functionality in the mobile app.

## Android-Specific Development

For detailed documentation on Android crash detection, white screen prevention, and debugging tools, see [ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md](./docs/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md).

Key Android development features:
- Multi-layer crash detection and recovery
- White screen prevention mechanisms
- Diagnostic tools and crash reporting
- Production-specific optimizations

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure quality
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

The project uses ESLint for code quality. Run linting with:

```bash
npm run lint
```

Follow these guidelines:
- Use TypeScript for type safety
- Follow React functional component patterns
- Document complex functions and components
- Keep components small and focused
- Use the existing theming system for UI

## Troubleshooting Development Issues

### Common Development Problems

1. **Metro bundler issues**: Clear cache with `npx expo start -c`
2. **Android build errors**: Check the detailed logs in the GitHub Actions workflow
3. **White screen on Android**: See the specialized debugging guide
4. **API connection errors**: Verify network and check API endpoint status

### Debugging Tools

- Use the built-in debugging tools in the app (`EnhancedAndroidDebugger`, `ApkCrashDiagnostics`)
- For React issues, use React DevTools
- For network issues, use the Network tab in browser dev tools when running in web mode
- Check logs with `adb logcat` for Android-specific issues
