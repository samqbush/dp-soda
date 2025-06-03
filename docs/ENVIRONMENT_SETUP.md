# Environment Setup

This app uses environment variables to securely store API credentials. Follow these steps to set up your environment:

## Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your actual API credentials:**
   ```bash
   # Ecowitt API Configuration
   EXPO_PUBLIC_ECOWITT_APPLICATION_KEY=your_application_key_here
   EXPO_PUBLIC_ECOWITT_API_KEY=your_api_key_here
   ```

3. **Get your Ecowitt API credentials:**
   - Log into your Ecowitt account
   - Go to API settings to generate your Application Key and API Key
   - Copy these values into your `.env` file

## Important Security Notes

- **Never commit the `.env` file** to version control
- The `.env` file is already included in `.gitignore`
- Use `.env.example` as a template for other developers
- Each developer/environment needs their own `.env` file

## Environment Variables Used

| Variable | Description | Required |
|----------|-------------|----------|
| `EXPO_PUBLIC_ECOWITT_APPLICATION_KEY` | Your Ecowitt Application Key | Yes |
| `EXPO_PUBLIC_ECOWITT_API_KEY` | Your Ecowitt API Key | Yes |

## Troubleshooting

### Missing Environment Variables Error
If you see an error about missing environment variables:

1. Ensure you have a `.env` file in the project root
2. Check that all required variables are set in the `.env` file
3. Restart the development server after making changes

### Invalid API Credentials
If the app can't connect to the Ecowitt API:

1. Verify your API credentials in the Ecowitt dashboard
2. Ensure the keys are correctly copied to your `.env` file
3. Check for any extra spaces or characters in the environment variables

## Production Deployment

For production builds:

1. Set environment variables in your CI/CD system
2. For EAS builds, use `eas secret:create` to set secure environment variables
3. Ensure all required environment variables are available in the build environment
