# Bundle Identifier Fix Documentation

## Issue

The iOS TestFlight build was failing with the following errors:
- `Invalid format 'com.samqbush.dpsoda"'` - Indicating a problem with extra quotes in the bundle identifier
- `Unable to process file command 'env' successfully` - Suggesting issues with environment variable processing

## Root Cause

1. When extracting the bundle identifier from `app.config.js` using Node.js, the output retained quotes that were then passed into shell variables.
2. When storing these values in GitHub environment variables, the values were enclosed in additional quotes.

## Fix Applied

1. Added `tr -d '\"'` to strip any quotes from the Node.js output for both `EXPECTED_BUNDLE_ID` and `APP_NAME` extraction:
   ```bash
   EXPECTED_BUNDLE_ID=$(node -p "..." 2>&1 | tr -d '\"')
   ```

2. Removed extra quotes in the GitHub environment variable assignment:
   ```bash
   # Changed from
   echo "EXPECTED_BUNDLE_ID=\"$EXPECTED_BUNDLE_ID\"" >> $GITHUB_ENV
   # To
   echo "EXPECTED_BUNDLE_ID=$EXPECTED_BUNDLE_ID" >> $GITHUB_ENV
   ```

## Preventing Similar Issues

When working with environment variables that contain values extracted from JavaScript:
1. Always strip quotes or escape characters that might interfere with shell processing
2. Be cautious with nested quoting in GitHub Actions workflows
3. Use `tr -d` or similar commands to clean variable output

## Testing

After applying these changes, the iOS build should complete successfully, with bundle identifiers correctly processed.
