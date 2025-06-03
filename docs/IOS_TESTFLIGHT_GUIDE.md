# iOS TestFlight Distribution Guide

This document explains how to build your Dawn Patrol Alarm app for iOS and automatically distribute it via TestFlight using the paid Apple Developer Program.

## Overview

The iOS build workflow (`ios-testflight.yml`) automates:
- Building the iOS app locally on GitHub's macOS runners using Expo prebuild and Xcode
- Creating App Store distribution IPA files
- Automatically uploading to TestFlight for beta testing
- Using paid Apple Developer Program ($99/year)

## What You Get with TestFlight Distribution

✅ **TestFlight Access**: Easy sharing with up to 10,000 beta testers  
✅ **No Expiration**: Apps don't expire after 7 days  
✅ **Easy Installation**: Simple TestFlight app installation  
✅ **Automatic Updates**: Push new versions directly to testers  
✅ **Professional Distribution**: Full App Store capabilities  
✅ **Push Notifications**: Complete notification support

## Setup Instructions

### Prerequisites

#### 1. Paid Apple Developer Program
- Enroll at [developer.apple.com](https://developer.apple.com) ($99/year)
- Complete the enrollment process and payment
- Access to App Store Connect and TestFlight

#### 2. App Store Connect Setup
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to "Apps" > "+" button to create a new app:
   - Select platforms (iOS)
   - Enter app name (e.g., "Dawn Patrol Alarm")
   - Select your primary language
   - Enter bundle ID (must match the App ID you'll create in step 4)
   - Enter SKU (unique identifier for your records, e.g., "dawnpatrol-001")
   - Select access (Full Access)
3. Click "Create" and your app listing will be created in App Store Connect

#### 3. Required GitHub Secrets

You will need to set up several GitHub secrets for the workflow. See the reference table at the end of this guide for details on each required secret.

> **Note**: For the `KEYCHAIN_PASSWORD` secret, you can create any secure password. This isn't an existing password - it's just used by the GitHub Actions workflow to create a temporary keychain for code signing during the build process.

#### 4. Creating an App ID with Capabilities
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to Certificates, Identifiers & Profiles > Identifiers
3. Click the "+" button to register a new identifier
4. Select "App IDs" and click "Continue"
5. Select "App" as the type and click "Continue"
6. Enter a description (e.g., "Dawn Patrol Alarm App")
7. Enter a Bundle ID, typically in reverse-domain format (e.g., `com.samqbush.dpsoda`)
   - Note: This Bundle ID must match the one in your Expo app.json/app.config.js
8. Under Capabilities, select the ones your app needs:
   - **Push Notifications**: Required for alarm notifications
   - **Background Modes**: Required for alarms and background processing
   - **Data Protection**: Recommended for user data security
   - **App Groups**: If needed for sharing data between extensions
   - Add other capabilities based on your app's specific features
9. Click "Continue" and then "Register" to create your App ID

> **Important:** Make sure your bundle identifier matches between:
> - This App ID in Apple Developer Portal
> - Your app.json or app.config.js file in your Expo project
> - The App Store Connect listing you will create later

#### 5. Setting Up Distribution Certificate
1. Open Keychain Access on your Mac
   - Make sure "login" is selected in the left sidebar under "Keychains"
2. From the menu, select Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority
3. Enter your email and name
4. Select "Save to disk" (not "Request is:" option)
5. Click Continue and save the .certSigningRequest file to your desktop
6. Go to [Apple Developer Portal](https://developer.apple.com/account/) > Certificates > Create new **iOS Distribution** certificate
7. Select "App Store and Ad Hoc" option and click Continue
8. Upload the .certSigningRequest file you saved in step 5
9. Click Continue and then Download the certificate (.cer file)
10. Double-click the downloaded .cer file to install it
    - **IMPORTANT**: Make sure it installs to your "login" keychain, not "System Roots"
    - If prompted for a destination, explicitly select "login" keychain
11. In Keychain Access:
    - Select "login" keychain on the left
    - Select "Certificates" category
    - Find your certificate (should be named "iPhone Distribution: Your Name")
    - **Important**: Note the EXACT name of the certificate (e.g., "iPhone Distribution: John Doe (ABC123XYZ)") - you'll need this for the `IOS_DIST_CODE_SIGN_IDENTITY` GitHub secret
    - Right-click > Export
12. Export as .p12 format:
    - Set a strong password when prompted (you'll need this password later)
    - Save the file as "dist-certificate.p12"
13. Convert to base64 using Terminal:
    ```bash
    base64 -i dist-certificate.p12 | pbcopy
    ```
14. Paste the result as `IOS_DIST_CERTIFICATE_P12_BASE64` in your GitHub secrets
15. Add the certificate password you created as `IOS_DIST_CERTIFICATE_PASSWORD` in GitHub secrets

#### 6. Setting Up App Store Provisioning Profile
1. Go to Apple Developer > Profiles > Distribution
2. Click the "+" button to create a new profile
3. Select "App Store" as the distribution method and click "Continue"
4. Select your App ID from the dropdown menu and click "Continue"
5. Select the distribution certificate you created earlier and click "Continue"
6. Enter a profile name (e.g., "Dawn Patrol App Store Profile")
7. Click "Generate" to create the provisioning profile
8. Download the .mobileprovision file
9. Convert to base64: `base64 -i appstore-profile.mobileprovision | pbcopy`
10. Paste the result as `IOS_DIST_PROVISIONING_PROFILE_BASE64`

#### 7. Setting Up App Store Connect API Key
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to Users and Access > Integrations > API Keys
3. Click the "+" button to create a new key
4. Give it a name (e.g., "GitHub Actions")
5. Under Access, select the appropriate role (Admin for full access, or App Manager)
6. Click "Generate" 
7. **Important**: Note the Key ID (`ASC_KEY_ID`) - you won't be able to see it again
8. Note the Issuer ID (`ASC_ISSUER_ID`) from the top of the API Keys page
9. Download the .p8 key file (you only get one chance to download it)
10. Convert the .p8 file to base64 using Terminal:
    ```bash
    base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
    ```
11. Paste the base64 result as `ASC_PRIVATE_KEY` in your GitHub secrets

#### 8. App-Specific Password
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to Sign-In and Security > App-Specific Passwords
4. Click "+" or "Generate Password"
5. Give your password a name (e.g., "GitHub TestFlight Upload")
6. Note the generated password (it will only be shown once)
7. Use this password as `APPLE_APP_PASSWORD` in your GitHub secrets
### Local Development Setup
For local development, you'll still need Expo CLI:
```bash
npm install @expo/cli
npx expo login
```

## How to Use

### Automatic Builds
The workflow triggers automatically on:
- Pull requests to `ios` branch
- Manual workflow dispatch

### Manual Builds
1. Go to your repository on GitHub
2. Click "Actions" tab
3. Select "Build iOS Development App"
4. Click "Run workflow"
5. Click "Run workflow" to start the build

## Workflow Steps

1. **Environment Setup**: Sets up Node.js, Xcode, and installs dependencies
2. **Code Quality**: Runs linting and TypeScript checks
3. **Project Generation**: Uses Expo prebuild to create native iOS project
4. **Signing Setup**: Configures iOS distribution certificates and provisioning profiles
5. **Build & Archive**: Uses Xcode to build and archive the app
6. **IPA Export**: Exports the archive as an App Store distribution IPA file
7. **TestFlight Upload**: Automatically uploads to TestFlight for beta testing
8. **Artifact Upload**: Saves IPA file as GitHub artifact for download

## Build Artifacts

After a successful build, you'll find:
- **App Store IPA file**: Automatically uploaded to TestFlight
- **GitHub Artifact**: Backup IPA file available for download

## Installing via TestFlight

### For Beta Testers
1. Install the TestFlight app from the App Store
2. Receive an invitation email or link from the developer
3. Tap the invitation link or enter the code in TestFlight
4. Install the app directly from TestFlight
5. Receive automatic updates when new versions are released

### Managing Beta Testing
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app > TestFlight
3. Add internal testers (up to 100 team members)
4. Add external testers (up to 10,000 public beta testers)
5. Manage build distribution and feedback

### Method 1: Using TestFlight (Recommended)
When using the paid Apple Developer Program with TestFlight:
1. Wait for the GitHub Action workflow to finish uploading to TestFlight
2. Sign in to App Store Connect > TestFlight to verify build is processing
3. Once processed, add testers or create public links
4. Testers install TestFlight app from App Store and accept invitations

### Method 2: Using Xcode (For Development Builds)
For manual installation of development builds:
1. Download the IPA artifact from the GitHub Actions run
2. Connect your iPhone/iPad to your Mac
3. Open Xcode
4. Go to Window > Devices and Simulators
5. Select your device
6. Drag the IPA file to the "Installed Apps" section
7. The app will install directly to your device

### Method 3: Using AltStore (Auto-renewal for Development)
AltStore automatically refreshes development apps every 7 days when on the same WiFi network:

1. Install AltStore on your computer from [altstore.io](https://altstore.io)
2. Install AltStore app on your iPhone via the desktop app
3. Add the IPA file to AltStore
4. AltStore will automatically refresh the app before it expires

### Method 4: Manual Reinstallation
- Download and install the IPA every 7 days when it expires
- Set a calendar reminder to reinstall weekly

## Important Limitations

⚠️ **7-Day Expiration**: Development builds expire after 7 days and must be reinstalled  
⚠️ **Device Registration**: Only works on devices registered in your Apple Developer account  
⚠️ **No Distribution**: Cannot share with others  
⚠️ **3-App Limit**: Maximum 3 apps can be installed simultaneously with free account

## Troubleshooting

### Common Issues

**Build fails with authentication error:**
- Verify `EXPO_TOKEN` is correctly set
- Check that your Expo account has access to the project

**Code signing issues:**
- Verify all iOS distribution certificate and provisioning profile secrets are correctly configured
- Ensure your certificate hasn't expired
- Check that the provisioning profile matches your app's bundle identifier
- Verify the certificate and provisioning profile are for App Store distribution
- Ensure your Apple Developer Program membership is active

**TestFlight upload failures:**
- Verify App Store Connect API credentials (`ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`)
- Check that the API key has the correct permissions
- Ensure your app exists in App Store Connect
- Verify the bundle identifier matches between your app and App Store Connect

**Xcode build failures:**
- Check that your app.json configuration matches your provisioning profile
- Ensure bundle identifier in app.json matches the one in your provisioning profile
- Verify iOS deployment target is supported
- Make sure your Apple Developer Program membership includes distribution rights

### Getting Help

1. Check the GitHub Actions logs for detailed error messages
2. Visit [Expo documentation](https://docs.expo.dev/build-reference/local-builds/) for local build issues
3. Check [Apple Developer documentation](https://developer.apple.com/testflight/) for TestFlight issues
4. For code signing issues, refer to [Apple's Code Signing Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/CodeSigningGuide/)
5. Review [App Store Connect documentation](https://developer.apple.com/app-store-connect/) for distribution issues

## Cost Considerations

- **Apple Developer Program**: $99/year for full access to distribution features
- **GitHub Actions**: Building locally on GitHub Actions runners is free within GitHub's usage limits
- **No EAS Build costs**: Using local builds instead of Expo's cloud building service
- **TestFlight**: Included free with Apple Developer Program membership

## Security Notes

- All Apple credentials and certificates are stored as encrypted GitHub secrets
- Certificates and provisioning profiles are automatically cleaned up after each build
- Temporary keychains are created and destroyed for each build
  - `KEYCHAIN_PASSWORD` is used to secure this temporary keychain during the build process
  - This is not an existing password - just create a secure string for GitHub Actions to use
- App Store Connect API keys are used securely for TestFlight uploads
- Never commit certificates, provisioning profiles, or passwords to your repository

---

## Alternative: Free Development Distribution

If you prefer not to pay the $99/year for the Apple Developer Program, you can use free development certificates for personal use only. This approach has limitations:

- ⚠️ Apps expire after 7 days and need reinstallation
- ⚠️ Maximum 3 apps at a time on device  
- ⚠️ Cannot distribute to others
- ⚠️ No TestFlight access
- ⚠️ Manual installation via Xcode or AltStore required

To use the free approach, you would need to:
1. Use development certificates instead of distribution certificates
2. Create development provisioning profiles instead of App Store profiles
3. Remove TestFlight upload steps from the workflow
4. Use manual installation methods

## Next Steps After Setup

1. Test the workflow with a manual run
2. Verify the build completes successfully and uploads to TestFlight
3. Invite beta testers through App Store Connect
4. Set up your development workflow with automated TestFlight distribution
5. Monitor feedback and crash reports through App Store Connect

---

## Reference: Required GitHub Secrets

Set up these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXPO_TOKEN` | Expo authentication token | Run `npx expo login` then `npx expo whoami --auth` |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Found in Apple Developer Account > Membership |
| `KEYCHAIN_PASSWORD` | Password for temporary keychain | Create any secure password (e.g., `build123`) - this is only used during the build process |
| `IOS_DIST_CERTIFICATE_P12_BASE64` | Base64 encoded distribution .p12 certificate | Export from Keychain Access |
| `IOS_DIST_CERTIFICATE_PASSWORD` | Password for .p12 certificate | Password used when exporting certificate |
| `IOS_DIST_PROVISIONING_PROFILE_BASE64` | Base64 encoded App Store provisioning profile | Download from Apple Developer |
| `IOS_DIST_CODE_SIGN_IDENTITY` | Code signing identity name | Should be exactly "iPhone Distribution: Your Name (TEAM_ID)" - find the exact name in Keychain Access under your certificate |
| `APPLE_ID` | Your Apple ID email | Apple ID used for App Store Connect |
| `APPLE_APP_PASSWORD` | App-specific password | Generate in Apple ID settings |
| `ASC_KEY_ID` | App Store Connect API key ID | Create in App Store Connect > Users and Access > Integrations > API Keys |
| `ASC_ISSUER_ID` | App Store Connect API issuer ID | Found in App Store Connect > Users and Access > Integrations > API Keys |
| `ASC_PRIVATE_KEY` | App Store Connect API private key | Download when creating API key (base64 encoded) |
