# Dawn Patrol Alarm Documentation Index

This index provides quick access to all documentation resources for the Dawn Patrol Alarm application.

## Core Documentation

| Document | Description |
|----------|-------------|
| [README.md](../README.md) | User-focused overview of the application |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Comprehensive developer guide with setup instructions |
| [ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md) | System architecture and implemented features |
| [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) | Build, deployment, and CI/CD processes |
| [ENV_VAR_CHANGE_NOTICE.md](./ENV_VAR_CHANGE_NOTICE.md) | Notice about environment variable name changes |

## Feature-Specific Guides

| Feature | Description |
|---------|-------------|
| [Standley Lake Monitor](./feature_guides/STANDLEY_LAKE_MONITOR.md) | Ecowitt integration for Standley Lake wind monitoring |
| [Android Crash & White Screen](./feature_guides/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md) | Handling and debugging Android crash issues |

## Quick Links by Topic

### For New Developers
- Start with [README.md](../README.md) for application overview
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development environment setup
- Review [ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md) to understand system design

### For DevOps / CI/CD
- See [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) for build process details
- Check the GitHub Actions workflows in `.github/workflows/`

### For Feature Development
- Reference relevant feature guides in `./feature_guides/`
- Review [ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md) for integration patterns

### For Troubleshooting
- See [Android Crash & White Screen Guide](./feature_guides/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md) for Android-specific issues
- Check [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) for build-related troubleshooting

## Document Update History

| Document | Last Updated | Major Changes |
|----------|--------------|--------------|
| DOCUMENTATION_INDEX.md | 2025-06-03 | Initial creation |
| ARCHITECTURE_AND_IMPLEMENTATION.md | 2025-06-03 | Consolidated from ARCHITECTURE.md and IMPLEMENTATION_SUMMARY.md |
| BUILD_AND_DEPLOYMENT.md | 2025-06-03 | Consolidated from LOCAL_BUILD_INSTRUCTIONS.md, CI_CD_SECRETS_SETUP.md, and ENVIRONMENT_SETUP.md |
| DEVELOPMENT.md | 2025-06-03 | Added React Navigation v7 fixes from REACT_NAVIGATION_V7_FIXES.md |
| ALL DOCUMENTATION | 2025-06-03 | Updated environment variable names: removed `EXPO_PUBLIC_` prefix from Ecowitt variables |
