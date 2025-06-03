# Setting Up GitHub Secrets for CI/CD Workflow

This guide explains how to set up the required GitHub secrets for the Dawn Patrol app's CI/CD workflow, particularly for building the Android app with Ecowitt API integration.

## Required GitHub Secrets

The following secrets need to be configured in the GitHub repository:

| Secret Name | Description |
|-------------|-------------|
| `EXPO_TOKEN` | Expo access token for CI builds |
| `ECOWITT_APPLICATION_KEY` | Ecowitt Application Key for API access |
| `ECOWITT_API_KEY` | Ecowitt API Key for authentication |
| `KEYSTORE_BASE64` | Base64-encoded Android keystore file |
| `STORE_PASSWORD` | Password for the Android keystore |

## How to Configure Secrets

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

## Verifying Configuration

Once all secrets are configured, you can manually trigger the workflow from the **Actions** tab in your repository by selecting the "Build Dawn Patrol Alarm" workflow and clicking **Run workflow**.

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

## Troubleshooting

If the build fails due to missing environment variables, check:

1. That all secrets are correctly named
2. That there are no typos in the secret values
3. That the workflow file references the secrets correctly

For more information about environment setup, check the [Environment Setup guide](ENVIRONMENT_SETUP.md).
