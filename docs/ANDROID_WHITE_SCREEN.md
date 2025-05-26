# Android White Screen Troubleshooting Guide

This document contains specific instructions for addressing the "white screen" issues that can occur with React Native apps, particularly on Android devices.

## Common White Screen Causes

1. **Splash Screen Transition Issues**
   - The app fails to properly transition from the splash screen to the main app
   - Often caused by errors during initialization or the splash screen not being properly hidden

2. **AsyncStorage Initialization Problems**
   - AsyncStorage operations hang or fail, preventing the app from loading
   - Common in production builds where the app's working directory might have permissions issues

3. **Image Loading Failures**
   - Heavy images that cause memory issues during initial render
   - Missing image assets in the production build

4. **JavaScript Bundle Execution Errors**
   - Silent JS exceptions that prevent the app from rendering
   - Race conditions in initialization code

## Implemented Solutions

We've implemented several safeguards in this app to prevent white screens:

1. **Splash Screen Management**
   - Custom splash screen transition logic with timeouts
   - Forced splash screen dismissal after a safety period

2. **Safe Storage Initialization**
   - AsyncStorage operations have timeouts and fallbacks
   - App can continue even if storage initialization fails

3. **Component Safety**
   - SafeAppLoader component that ensures rendering even if initialization fails
   - AndroidSafeWrapper that can detect and recover from stuck renderings

4. **Image Handling**
   - SafeImage component with error boundaries for image loading
   - Fallback text when images fail to load

## If White Screen Still Occurs

If you still experience white screen issues despite these safeguards:

1. **Enable Developer Logs**
   - Connect the device via USB and run: `adb logcat *:E ReactNative:V ReactNativeJS:V`
   - Look for JavaScript exceptions or native crashes

2. **Clear App Data**
   - Go to Settings > Apps > Wind Trend Analyzer > Storage > Clear Data
   - This will reset any potentially corrupted AsyncStorage data

3. **Check Build Configuration**
   - Ensure the app has proper permissions set in the AndroidManifest.xml
   - Verify that Hermes is properly enabled/configured

4. **Improve Development/Production Parity**
   - Use the exact same React Native version for development and production
   - Test with the same bundle generation settings as production

## Emergency Recovery Features

The app includes several emergency recovery features:

1. **Auto-refresh** - The app will attempt to auto-refresh if it detects it's been stuck for too long
2. **Fallback Data** - Emergency wind data is included if API and cache access both fail
3. **Storage Reset** - The app can reset storage if it detects corruption
4. **Force Reload** - There's a hidden force reload mechanism for emergency recovery

## Production Build Recommendations

When generating new production builds:

1. Always increment the version code to avoid cache issues
2. Use the `--clean` flag when running `expo prebuild`
3. Set `enableProguardInReleaseBuilds=false` in gradle.properties if obfuscation is causing issues
4. Consider using Expo EAS builds instead of GitHub Actions for more reliable builds

## Testing New Builds

When testing a new build:

1. Uninstall any previous version of the app first
2. Test on multiple Android versions if possible
3. Test with different network conditions
4. Test the app's behavior when going to background and returning
