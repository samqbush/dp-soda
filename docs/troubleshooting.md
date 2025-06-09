# Troubleshooting Guide

Comprehensive guide to diagnosing and fixing common issues in Dawn Patrol Alarm.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Android Issues](#android-issues)
3. [API and Data Issues](#api-and-data-issues)
4. [Build and Deployment Issues](#build-and-deployment-issues)
5. [Performance Issues](#performance-issues)
6. [Development Issues](#development-issues)
7. [Advanced Debugging](#advanced-debugging)

## Quick Diagnostics

### App Not Working Properly?

**Step 1: Basic Checks**
- ✅ Check internet connection
- ✅ Try manual refresh (pull down on main screen)
- ✅ Restart the app completely
- ✅ Check for app updates

**Step 2: Data Source Check**
Look for data source indicators:
- 🟢 **API** = Fresh data (good)
- 🟡 **Cache** = Recent data (okay)
- 🔴 **Mock** = Fallback data (check connectivity)

**Step 3: Error Messages**
- Screenshot any error messages
- Note when the error occurs
- Try reproducing the issue

## Android Issues

### White Screen Problems

**Symptoms**: App opens to blank white screen, no content visible

**Immediate Fixes**:
1. **Force close and restart** the app
2. **Clear app cache** in Android settings
3. **Restart your Android device**
4. **Reinstall the app** if problem persists

**Advanced Recovery**:
The app includes automatic white screen detection and recovery:
- Wait 10-15 seconds for automatic recovery
- Look for recovery dialog with options
- Try "Safe Mode" if available

### App Crashes

**Symptoms**: App closes unexpectedly, returns to home screen

**Built-in Crash Recovery**:
The app includes comprehensive crash protection:
- **Error Boundaries**: Catch component crashes
- **Safe Wrappers**: Protect risky operations
- **Global Recovery**: App-wide crash handling
- **State Restoration**: Restore previous state after crash

**User Actions**:
1. **Reopen the app** - crash recovery should activate
2. **Check for recovery dialog** with options
3. **Try "Safe Mode"** if repeated crashes occur
4. **Report persistent crashes** with details

### Android-Specific Features

**Debug Mode Access**:
- Secret gesture sequence activates debug tools
- Shows crash logs and system information
- Provides recovery options and diagnostics

**Export Crash Reports**:
- Debug mode allows exporting crash logs
- Helps developers diagnose persistent issues
- Include when reporting bugs

### Memory Issues

**Symptoms**: App becomes slow, unresponsive, or crashes after extended use

**Solutions**:
1. **Close other apps** to free memory
2. **Restart the device** periodically
3. **Update Android OS** if available
4. **Check available storage** (keep >1GB free)

### Android SDK Setup Without Android Studio

**Install Android Command Line Tools via Homebrew**:
```bash
# Install command line tools
brew install android-commandlinetools

# Set up environment variables
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"' >> ~/.zshrc

# Create SDK directory and reload environment
mkdir -p $HOME/Library/Android/sdk
source ~/.zshrc
```

**Install Required SDK Components**:
```bash
# Install essential Android SDK packages
$(brew --prefix)/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=$ANDROID_HOME \
  --install "cmdline-tools;latest" \
            "platforms;android-34" \
            "build-tools;34.0.0" \
            "platform-tools" \
            "emulator"

# For Apple Silicon Macs, install ARM64 system image
yes | $(brew --prefix)/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=$ANDROID_HOME \
  --install "system-images;android-34;google_apis;arm64-v8a"

# For Intel Macs, install x86_64 system image  
yes | $(brew --prefix)/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager \
  --sdk_root=$ANDROID_HOME \
  --install "system-images;android-34;google_apis;x86_64"
```

**Create and Start Android Emulator**:
```bash
# Create AVD (Android Virtual Device) - use ARM64 for Apple Silicon Macs
avdmanager create avd -n "DawnPatrol_Emulator" -k "system-images;android-34;google_apis;arm64-v8a"

# For Intel Macs, use x86_64 instead:
# avdmanager create avd -n "DawnPatrol_Emulator" -k "system-images;android-34;google_apis;x86_64"

# Start emulator
emulator -avd DawnPatrol_Emulator
```

**Verify Setup**:
```bash
# Check installed packages
sdkmanager --list_installed

# Check available emulators
emulator -list-avds
```

## API and Data Issues

### No Weather Data

**Symptoms**: "No data available" or stuck loading

**Causes and Solutions**:

**Internet Connectivity**:
- Check WiFi/cellular connection
- Try loading other apps that require internet
- Switch between WiFi and cellular data

**API Key Issues**:
- App works with fallback data if API keys missing
- For full functionality, ensure API keys are configured
- Check developer setup for API key configuration

**Server Issues**:
- OpenWeatherMap service may be temporarily down
- App automatically falls back to cached data
- Wait and try again later

### Inaccurate Predictions

**Symptoms**: Predictions don't match actual conditions

**Understanding Accuracy**:
- Check **confidence level** (High/Medium/Low)
- **Low confidence** predictions are less reliable
- Review **verification data** after dawn patrol hours

**Factors Affecting Accuracy**:
- **Local microclimates** may differ from regional data
- **Unusual weather patterns** reduce prediction reliability
- **Equipment limitations** at weather stations

**Improvement Tips**:
- Track **historical accuracy** over time
- Learn **personal thresholds** for your activities
- Use predictions as **guidance, not absolute truth**

### Data Source Problems

**"Mock Data" Warning**:
- Indicates all real data sources failed
- App still functional but using fallback data
- Check internet connection and try refreshing

**Outdated Information**:
- Data older than 1 hour shows warning
- Manual refresh usually resolves
- Check for persistent connectivity issues

## Build and Deployment Issues

### Development Server Won't Start

**Symptoms**: `npm start` fails or shows errors

**Common Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules
npm install

# Reset Expo cache
npx expo start --clear

# Check Node.js version (requires v18+)
node --version
```

### Environment Configuration

**API Keys Not Working**:
1. Check `.env` file exists and has correct format
2. Verify API key format (no quotes, spaces, or extra characters)
3. Restart development server after .env changes
4. Test API keys independently with curl/browser

**Build Failures**:
- Check GitHub Actions logs for specific errors
- Verify all required secrets are set in repository
- Ensure keystore and signing information is correct

### Linting Errors

**Symptoms**: `npm run lint` shows errors

**Common Issues**:
- **TypeScript errors**: Fix type annotations
- **Unused imports**: Remove or comment out
- **Formatting issues**: Run `npm run lint:fix`
- **Missing dependencies**: Ensure all imports are installed

## Performance Issues

### Slow Loading

**Symptoms**: App takes long time to load or respond

**Optimization Steps**:
1. **Close background apps** to free resources
2. **Restart the device** to clear memory
3. **Check storage space** (need adequate free space)
4. **Update the app** to latest version

**Network Optimization**:
- Use **strong WiFi connection** when possible
- **Cellular data** may be slower for initial loads
- **Background refresh** may help with subsequent launches

### Battery Drain

**Symptoms**: App uses excessive battery

**Power Management**:
- App designed for **minimal background activity**
- **Close app** when not needed for extended periods
- **Check location services** if enabled
- **Update device OS** for power optimizations

## Development Issues

### Code Changes Not Reflecting

**Hot Reload Issues**:
```bash
# Force reload
Press 'r' in terminal where npm start is running

# Clear cache and restart
npx expo start --clear

# Hard refresh
CMD+R (iOS) or Shake device + reload (Android)
```

### TypeScript Errors

**Common Issues**:
- **Missing type definitions**: Install @types packages
- **Import path errors**: Check file paths and extensions
- **API response types**: Verify interface definitions match actual data

### Component Errors

**React Component Issues**:
- **Hook dependency warnings**: Check useEffect dependencies
- **State update errors**: Ensure state updates are immutable
- **Key prop warnings**: Add unique keys to list items

## Advanced Debugging

### Debug Mode Features

**Accessing Debug Mode**:
- Specific gesture sequence activates debug features
- Shows detailed system information
- Provides crash logs and diagnostics
- Enables advanced recovery options

**Debug Information Available**:
- **API response details** and timing
- **Cache hit/miss ratios**
- **Memory usage statistics**
- **Component render counts**
- **Error stack traces**

### Logging and Monitoring

**Developer Tools**:
```bash
# React Native debugging
npx react-devtools

# Network request monitoring
# Available in browser dev tools during web debugging

# Android device logs
adb logcat | grep -i dawn
```

### Crash Report Analysis

**Information to Collect**:
- **Exact steps to reproduce** the issue
- **Device information** (model, Android version)
- **App version** and build number
- **Error messages or screenshots**
- **Crash logs** if available through debug mode

### Performance Profiling

**React DevTools Profiler**:
- Identify slow-rendering components
- Analyze re-render patterns
- Optimize component performance

**Memory Profiling**:
- Monitor memory usage patterns
- Identify potential memory leaks
- Optimize asset loading

## Getting Additional Help

### Reporting Issues

**Before Reporting**:
1. Try all relevant troubleshooting steps
2. Collect debug information and screenshots
3. Note device details and app version
4. Check if issue is reproducible

**Information to Include**:
- **Device**: Model and Android/iOS version
- **App Version**: Found in app settings or about screen
- **Steps to Reproduce**: Exact sequence that causes issue
- **Expected vs Actual**: What should happen vs what actually happens
- **Screenshots/Videos**: Visual evidence of the problem
- **Crash Logs**: If available through debug mode

### Community Resources

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Check other guides in docs/ directory
- **Developer Setup**: See developer-setup.md for development environment

### Emergency Recovery

**App Completely Broken**:
1. **Uninstall and reinstall** the app
2. **Restart device** to clear any system-level issues
3. **Check for device software updates**
4. **Try on different device** to isolate device-specific issues

**Data Recovery**:
- **Settings and preferences** may be lost on reinstall
- **Prediction history** is stored locally and may be lost
- **API configuration** will need to be reconfigured

This troubleshooting guide covers most common issues users and developers encounter. For persistent problems not covered here, collect the information described above and report the issue through appropriate channels.
