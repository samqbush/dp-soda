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
2. Create your app listing (if not already created)
3. Note your App ID for configuration

#### 3. Required GitHub Secrets

Set up these secrets in your GitHub repository (Settings > Secrets and variables > Actions):

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `EXPO_TOKEN` | Expo authentication token | Run `npx expo login` then `npx expo whoami --auth` |
| `APPLE_TEAM_ID` | Apple Developer Team ID | Found in Apple Developer Account > Membership |
| `KEYCHAIN_PASSWORD` | Password for temporary keychain | Any secure password (e.g., `build123`) |
| `IOS_DIST_CERTIFICATE_P12_BASE64` | Base64 encoded distribution .p12 certificate | Export from Keychain Access |
| `IOS_DIST_CERTIFICATE_PASSWORD` | Password for .p12 certificate | Password used when exporting certificate |
| `IOS_DIST_PROVISIONING_PROFILE_BASE64` | Base64 encoded App Store provisioning profile | Download from Apple Developer |
| `IOS_DIST_CODE_SIGN_IDENTITY` | Code signing identity name | Usually "iPhone Distribution: Your Name" |
| `APPLE_ID` | Your Apple ID email | Apple ID used for App Store Connect |
| `APPLE_APP_PASSWORD` | App-specific password | Generate in Apple ID settings |
| `ASC_KEY_ID` | App Store Connect API key ID | Create in App Store Connect > Users and Access > Keys |
| `ASC_ISSUER_ID` | App Store Connect API issuer ID | Found in App Store Connect > Users and Access > Keys |
| `ASC_PRIVATE_KEY` | App Store Connect API private key | Download when creating API key (base64 encoded) |

#### 4. Setting Up Distribution Certificate
1. Open Keychain Access on your Mac
2. Go to Certificate Assistant > Request a Certificate From a Certificate Authority
3. Enter your email and name, save to disk
4. Go to Apple Developer > Certificates > Create new **iOS Distribution** certificate
5. Upload the certificate request file
6. Download the certificate and double-click to install in Keychain
7. In Keychain Access, find your certificate, right-click > Export
8. Export as .p12 format with a password
9. Convert to base64: `base64 -i dist-certificate.p12 | pbcopy`
10. Paste the result as `IOS_DIST_CERTIFICATE_P12_BASE64`

#### 5. Setting Up App Store Provisioning Profile
1. Go to Apple Developer > Identifiers > Create App ID (if not exists)
2. Go to Apple Developer > Profiles > Create new **App Store** provisioning profile
3. Select your app ID and distribution certificate
4. Download the .mobileprovision file
5. Convert to base64: `base64 -i appstore-profile.mobileprovision | pbcopy`
6. Paste the result as `IOS_DIST_PROVISIONING_PROFILE_BASE64`

#### 6. Setting Up App Store Connect API Key
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Go to Users and Access > Keys
3. Click "+" to create a new key
4. Give it a name (e.g., "GitHub Actions")
5. Select "Developer" role
6. Click "Generate"
7. Note the Key ID (`ASC_KEY_ID`) and Issuer ID (`ASC_ISSUER_ID`)
8. Download the .p8 key file
9. Convert to base64: `base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy`
10. Paste the result as `ASC_PRIVATE_KEY`

#### 7. App-Specific Password
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Go to Security > App-Specific Passwords
4. Click "+" to generate a new password
5. Use this as `APPLE_APP_PASSWORD`
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

## Manually Uploading IPA to TestFlight

If you already have an IPA file (either from a local build or downloaded from GitHub artifacts) and need to manually upload it to TestFlight, follow these steps:

### Prerequisites
- Active Apple Developer Program membership ($99/year)
- App already created in App Store Connect
- App Store Connect API key credentials (for Transporter authentication)
- Distribution IPA file properly signed for App Store distribution

### Method 1: Using Transporter App (Recommended)
1. Download and install Apple's [Transporter app](https://apps.apple.com/us/app/transporter/id1450874784) from the Mac App Store
2. Open Transporter and sign in with your Apple ID
3. Click the "+" button to add your IPA file
4. Select your IPA file from your file system
5. Click "Upload" to begin the upload process
6. Wait for upload and processing to complete (can take 5-30 minutes)
7. Once processed, the build will appear in App Store Connect under TestFlight

### Method 2: Using xcrun altool Command Line
1. Open Terminal on your Mac
2. Run the following command to authenticate and upload:
   ```bash
   xcrun altool --upload-app -f /path/to/your/app.ipa -t ios -u "your_apple_id@example.com" -p "your_app_specific_password"
   ```
   
   Alternatively, using API Key authentication (more secure):
   ```bash
   xcrun altool --upload-app -f /path/to/your/app.ipa -t ios --apiKey YOUR_API_KEY_ID --apiIssuer YOUR_ISSUER_ID
   ```
3. Wait for the upload to complete (you'll see progress in Terminal)
4. The build will appear in TestFlight after processing

### Method 3: Using App Store Connect Website
1. Sign in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app > TestFlight
3. Click the "+" button and select "Import Build"
4. Select your IPA file
5. Click "Upload" and wait for processing to complete

### After Upload
1. Processing typically takes 5-30 minutes
2. You'll receive an email when the build is ready for testing
3. Sign in to App Store Connect > Your App > TestFlight
4. Select the build and add it to testing groups
5. Set required information (what to test, etc.)
6. Save and distribute to testers

### Troubleshooting Manual Uploads

**Upload fails with "No suitable application records found":**
- Verify the bundle ID in the IPA matches your App Store Connect app
- Check that your Apple Developer account has access to the app
- Ensure the app exists in App Store Connect

**Upload fails with signature/certificate errors:**
- Verify the IPA is signed with a valid distribution certificate
- Check that the provisioning profile is for App Store distribution
- Ensure your certificates haven't expired

**Processing fails with compliance issues:**
- Check the rejection details in App Store Connect
- Common issues include missing encryption declaration or privacy policy
- Make required updates in App Store Connect and try again

**Upload fails with authentication errors:**
- For App-specific password: regenerate a new app-specific password
- For API keys: verify key has proper permissions and hasn't expired
- Check that you're using the correct Apple ID associated with the Developer account

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

### Method 1: Using Xcode (Recommended)
1. Download the IPA artifact from the GitHub Actions run
2. Connect your iPhone/iPad to your Mac
3. Open Xcode
4. Go to Window > Devices and Simulators
5. Select your device
6. Drag the IPA file to the "Installed Apps" section
7. The app will install directly to your device

### Method 2: Using AltStore (Auto-renewal)
AltStore automatically refreshes your apps every 7 days when on the same WiFi network:

1. Install AltStore on your computer from [altstore.io](https://altstore.io)
2. Install AltStore app on your iPhone via the desktop app
3. Add the IPA file to AltStore
4. AltStore will automatically refresh the app before it expires

### Method 3: Manual Reinstallation
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
