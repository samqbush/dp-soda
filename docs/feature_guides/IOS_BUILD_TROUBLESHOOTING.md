# iOS Build Troubleshooting Guide

This document provides solutions for common iOS build issues in the Dawn Patrol Alarm app.

## Common Build Issues

### 1. React Native Screens Compatibility Issues

If you encounter build failures related to `RNSScreenStackHeaderConfig.mm`, it is likely a compatibility issue between `react-native-screens` and your React Native version.

**Solution:**
- For React Native 0.79.x, use react-native-screens version ~4.7.0
- For React Native 0.78.x, use react-native-screens version ~4.6.0

### 2. Bundle Identifier Format Issues

The iOS build may fail with errors like `Invalid format 'com.samqbush.dpsoda"'` if there are issues with the bundle identifier format.

**Solution:**
- Ensure the bundle identifier in app.config.js is a simple string without template literals or concatenation
- Run the bundle identifier validation script before builds:
  ```
  node ./scripts/check-bundle-identifier.mjs
  ```

### 3. Code Signing Issues

If the build fails during code signing:

**Solution:**
- Verify that the provisioning profile matches the bundle identifier
- Check that the team ID matches your Apple Developer account
- Ensure your certificates are valid and not expired

## Debugging Tools

- Use the bundle identifier validation script:
  ```
  node ./scripts/check-bundle-identifier.mjs
  ```
- Check your current React Native and dependency versions:
  ```
  npm list react-native react-native-screens
  ```

## GitHub Actions Workflow

Our GitHub Actions workflow for iOS builds includes these safeguards:
- Bundle identifier validation step
- Dependency version checks
- Detailed error reporting

If you modify any dependencies, always test locally before pushing to prevent CI/CD failures.
