# Managing Build Logs

This guide explains how to manage and analyze large build logs in the Dawn Patrol Alarm project.

## The Problem

iOS and Android build logs can become extremely large, making it difficult to identify errors and issues quickly. The default verbosity of build tools like `xcodebuild` can produce logs that are several hundred MB in size.

## Solutions

### 1. Reduce Log Verbosity

The primary cause of large logs is the `-verbose` flag in `xcodebuild` commands. We've removed this flag from our workflow files to reduce log size significantly.

**Before:**
```yaml
xcodebuild archive -workspace "MyApp.xcworkspace" -verbose
```

**After:**
```yaml
xcodebuild archive -workspace "MyApp.xcworkspace"
```

### 2. Use Log Analysis Tools

We've included several tools to help extract meaningful information from build logs:

#### Extract Build Errors

The `extract-build-errors.sh` script quickly identifies errors in build logs:

```bash
# Extract errors from a build log
./scripts/extract-build-errors.sh path/to/build.log errors.txt

# Print errors to console
./scripts/extract-build-errors.sh path/to/build.log

# Get just the statistics
./scripts/extract-build-errors.sh path/to/build.log --stats
```

#### Analyze Build Logs

For more detailed analysis, use the `analyze-build-logs.mjs` script:

```bash
# Analyze a build log
node scripts/analyze-build-logs.mjs path/to/build.log

# Specify log type and output format
node scripts/analyze-build-logs.mjs path/to/build.log --type=ios --format=json --output=analysis.json
```

#### Process Xcode Logs

The `xcode-log-processor.sh` script is specifically for Xcode build logs:

```bash
# Process an Xcode build log
./scripts/xcode-log-processor.sh path/to/xcodebuild.log
```

## Common Issues and Solutions

### 1. React Native Screens Compatibility Issues

If you see errors in `RNSScreenStackHeaderConfig.mm`, check the compatibility between React Native and react-native-screens:

```bash
# Check current versions
npm list react-native react-native-screens
```

For React Native 0.79.x, use react-native-screens ~4.7.0.

### 2. Bundle Identifier Format Issues

If you see "Invalid format" errors related to bundle identifiers, run:

```bash
node scripts/check-bundle-identifier.mjs
```

### 3. Code Signing Issues

For code signing errors, the extract-build-errors.sh script will highlight these and provide recommendations.

## Best Practices

1. **Don't use verbose flags** in build commands unless absolutely necessary
2. **Use the analysis tools** to extract meaningful information from large logs
3. **Save processed logs** rather than full build logs when reporting issues
4. **Check specific error patterns** that are common in React Native/Expo builds

## Further Reading

- [iOS Build Troubleshooting Guide](./feature_guides/IOS_BUILD_TROUBLESHOOTING.md)
- [Android Crash & White Screen Guide](./feature_guides/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md)
