# Dawn Patrol Alarm File Structure

This document provides an overview of all files in the Dawn Patrol Alarm project, organized by their purpose and functionality.

## Core App Structure

### Root Configuration Files
- `app.json` - Expo configuration including app metadata, build settings, and splash screen
- `eas.json` - Expo Application Services configuration for builds and submissions
- `eslint.config.js` - ESLint configuration for code quality
- `metro.config.js` - Metro bundler configuration for React Native
- `tsconfig.json` - TypeScript configuration
- `package.json` - Project dependencies and scripts

### App Navigation and Layout
- `app/_layout.tsx` - Root layout for the entire application
- `app/+not-found.tsx` - 404 page for invalid routes
- `app/test-alarm.tsx` - Page for testing wind alarm functionality
- `app/(tabs)/_layout.tsx` - Tab-based navigation layout
- `app/(tabs)/index.tsx` - Home tab with main wind data display
- `app/(tabs)/explore.tsx` - Settings tab for configuring wind criteria

## Services

### Wind Data Services
- `services/windService.ts` - Core wind data fetching, processing and analysis
- `services/fallbackData.ts` - Emergency fallback wind data for offline use
- `services/alarmAudioService.ts` - Audio service for alarm sounds and state management
- `services/alarmDebugLogger.ts` - Logging service for alarm-related events and debug information

### Storage and Persistence
- `services/storageService.ts` - AsyncStorage wrapper for data caching and persistence

### Debug Settings & Developer Mode
- `services/debugSettings.ts` - Controls visibility of debugging tools through developer mode
- `services/terminalLogger.ts` - Enhanced terminal logging for Android debug information

### Android Crash Detection & Recovery
- `services/crashMonitor.ts` - Monitors and logs crash events
- `services/productionCrashDetector.ts` - Production-specific crash detection
- `services/globalCrashHandler.ts` - Global error handling and reporting
- `services/crashReportExportService.ts` - Exports crash reports for debugging
- `services/diagnosticService.ts` - Runtime diagnostic tools
- `services/androidSplash.ts` - Custom splash screen with white screen prevention

### Compatibility
- `services/polyfills.ts` - JavaScript polyfills for older devices (Array.findLast, etc.)

## Components

### Wind Data Components
- `components/WindDataDisplay.tsx` - Main component for displaying wind data and analysis
- `components/WindChart.tsx` - Chart visualization for wind trends
- `components/WindAlarmTesterRefactored.tsx` - Component for testing alarm functionality with different scenarios
- `components/AlarmImplementationComparison.tsx` - Wrapper component for the alarm tester

### Developer Mode Components
- `components/DebugSettingsUI.tsx` - UI for toggling debug features and components
- `components/SecretGestureActivator.tsx` - Invisible component that activates developer mode with a secret gesture
- `components/AppInitializer.tsx` - Handles app initialization including debug features

### Crash Recovery Components
- `components/AndroidCrashLogger.tsx` - Logs and displays Android-specific crashes
- `components/AndroidDebugger.tsx` - Debug tool for Android issues
- `components/AndroidSafeWrapper.tsx` - Safety wrapper for Android components
- `components/ApkCrashDiagnostics.tsx` - APK-specific crash diagnostics
- `components/DataCrashDetector.tsx` - Detects data-related crashes
- `components/EmergencyRecovery.tsx` - Last-resort recovery options
- `components/EnhancedAndroidDebugger.tsx` - Advanced debugging for Android
- `components/ErrorBoundary.tsx` - React error boundary for catching component errors
- `components/GlobalCrashRecovery.tsx` - App-wide crash recovery system
- `components/QuickExportButton.tsx` - Floating button for exporting crash data
- `components/SafeAppLoader.tsx` - Safe application initialization
- `components/SafeImage.tsx` - Error-resistant image component
- `components/WhiteScreenDetective.tsx` - Specifically detects and fixes white screens

### UI Components
- `components/Collapsible.tsx` - Collapsible panel for UI organization
- `components/ExternalLink.tsx` - External link handler
- `components/HelloWave.tsx` - Animated wave component
- `components/HapticTab.tsx` - Tab with haptic feedback
- `components/LoadingScreen.tsx` - Loading indicator screen
- `components/ParallaxScrollView.tsx` - Scrolling with parallax effect
- `components/ThemedText.tsx` - Text component with theming support
- `components/ThemedView.tsx` - View component with theming support
- `components/ui/IconSymbol.tsx` - Cross-platform icon component
- `components/ui/TabBarBackground.tsx` - Styled background for tab bar

## Hooks

### Theme Hooks
- `hooks/useColorScheme.ts` - Hook for accessing color scheme (dark/light mode)
- `hooks/useThemeColor.ts` - Hook for dynamic theme colors

### Data Hooks
- `hooks/useWindData.ts` - Custom hook for managing wind data state and analysis
- `hooks/useAlarmAudio.ts` - Custom hook for managing alarm audio playback and state
- `hooks/useWindAnalyzer.ts` - Custom hook for wind data analysis and scenario testing
- `hooks/useWindAlarmReducer.ts` - Reducer hook for centralized alarm state management

## Assets
- `assets/fonts/` - Custom font files
- `assets/images/` - App icons, splash screens, and other images

## Scripts
- `scripts/fetch-wind-data.mjs` - Standalone script for fetching and analyzing wind data

## Utils
- `utils/testWindData.ts` - Generates test wind data scenarios for alarm testing

## Documentation
- `README.md` - Project overview and getting started guide
- `IMPLEMENTATION_SUMMARY.md` - Summary of implemented features
- `docs/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md` - Comprehensive guide for Android crash and white screen issues
- `docs/eas.md` - Expo Application Services documentation
- `docs/LOCAL_BUILD_INSTRUCTIONS.md` - Instructions for building locally
- `docs/FILE_STRUCTURE.md` - This file - overview of all project files

## Config
- `config/buildConfig.ts` - Build-specific configuration and settings

## Constants
- `constants/Colors.ts` - Color definitions for the application

## Testing
- `__tests__/hooks/` - Tests for React hooks

## Build and Workflow
- `.github/workflows/build.yml` - GitHub Actions workflow for building the app with white screen fixes

## Output Files
- `android/` - Generated Android project files (created during build)
