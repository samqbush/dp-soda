# Android Crash & White Screen Guide

This guide consolidates all documentation related to Android white screen issues, crash detection, debugging, and recovery for the Wind Trend Analyzer app. It replaces the following documents:
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

## Reporting Issues
When reporting, include:
- When/where the crash or white screen occurred
- Steps to reproduce
- Crash logs or exported report
- Device model and Android version
- Whether recovery options worked

---

For more details, see the README and IMPLEMENTATION_SUMMARY.md.
