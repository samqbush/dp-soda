# Environment Variable Name Change Notice

## Changes Made on June 3, 2025

We've simplified our environment variable naming by removing the `EXPO_PUBLIC_` prefix from Ecowitt API credentials.

### Changed Variables

| Old Name | New Name |
|----------|----------|
| `EXPO_PUBLIC_ECOWITT_APPLICATION_KEY` | `ECOWITT_APPLICATION_KEY` |
| `EXPO_PUBLIC_ECOWITT_API_KEY` | `ECOWITT_API_KEY` |

### Required Actions

1. **For local development**:
   - Update your `.env` file to use the new variable names
   - Reference the updated `.env.example` for the correct format

2. **For CI/CD**:
   - Update your GitHub repository secrets:
     - Rename `EXPO_PUBLIC_ECOWITT_APPLICATION_KEY` to `ECOWITT_APPLICATION_KEY`
     - Rename `EXPO_PUBLIC_ECOWITT_API_KEY` to `ECOWITT_API_KEY`

3. **For documentation**:
   - All documentation has been updated to reflect these changes

### Why This Change?

The `EXPO_PUBLIC_` prefix was unnecessary as these variables are already handled securely through our build process. This change simplifies our code and configuration while maintaining the same level of security.

### Affected Files

The following files were updated:
- `.env.example`
- `config/ecowittConfig.ts`
- `app.config.js`
- `.github/workflows/android.yml`
- Various documentation files

If you encounter any issues related to this change, please refer to the updated [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) documentation or open an issue on GitHub.
