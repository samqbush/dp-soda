# Dawn Patrol Alarm - Developer Documentation

This document contains information for developers working on the Dawn Patrol Alarm project. For end-user documentation, see [README.md](./README.md).

## Project Overview

The Dawn Patrol Alarm is a React Native app built with Expo that analyzes wind conditions at Soda Lake (Colorado) to determine if conditions are favorable for beach activities. It fetches data from WindAlert API, processes it, and presents results to users.

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

TODO: Develop unit tests

### Lint

```shell
npm run lint
npx tsc --noEmit
npx yaml-lint .github/workflows/build.yml
```

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
- Compatibility polyfills for older devices

### JavaScript Compatibility

The app includes polyfills for modern JavaScript features to ensure compatibility with older Android devices. These polyfills are loaded early in the app initialization process.

- `services/polyfills.ts` - Contains polyfills for modern JavaScript methods like `Array.prototype.findLast`
- For details on specific compatibility fixes, see [REACT_NAVIGATION_V7_FIXES.md](../docs/REACT_NAVIGATION_V7_FIXES.md)

When adding new features that use modern JavaScript methods, consider checking if they need polyfills for older Android versions (API level ≤ 29).

## Developer Mode

The app includes a Developer Mode that makes testing and debugging easier, especially for Android issues.

### Enabling Developer Mode in Development

During development, you can enable Developer Mode in several ways:

1. **Secret Gesture**: Tap any text element 5 times in rapid succession (same method end users would use)
2. **Direct API Call**: Use the debugSettings service directly:
   ```typescript
   import { debugSettings } from '@/services/debugSettings';
   
   // Enable developer mode
   await debugSettings.toggleDeveloperMode(true);
   
   // Show specific debug component
   await debugSettings.setComponentVisibility('showAndroidCrashLogger', true);
   ```
3. **Debug Settings Component**: Import and use the DebugSettingsUI component directly in your development screens

### Available Debug Components

| Component | Purpose | API Key |
|-----------|---------|---------|
| Android Debugger | Basic Android debugging | `showAndroidDebugger` |
| Android Crash Logger | Enhanced crash logging | `showAndroidCrashLogger` |
| APK Diagnostics | APK-specific tests | `showApkDiagnostics` |
| Enhanced Android Debugger | Advanced system monitoring | `showEnhancedAndroidDebugger` |
| Quick Export Button | Floating export button | `showQuickExportButton` |

### Debug Settings API

The `debugSettings` service provides these key methods:

```typescript
// Get current settings
const settings = await debugSettings.getSettings();

// Toggle developer mode (master switch)
await debugSettings.toggleDeveloperMode(true);

// Set visibility for specific debug component
await debugSettings.setComponentVisibility('componentKey', true);

// Check if a component should be visible
const isVisible = await debugSettings.isComponentVisible('componentKey');

// Subscribe to visibility changes for real-time updates
const unsubscribe = debugSettings.subscribeToVisibilityChanges(
  'componentKey',
  (visible) => console.log('Component visibility changed:', visible)
);

// Unsubscribe when done
unsubscribe();
```

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

### Enhanced Terminal Logging

The app includes enhanced terminal logging functions to help with debugging:

```typescript
// Available in the terminal when running in development mode
import { terminalLogger } from '@/services/terminalLogger';

// Print all crash logs with formatting that prevents truncation
terminalLogger.printAllCrashLogs();

// Print just the most recent crash with full details
terminalLogger.printLatestCrash();

// Print a summary of all crash statistics
terminalLogger.printCrashSummary();

// For convenience, these are also exposed as global functions:
printCrashLogs(); // Prints all logs
printLatestCrash(); // Prints most recent crash
printCrashSummary(); // Prints statistics
```

The terminal logger formats crash information with clear dividers, color coding (when supported), and special formatting to make issues easier to spot in cluttered logs.
