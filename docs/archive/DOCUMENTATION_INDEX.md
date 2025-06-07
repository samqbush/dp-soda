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
| [Phase 2 Implementation](./PHASE_2_IMPLEMENTATION.md) | Advanced katabatic wind prediction system (technical documentation) |
| [Katabatic Prediction User Guide](./KATABATIC_PREDICTION_GUIDE.md) | How to understand and use wind predictions |
| [Standley Lake Monitor](./STANDLEY_LAKE_MONITOR.md) | Ecowitt integration for Standley Lake wind monitoring |
| [OpenWeatherMap Setup](./OPENWEATHERMAP_SETUP.md) | Configure real weather API (fixes mock data issues) |
| [Weather Data Validation](./WEATHER_DATA_VALIDATION.md) | Troubleshoot prediction accuracy and data sources |

## Quick Links by Topic

### For New Developers
- Start with [README.md](../README.md) for application overview
- Read [DEVELOPMENT.md](./DEVELOPMENT.md) for development environment setup
- Review [ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md) to understand system design

### For DevOps / CI/CD
- See [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) for build process details
- Check the GitHub Actions workflows in `.github/workflows/`

### For Feature Development
- Reference relevant feature guides for specific functionality
- **For Wind Prediction**: Start with [Katabatic Prediction User Guide](./KATABATIC_PREDICTION_GUIDE.md), then [Phase 2 Implementation](./PHASE_2_IMPLEMENTATION.md)
- Review [ARCHITECTURE_AND_IMPLEMENTATION.md](./ARCHITECTURE_AND_IMPLEMENTATION.md) for integration patterns

### For Troubleshooting
- See [Android Crash & White Screen Guide](./feature_guides/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md) for Android-specific issues
- Check [BUILD_AND_DEPLOYMENT.md](./BUILD_AND_DEPLOYMENT.md) for build-related troubleshooting

## Document Update History

| Document | Last Updated | Major Changes |
|----------|--------------|--------------|
| KATABATIC_PREDICTION_GUIDE.md | 2025-06-06 | Created comprehensive user guide for understanding wind predictions |
| PHASE_2_IMPLEMENTATION.md | 2025-06-06 | Added detailed calculation methodology and 47% prediction example |
| DOCUMENTATION_INDEX.md | 2025-06-06 | Added Phase 2 documentation links and user guide |
| ARCHITECTURE_AND_IMPLEMENTATION.md | 2025-06-03 | Consolidated from ARCHITECTURE.md and IMPLEMENTATION_SUMMARY.md |
| BUILD_AND_DEPLOYMENT.md | 2025-06-03 | Consolidated from LOCAL_BUILD_INSTRUCTIONS.md, CI_CD_SECRETS_SETUP.md, and ENVIRONMENT_SETUP.md |
| DEVELOPMENT.md | 2025-06-03 | Added React Navigation v7 fixes from REACT_NAVIGATION_V7_FIXES.md |
| ALL DOCUMENTATION | 2025-06-03 | Updated environment variable names: removed `EXPO_PUBLIC_` prefix from Ecowitt variables |
