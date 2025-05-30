# Local Android Build with GitHub Actions

This document outlines the steps to configure GitHub Actions for building Android App Bundle (AAB) files locally, instead of using Expo EAS build services.

## Why Build Locally?

- More control over the build process
- No need for Expo's build servers
- Potential cost savings for teams with EAS paid plans
- Ability to customize the build environment

## GitHub Actions Workflow

Use [build.yml](../.github/workflows/build.yml) with this workflow when you're ready to implement local builds:


## Prerequisites

Before implementing this workflow, you'll need to prepare:

1. **Android Keystore**: You must have a keystore file for signing your Android app. 
   - If you don't have one, create it with:
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -alias upload-key -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **GitHub Secrets**: Add these secrets to your GitHub repository:
   - `KEYSTORE_BASE64`: Your Android keystore encoded as base64
   - `KEY_ALIAS`: The key alias in your keystore
   - `STORE_PASSWORD`: The keystore password (set when you created the keystore)
   - `KEY_PASSWORD`: The key password (if you were not prompted, this is the same as your keystore password)
   - Keep `EXPO_TOKEN` from your current setup

3. **Encode Your Keystore**: After generating your keystore, encode it to base64:
   ```bash
   base64 -i upload-keystore.jks | pbcopy  # On macOS (copies to clipboard)
   # OR
   base64 -i upload-keystore.jks > keystore-base64.txt  # Saves to file
   ```

## Implementation Steps

When you're ready to switch to local builds:

1. Add all required secrets to your GitHub repository settings
2. Replace the current workflow file with the one above
3. Commit and push the changes
4. Trigger the workflow manually using the "workflow_dispatch" event in GitHub Actions

## Notes

- The first build will take longer as it needs to download all Android SDK components
- Keep your keystore file secure; losing it will prevent you from updating your app on the Play Store
- You may need to adjust Gradle settings based on your specific app requirements
- The AAB file will be available as an artifact in the GitHub Actions run

## Local Debug Instructions
```shell
# install new apk
adb install ~/Downloads/app-release-universal.apk

# clear the logs
adb logcat -c
# Launch the app and let it crash
adb logcat -s "ReactNative:*" "ReactNativeJS:*" "AndroidRuntime:*" "System.err:*" "com.samqbush.dpsoda:*" "*:F" "*:E" | tee crash-logs-filtered.log
```
