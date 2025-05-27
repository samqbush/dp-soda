# APK Crash Troubleshooting Guide

This guide helps you debug and fix crashes that occur when your Wind Trend Analyzer app is installed as an APK on Android devices.

## 🔧 New Debugging Tools Added

### 1. Android Crash Logger
- **Location**: Top-right corner of the screen (red/orange/green circle)
- **Purpose**: Collects and displays crash information in production APKs
- **Features**:
  - Real-time crash detection
  - Crash history storage
  - Export crash logs for analysis
  - Build type detection (dev vs production)

### 2. APK Crash Diagnostics
- **Location**: Below the crash logger (blue circle with "Test")
- **Purpose**: Runs system tests to identify the root cause of crashes
- **Tests Include**:
  - AsyncStorage accessibility
  - Memory allocation
  - JSON processing
  - Network API availability
  - Platform APIs
  - React rendering capabilities

### 3. Production Crash Detector
- **Purpose**: Background service that automatically logs crashes and user actions
- **Features**:
  - Global error handling
  - User action tracking
  - Detailed crash context
  - Memory information

## 🚀 Building and Testing

### Build Debug APK with Crash Detection
```bash
./scripts/build-debug-apk.sh
```

This script:
1. Cleans previous builds
2. Installs dependencies
3. Runs TypeScript checks
4. Builds APK with enhanced debugging
5. Copies APK to project root with timestamp

### Manual Build (Alternative)
```bash
npm install
npx expo run:android --variant debug
```

## 📱 Installing and Testing on Device

1. **Transfer APK**: Copy the generated APK to your Android device
2. **Enable Unknown Sources**: In device settings, allow installation from unknown sources
3. **Install**: Tap the APK file to install
4. **Test**: Launch the app and observe for crashes

## 🔍 Debugging Crashed APKs

### If App Crashes Immediately:
1. **Reinstall the APK** (sometimes fixes permission issues)
2. **Look for debug buttons** in the top-right corner:
   - 🚨 Red/Orange circle = Crash Logger
   - 🔧 Blue circle = Diagnostics
3. **Tap the Crash Logger** to view crash history
4. **Run Diagnostics** to identify system issues

### If App Shows White Screen:
1. Wait 10-15 seconds for crash detection to activate
2. Look for debug UI elements in corners
3. Tap diagnostic tools if visible
4. Check if AsyncStorage is accessible

### Crash Logger Features:
- **View Crash History**: See all crashes with timestamps
- **Export Logs**: Share crash data for analysis
- **Clear Logs**: Reset crash history
- **Context Information**: See what the user was doing when crash occurred

### Diagnostic Tests:
- **AsyncStorage**: Tests data persistence
- **Memory**: Tests basic memory allocation
- **JSON Processing**: Tests data serialization
- **Network API**: Tests fetch availability
- **Platform APIs**: Tests React Native APIs
- **React Rendering**: Tests component rendering

## 🐛 Common APK Crash Causes and Solutions

### 1. AsyncStorage Issues
**Symptoms**: App crashes on data load/save
**Solution**: 
- Check if device has sufficient storage
- Verify app permissions
- Clear app data and reinstall

### 2. Memory Issues
**Symptoms**: App crashes after running for a while
**Solution**:
- Close other apps
- Restart device
- Check if device has sufficient RAM

### 3. Network/Fetch Issues
**Symptoms**: App crashes when fetching wind data
**Solution**:
- Ensure device has internet connection
- Check if fetch API is properly polyfilled
- Add network error handling

### 4. JSON Processing Issues
**Symptoms**: App crashes when processing data
**Solution**:
- Validate data format
- Add try/catch around JSON operations
- Check for circular references

### 5. React Native API Issues
**Symptoms**: App crashes on specific features
**Solution**:
- Check if all required permissions are granted
- Verify React Native version compatibility
- Test on different Android versions

## 📋 Crash Data Analysis

### Reading Crash Logs:
```json
{
  "timestamp": "2025-05-26T...",
  "error": "TypeError: Cannot read property...",
  "context": "wind_data_fetch",
  "buildType": "production",
  "userActions": ["app_started", "data_refresh", ...]
}
```

### Key Information:
- **timestamp**: When the crash occurred
- **error**: The actual error message
- **context**: What part of the app crashed
- **userActions**: What the user did before the crash
- **buildType**: Development vs production build

## 🔄 Recovery Strategies

### Automatic Recovery:
- App automatically detects frequent crashes
- Shows recovery UI after multiple crashes
- Offers to clear app data if needed

### Manual Recovery:
1. **Clear App Data**: Use "Clear All Data" button
2. **Reinstall App**: Uninstall and reinstall APK
3. **Restart Device**: Sometimes fixes system-level issues

## 📊 Monitoring and Prevention

### During Development:
- Always test on physical Android devices
- Use the debug build script for testing
- Monitor crash logs regularly
- Test on different Android versions

### For Users:
- Provide clear error messages
- Implement graceful degradation
- Add offline capabilities
- Include recovery mechanisms

## 🛠️ Advanced Debugging

### Enable Additional Logging:
```bash
# Build with enhanced debugging
REACT_NATIVE_ENABLE_LOGS=1 EXPO_DEBUG=1 npx expo run:android
```

### Android Logcat (if USB debugging available):
```bash
adb logcat | grep -E "(ReactNativeJS|ExponentAndroid)"
```

### Memory Profiling:
- Use Chrome DevTools (if remote debugging available)
- Monitor memory usage through diagnostic tools
- Check for memory leaks in long-running sessions

## 📞 Getting Help

If crashes persist after following this guide:

1. **Export crash logs** using the crash logger
2. **Run diagnostics** and note which tests fail
3. **Document steps to reproduce** the crash
4. **Include device information** (Android version, device model)
5. **Share crash data** with the development team

## 🔧 Development Tips

### Building Robust APKs:
- Always include error boundaries
- Add fallback UI for failed states
- Implement graceful error handling
- Test on various Android devices and versions
- Use the provided debugging tools during development

### Testing Checklist:
- [ ] App launches without crashes
- [ ] Data loads correctly
- [ ] Network requests work
- [ ] AsyncStorage operations succeed
- [ ] App handles offline scenarios
- [ ] App recovers from errors gracefully
- [ ] Crash logging tools are accessible
- [ ] Diagnostic tests pass
