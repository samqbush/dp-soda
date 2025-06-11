# Deployment Guide

Complete guide for building, deploying, and releasing the Dawn Patrol Alarm application.

## Table of Contents

1. [Build Process Overview](#build-process-overview)
2. [GitHub Actions Workflow](#github-actions-workflow)
3. [Environment Setup](#environment-setup)
4. [Release Process](#release-process)
5. [iOS TestFlight](#ios-testflight)
6. [Android APK Distribution](#android-apk-distribution)
7. [Troubleshooting](#troubleshooting)

## Build Process Overview

### Build Strategy

**Dawn Patrol Alarm uses GitHub Actions for all production builds**:
- ✅ **No local build setup required**
- ✅ **Consistent build environment**
- ✅ **Automated Android optimizations**
- ✅ **Integrated testing and validation**
- ✅ **Automatic version management**

### Supported Platforms

- **Android**: APK and AAB (Android App Bundle) builds
- **iOS**: IPA builds for TestFlight distribution
- **Development**: Expo development builds for testing

## GitHub Actions Workflow

### Workflow Files

**Primary Build Workflow**: `.github/workflows/build.yml`
- Triggered on push to main branch or manual dispatch
- Builds both Android and iOS versions
- Includes Android white screen fixes and optimizations
- Uploads artifacts for distribution

### Workflow Features

1. **Environment Setup**:
   - Node.js and Expo CLI installation
   - Android SDK and build tools
   - iOS build environment (when needed)

2. **Dependency Management**:
   - NPM dependency installation
   - Cache optimization for faster builds

3. **Code Quality**:
   - ESLint checking
   - TypeScript compilation validation
   - Test execution

4. **Build Process**:
   - Version increment (patch level)
   - Android-specific optimizations
   - Platform-specific configurations
   - Artifact generation

5. **Distribution**:
   - APK/AAB file generation
   - TestFlight upload (iOS)
   - GitHub release creation

### Triggering Builds

**Automatic Triggers**:
- Push to `main` branch
- Pull request merge to main

**Manual Triggers**:
- GitHub Actions "Run workflow" button
- Repository dispatch events

## Environment Setup

### GitHub Repository Secrets

Required secrets for the build process:

**Android Signing**:
```
ANDROID_KEYSTORE_BASE64    # Base64 encoded keystore file
ANDROID_KEY_ALIAS          # Key alias for signing
ANDROID_KEY_PASSWORD       # Key password
ANDROID_KEYSTORE_PASSWORD  # Keystore password
```

**API Keys**:
```
OPENWEATHER_API_KEY        # OpenWeatherMap API key
ECOWITT_APPLICATION_KEY    # Ecowitt app key (optional)
ECOWITT_API_KEY           # Ecowitt API key (optional)
```

**iOS Distribution** (if using):
```
APPLE_ID                   # Apple Developer account ID
APPLE_PASSWORD            # App-specific password
APPLE_TEAM_ID             # Developer team ID
```

### Setting Up Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each required secret with the exact name and value
4. Verify secrets are properly masked in workflow logs

### Keystore Generation

**For new projects, generate Android keystore**:
```bash
keytool -genkey -v -keystore dawn-patrol.keystore -alias dawn-patrol -keyalg RSA -keysize 2048 -validity 10000
```

**Convert to base64 for GitHub secret**:
```bash
base64 dawn-patrol.keystore | tr -d '\n'
```

## Release Process

### Version Management

**Automatic Versioning**:
- Patch version incremented on each build
- Version follows semantic versioning (MAJOR.MINOR.PATCH)
- Git tags created for each release

**Manual Version Updates**:
```bash
# Update version in app.config.js
npm version patch  # or minor/major

# Commit version bump
git add .
git commit -m "Bump version to X.X.X"
git push
```

### Release Steps

1. **Prepare Release**:
   - Ensure all features are complete and tested
   - Update documentation if needed
   - Verify environment variables and secrets

2. **Trigger Build**:
   - Push to main branch OR
   - Manually trigger GitHub Actions workflow

3. **Monitor Build**:
   - Watch GitHub Actions progress
   - Check for build errors or warnings
   - Verify artifacts are generated

4. **Distribute**:
   - Download APK from GitHub Actions artifacts
   - Upload to distribution channels (TestFlight, etc.)
   - Create GitHub release with release notes

### Build Artifacts

**Generated Files**:
- `dawn-patrol-vX.X.X.apk` - Android application package
- `dawn-patrol-vX.X.X.aab` - Android App Bundle (for Play Store)
- Build logs and reports

**Artifact Retention**:
- GitHub Actions artifacts retained for 90 days
- Important releases should be saved to GitHub Releases

## iOS TestFlight

### Setup Process

1. **Apple Developer Account**:
   - Enrolled Apple Developer Program account
   - App Store Connect access
   - Certificates and provisioning profiles

2. **App Store Connect Configuration**:
   - Create app record in App Store Connect
   - Configure app information and metadata
   - Set up TestFlight testing groups

3. **Automated Upload**:
   - iOS builds automatically uploaded to TestFlight
   - Beta testers notified of new builds
   - Crash reports and analytics available

### TestFlight Distribution

**Internal Testing**:
- Up to 100 internal testers
- Immediate access to new builds
- No review process required

**External Testing**:
- Up to 10,000 external testers
- Beta App Review required
- Public link distribution possible

### Testing Guidelines

**Pre-TestFlight Checklist**:
- Test on physical iOS devices
- Verify API integrations work
- Check crash reporting functionality
- Validate user interface on different screen sizes

## Android APK Distribution

### Distribution Channels

**GitHub Releases**:
- Primary distribution method
- Versioned releases with changelog
- Direct APK download links

**Direct Distribution**:
- APK files shared directly with testers
- Install via file manager or ADB
- Requires "Unknown Sources" permission

**Google Play Store** (future consideration):
- AAB files required for Play Store
- Review process and content policies
- Broader distribution reach

### Installation Instructions

**For Testers**:
1. Download APK from GitHub release
2. Enable "Install unknown apps" in Android settings
3. Open APK file and install
4. Grant necessary permissions

**Via ADB**:
```bash
# Install APK via ADB
adb install path/to/dawn-patrol-vX.X.X.apk

# Check logs for debugging
adb logcat | grep DawnPatrol
```

## Troubleshooting

### Common Build Issues

**"Invalid keystore" Error**:
- Verify keystore base64 encoding is correct
- Check key alias and password secrets
- Ensure keystore file is valid

**"API key missing" Warning**:
- Non-critical for builds (app uses fallback data)
- Add API keys to secrets for full functionality
- Check secret names match exactly

**"Version conflict" Error**:
- Manual version bump may be needed
- Check for uncommitted version changes
- Verify version format in app.config.js

### Build Performance

**Optimization Tips**:
- Use dependency caching in workflows
- Parallelize build steps where possible
- Clean up old artifacts regularly

**Monitoring Build Times**:
- Typical build time: 10-15 minutes
- Android builds generally faster than iOS
- Network connectivity affects dependency installation

### Debug Information

**Build Logs Include**:
- Dependency installation details
- Code quality check results
- Build process outputs
- Error stack traces and debugging info

**Local Testing**:
```bash
# Test locally before pushing
npm run lint
npm run test
npm run build:android  # if available
```

### Environment Debugging

**Verify Environment Setup**:
```bash
# Check environment variables
npm run debug-env

# Validate API keys
npm run validate-keys

# Test API connectivity
npm run test-apis
```

**Common Environment Issues**:
- Missing or incorrect API keys
- Outdated Node.js or Expo CLI versions
- Network connectivity problems
- Insufficient permissions for keystore access

This deployment guide ensures consistent, reliable builds while maintaining security and automation best practices.
