# Build and Deployment Guide

This document consolidates all information related to building, deploying, and configuring the Dawn Patrol Alarm application.

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Local Development](#local-development)
3. [CI/CD Workflow](#cicd-workflow)
4. [GitHub Actions Build Process](#github-actions-build-process)
5. [Secrets Management](#secrets-management)
6. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in the required values:**
   ```bash
   # Ecowitt API Configuration Example
   ECOWITT_APPLICATION_KEY=your_application_key_here
   ECOWITT_API_KEY=your_api_key_here
   ```

3. **Verify your environment:**
   ```bash
   npm run validate-env
   ```

### Environment Variables

| Variable | Description | Required For |
|----------|-------------|-------------|
| `ECOWITT_APPLICATION_KEY` | Ecowitt API application key | Standley Lake Monitor feature |
| `ECOWITT_API_KEY` | Ecowitt API authentication key | Standley Lake Monitor feature |

---

## Local Development

### Starting the Development Server

```bash
npm start
```

This starts the Expo development server. You can then:
- Press `a` to open on Android emulator/device
- Press `i` to open on iOS simulator/device
- Scan the QR code with Expo Go app on your physical device

---

## CI/CD Workflow

### GitHub Actions Workflow

The app is built using GitHub Actions workflows defined in `.github/workflows/`:

- `android.yml` - Builds the Android App Bundle (AAB) for Google Play Store

### Workflow Triggers

The workflow can be triggered by:
- Pull requests to the `android` branch
- Manual trigger through GitHub Actions UI (workflow_dispatch event)

---

## GitHub Actions Build Process

### Key Steps in the Build Process

1. **Repository Checkout**: Fetches the complete repository history
2. **Node.js Setup**: Configures Node.js v20 with npm cache
3. **Environment Setup**: Creates a `.env` file from GitHub secrets
4. **Dependency Installation**: Installs required npm packages
5. **Code Quality Checks**: Runs linting and type checking
6. **Native Project Generation**: Runs `expo prebuild` for native files
7. **AAB Building**: Uses Gradle to create the Android App Bundle
8. **Signing**: Signs the app with the upload keystore
9. **Artifact Creation**: Creates and uploads APK/AAB artifacts

---

## Secrets Management

### Required GitHub Secrets

The following secrets need to be configured in the GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `EXPO_TOKEN` | Expo access token for CI builds |
| `ECOWITT_APPLICATION_KEY` | Ecowitt Application Key for API access |
| `ECOWITT_API_KEY` | Ecowitt API Key for authentication |
| `KEYSTORE_BASE64` | Base64-encoded Android keystore file |
| `STORE_PASSWORD` | Password for the Android keystore |

### How to Configure Secrets

1. Navigate to your GitHub repository
2. Go to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each of the required secrets with their corresponding values

> **Note**: In our CI/CD workflow, these secrets are used to create a `.env` file during the build process. This ensures the app is built with the proper credentials without requiring manual input.

### Obtaining Ecowitt API Credentials

1. Log into your Ecowitt account at [https://www.ecowitt.net/](https://www.ecowitt.net/)
2. Navigate to **API Management** in your account settings
3. Create a new application if you don't have one already
4. Copy the **Application Key** and **API Key** values

### Creating and Encoding the Android Keystore

1. Generate a keystore file (if you don't have one already):
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -alias upload-key -keyalg RSA -keysize 2048 -validity 10000
   ```
   
2. Convert the keystore file to base64:
   ```bash
   base64 -i upload-keystore.jks | pbcopy
   ```
   
3. Paste the base64 output as the value for the `KEYSTORE_BASE64` secret

4. Use the password you specified when creating the keystore for the `STORE_PASSWORD` secret

### How the CI/CD Process Uses Environment Variables

The GitHub Actions workflow handles environment variables as follows:

1. Creates a `.env` file from GitHub secrets before building:
   ```yaml
   - name: 🔐 Create .env file
     run: |
       echo "ECOWITT_APPLICATION_KEY=${{ secrets.ECOWITT_APPLICATION_KEY }}" > .env
       echo "ECOWITT_API_KEY=${{ secrets.ECOWITT_API_KEY }}" >> .env
   ```

2. The app's configuration in `app.config.js` reads these values and makes them available to the app
3. During build, these values are embedded in the app binary, eliminating the need for users to input API keys

---

## Troubleshooting

### Common Build Issues

1. **Missing environment variables**
   - Check that all required environment variables are set in `.env` or GitHub secrets

2. **Gradle build failures**
   - Check for syntax errors in native Android files
   - Ensure proper setup of signing configuration

3. **JavaScript bundle errors**
   - Clear Metro bundler cache: `npx expo start --clear`
   - Verify compatibility of installed packages

4. **Missing API keys**
   - Ensure API keys are correctly set in `.env` file
   - For CI/CD, check GitHub secrets configuration

### Getting Build Logs

When builds fail in GitHub Actions:

1. Go to the repository's Actions tab
2. Click on the failed workflow run
3. Expand the job that failed
4. Review the logs for specific error messages
