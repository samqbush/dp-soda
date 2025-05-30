# Android Crash & White Screen Guide

This guide consolidates all documentation related to Android white screen issues, crash detection, debugging, and recovery for the Dawn Patrol Alarm app. It replaces the following documents:
- WHITE_SCREEN_FIX.md
- APK_DEBUGGING_IMPLEMENTATION.md
- docs/ANDROID_WHITE_SCREEN.md
- docs/APK_CRASH_DEBUGGING.md
- docs/CRASH_RECOVERY_GUIDE.md
- docs/CRASH_FIX_SUMMARY.md

---

## Table of Contents
- [Android Crash \& White Screen Guide](#android-crash--white-screen-guide)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Common Issues \& Root Causes](#common-issues--root-causes)
  - [Key Features \& Fixes](#key-features--fixes)
  - [Crash Detection \& Recovery System](#crash-detection--recovery-system)
  - [Debugging Tools](#debugging-tools)
  - [Developer Mode](#developer-mode)
    - [Activating Developer Mode](#activating-developer-mode)
    - [Debug Settings UI](#debug-settings-ui)
    - [Accessing Debug Settings Later](#accessing-debug-settings-later)
  - [Enhanced Terminal Logging](#enhanced-terminal-logging)
    - [Features](#features)
    - [Terminal Commands](#terminal-commands)
    - [UI Integration](#ui-integration)
  - [Testing \& Troubleshooting](#testing--troubleshooting)
  - [Emergency Recovery Options](#emergency-recovery-options)
  - [Build \& Installation](#build--installation)
  - [Console \& ADB Commands](#console--adb-commands)
  - [Reporting Issues](#reporting-issues)

---

## Overview

The app includes a multi-layered crash detection and white screen prevention system for Android, with:
- Global crash handler (catches errors before React loads)
- Component-level error boundaries
- Progressive recovery UI (timeouts, force reload, emergency options)
- Diagnostic and export tools for crash data

## Common Issues & Root Causes
- Splash screen transition failures
- AsyncStorage initialization problems
- Image loading/memory issues
- JavaScript bundle errors
- Missing imports or unsafe API usage
- Unhandled promise rejections
- Device-specific memory or storage failures

## Key Features & Fixes
- Disabled new React Native architecture (`newArchEnabled: false`)
- Gradle and build config fixes for modern Android
- Enhanced error boundaries and diagnostic services
- Safe AsyncStorage and image handling
- Progressive recovery system (5s, 8s, 12s, 15s timeouts)
- Emergency recovery: clear data, force restart, fallback UI
- Robust crash logging, export, and analysis
- All diagnostic tools protected with try/catch and fallbacks

## Crash Detection & Recovery System
- **Global Crash Handler**: Catches all JS errors, promise rejections, and initialization failures
- **DataCrashDetector**: Catches data-related crashes, logs with timestamps
- **CrashMonitor Service**: Centralized crash history, pattern analysis, diagnostic info
- **Global Crash Recovery Screen**: UI for recovery, error details, and emergency actions
- **Auto-recovery**: After 3+ crashes, clears critical data and restarts

## Debugging Tools
- **Android Crash Logger**: Real-time crash status, export logs, clear history
- **APK Crash Diagnostics**: System health checks (AsyncStorage, memory, network, APIs)
- **Enhanced Android Debugger**: Platform info, memory usage, crash simulation
- **Quick Export Button**: Emergency crash report export
- **SafeAppLoader & AndroidSafeWrapper**: Ensures UI loads even if init fails

## Developer Mode

The app includes a Developer Mode that enables various debugging components to help diagnose Android crash and white screen issues.

### Activating Developer Mode
1. On the main app screen, locate any text element (like the wind status indicator)
2. Tap 5 times in rapid succession (similar to accessing developer options on Android)
3. A confirmation dialog will appear asking if you want to enable Developer Mode
4. After enabling, the Debug Settings UI will appear

### Debug Settings UI
The Debug Settings UI provides toggles for all available debugging tools:

| Setting | Function |
|---------|----------|
| Developer Mode | Master toggle for all debug features |
| Android Debugger | Simple debugging for common Android issues |
| Android Crash Logger | Logs and displays detailed crash information |
| APK Diagnostics | Runs comprehensive tests on the APK build |
| Enhanced Android Debugger | Advanced debugging with performance monitoring |
| Quick Export Button | Floating button for emergency crash data export |

Each component can be individually toggled for focused debugging.

### Accessing Debug Settings Later
- If Developer Mode is already enabled, use the same secret gesture (5 taps) to reopen the Debug Settings UI
- Settings persist across app restarts via AsyncStorage

## Enhanced Terminal Logging

The app now includes a comprehensive terminal logging system to make debugging Android crashes in the terminal easier:

### Features
- **Formatted Crash Logs**: All crashes are logged to the terminal in a well-structured, readable format
- **Anti-Truncation**: Logs are formatted to prevent truncation in the terminal
- **Global Helper Functions**: Access crash logs directly from the terminal

### Terminal Commands

When running in development mode, the following global commands are available in the terminal or Expo dev console:

```javascript
// Print all crash logs from all sources (won't be truncated)
printCrashLogs()

// Print just the most recent crash with full details
printLatestCrash()

// Print a summary of all crash statistics
printCrashSummary()

// Access the full terminal logger API
terminalLogger.printAllCrashLogs()
terminalLogger.printCrashSummary()
terminalLogger.printLatestCrash()
```

### UI Integration

The Android Crash Logger UI component now includes a "Print to Terminal" button that will output all crash logs to the terminal in a well-formatted way, avoiding truncation issues.

## Testing & Troubleshooting
- Build with fixes: see build instructions in README
- Install APK on device, enable unknown sources
- Watch for progressive recovery UI if white screen appears
- Use debug panels and export tools to collect crash data
- Use ADB logcat for detailed logs:
  ```bash
  adb logcat -c && adb logcat | grep -E "(Wind|Crash|Debug|Export|🔧|✅|❌)"
  ```
- If stuck, clear app data from Android settings

## Emergency Recovery Options
- **Force Reload**: Appears after 8s if stuck
- **Emergency Recovery**: Appears after 12s, clears data and restarts
- **Manual Clear Data**: Use Android settings > Apps > Storage > Clear Data
- **Fallback UI**: Always-available recovery interface

## Build & Installation
- Use provided scripts (see README and scripts/)
- For local debug: `npx expo run:android --variant debug`
- For production: use GitHub Actions workflow
- See [docs/LOCAL_BUILD_INSTRUCTIONS.md](./LOCAL_BUILD_INSTRUCTIONS.md) for details

## Console & ADB Commands
- Check crash history: `crashMonitor.getCrashHistory()`
- Get crash summary: `crashMonitor.getCrashSummary()`
- Export crash logs: use in-app export or console
- ADB logcat for device logs (see above)
- Print all logs: `printCrashLogs()` (in development mode)
- Print latest crash: `printLatestCrash()` (in development mode)

## Reporting Issues
When reporting, include:
- When/where the crash or white screen occurred
- Steps to reproduce
- Crash logs or exported report
- Device model and Android version
- Whether recovery options worked

---

For more details, see the README and IMPLEMENTATION_SUMMARY.md.
