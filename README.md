# Dawn Patrol Alarm - Soda Lake

An app that monitors wind conditions at Soda Lake (Soda Lake Dam 1) in Colorado and tells you whether it's worth waking up early for "dawn patrol". Get reliable predictions based on early morning wind patterns!

## Features

- **Morning Wind Alarm**: Wake up or sleep in based on actual wind conditions
- **Smart Analysis**: Uses 3am-5am window to analyze if conditions will be favorable
- **Verification System**: Confirms predictions using 6am-8am window data
- **Fully Configurable**: Customize all wind criteria to match your preferences
- **Standley Lake Monitor**: Monitor real-time wind conditions at Standley Lake (via Ecowitt weather stations)

## Getting Started

### Download Options

- Private Link

## How It Works

The Dawn Patrol Alarm helps you decide when to head to the beach by analyzing early morning wind patterns at Soda Lake.

### Smart Wake-Up Decisions

1. **Morning Analysis**: The app checks wind conditions during the crucial 3am-5am window
2. **Decision Making**: Based on speed, consistency, and direction, it determines if conditions are favorable
3. **Clear Results**: Get a simple "Wake Up! 🌊" or "Sleep In 😴" recommendation with alarm
4. **Verification**: The app also checks the 6am-8am window to validate its predictions

### Default Settings (All Customizable)

- **Minimum Wind Speed**: 10 mph (good for most water activities)
- **Direction Consistency**: 70% (ensures reliable wind patterns)
- **Required Consecutive Points**: 4 (confirms sustained conditions)
- **Direction Variation Limit**: 45° (ensures consistent direction)

## Using the App

### Main Screen

- **Current Status**: Large "Wake Up! 🌊" or "Sleep In 😴" indicator
- **Wind Statistics**: View current speed, direction consistency, and quality metrics
- **Trend Chart**: See wind patterns over the last 12 hours
- **Manual Refresh**: Pull down to update wind data
- **Last Updated**: Time of most recent data fetch

### Alarm Tester

- **Test Different Scenarios**: Try different wind conditions to see how the alarm responds
- **Customize Parameters**: Adjust minimum wind speed, direction consistency, and other criteria
- **Real-time Feedback**: See immediate analysis results as you change settings
- **Audio Testing**: Test alarm sounds with volume control
- **Scenario Library**: Choose from pre-configured test scenarios:
  - Good morning conditions (should trigger alarm)
  - Weak morning winds (should not trigger alarm) 
  - Inconsistent wind direction
  - Wrong wind direction (opposite of preferred)
  - Few good consecutive data points

### Settings Screen

- Tap the "Settings" tab to access settings
- Adjust all wind criteria to match your activity needs
- Changes take effect immediately with real-time analysis update
- Reset to defaults with a single tap

## Customizing Your Experience

Tailor the app to your specific needs through the Settings screen:

| Setting | Purpose | When to Adjust |
|---------|---------|----------------|
| Minimum Wind Speed | Sets threshold for "Wake Up" decision | Increase for activities requiring stronger winds |
| Direction Consistency | Ensures wind direction stability | Higher values for activities requiring consistent direction |
| Consecutive Good Points | Requires sustained good conditions | Increase for more certainty, decrease for more alerts |
| Speed Variation | Controls acceptable gustiness | Lower for activities requiring stable wind speed |
| Direction Variation | Limits wind direction shifts | Lower for direction-sensitive activities |

## Frequently Asked Questions

### Why isn't my app showing current data?
The app may be in offline mode. Check your internet connection and click the refresh button.

### Can I use this for other locations?
Currently, the app is optimized for Soda Lake (Soda Lake Dam 1) in Colorado.

## Technical Features

### Modern Architecture

- **Service-based Audio System**: Dedicated audio service with race condition prevention
- **Custom React Hooks**: Separation of concerns for improved code maintainability
  - `useAlarmAudio`: Handles all audio playback and state
  - `useWindAnalyzer`: Manages wind data analysis and scenarios
  - `useWindAlarmReducer`: Centralizes state management for clean component logic
- **Error Resilience**: Comprehensive error handling and recovery mechanisms
- **Multiple Test Scenarios**: Pre-configured tests for various wind conditions

## Documentation

Comprehensive documentation for this application can be found in the `docs/` directory:

- [Documentation Index](docs/DOCUMENTATION_INDEX.md) - Complete list of all documentation resources
- [Developer Guide](docs/DEVELOPMENT.md) - For developers contributing to the project
- [Architecture & Implementation](docs/ARCHITECTURE_AND_IMPLEMENTATION.md) - System design and features
- [Build & Deployment](docs/BUILD_AND_DEPLOYMENT.md) - Building and deploying the application

### Feature-Specific Documentation

- [Standley Lake Wind Monitor](docs/feature_guides/STANDLEY_LAKE_MONITOR.md) - Using the Standley Lake wind monitoring feature
- [Android Crash Guide](docs/feature_guides/ANDROID_CRASH_AND_WHITE_SCREEN_GUIDE.md) - Debugging Android-specific issues

## CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration and delivery:

- Automatic builds for Android releases
- Environment variables securely managed through GitHub secrets
- Complete signing and packaging for Google Play Store distribution

For details on setting up the CI/CD environment:
1. See [CI/CD Secrets Setup Guide](docs/CI_CD_SECRETS_SETUP.md)
2. Review `.github/workflows/android.yml` for workflow configuration

## Coming Soon

- Push notifications for ideal conditions
- Historical accuracy tracking
- iOS builds in GitHub Actions workflow

## Contact & Support

For questions, feature requests, or support open a GitHub issue in this repository

