# Dawn Patrol - Soda Lake Wind Monitor

A wind monitoring app for Soda Lake (Soda Lake Dam 1) in Colorado that helps you decide whether it's worth heading out for water sports based on real-time wind conditions and advanced meteorological analysis.

## Features

- **Real-time Wind Monitoring**: Live wind conditions at Soda Lake and Standley Lake
- **Smart Analysis**: Advanced wind pattern analysis with multiple data sources
- **Configurable Thresholds**: Customize wind speed preferences for visual indicators
- **Standley Lake Monitor**: Real-time wind conditions via Ecowitt weather stations
- **Wind Guru (Experimental)**: Advanced katabatic wind predictions (server migration in progress)

## Wind Guru Tab

**Experimental Feature — Server Migration In Progress**

The Wind Guru tab provides advanced katabatic wind predictions for Morrison, CO. It is currently an experimental feature (disabled by default) that can be enabled in Settings under "App Features."

The tab currently shows a server migration notice — the local prediction engine has been removed and server-based predictions are under development. When complete, the server system will provide:

- Machine learning models for pattern recognition
- Real-time processing and instant prediction updates
- Multi-location analysis across wind sites
- Improved accuracy via sophisticated weather modeling

## Getting Started

### Download Options

- Private Link

## How It Works

The Dawn Patrol app helps you decide when to head to the beach by analyzing wind patterns at Soda Lake using multiple data sources and advanced meteorological models.

### Wind Monitoring

1. **Real-time Data**: The app continuously monitors wind conditions from multiple sources
2. **Pattern Analysis**: Uses historical patterns and current conditions to assess quality
3. **Visual Indicators**: Wind charts show your configurable threshold as a reference line
4. **Multiple Sources**: Combines government weather data with local weather stations

### Default Settings (All Customizable)

- **Minimum Wind Speed**: 15 mph (good for most water activities)
- **Direction Consistency**: 70% (ensures reliable wind patterns)
- **Required Consecutive Points**: 4 (confirms sustained conditions)
- **Direction Variation Limit**: 45° (ensures consistent direction)

## Using the App

### Main Screen

- **Current Conditions**: Real-time wind speed, direction, and quality metrics
- **Wind Charts**: Interactive charts showing recent wind patterns
- **Threshold Indicator**: Visual reference line based on your configured wind speed preference
- **Manual Refresh**: Pull down to update wind data
- **Last Updated**: Time of most recent data fetch

### Settings Screen

- Tap the "Settings" tab to access settings
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
- Changes take effect immediately with real-time analysis update
- Reset to defaults with a single tap

### Wind Guru Tab

The Wind Guru tab is an experimental feature for advanced katabatic wind predictions (disabled by default). Enable it in Settings → App Features. See the [Wind Guru Tab](#wind-guru-tab) section above for details on current functionality.

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

Project documentation:

- 📖 **[README](README.md)** - User-facing features and usage guide (this file)
- 👨‍💻 **[Developer Setup](docs/developer-setup.md)** - Build, deploy, and contribute
- 🏗️ **[Architecture](docs/architecture.md)** - Technical system design

## CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration and delivery:

- Automatic builds for Android and iOS releases
- Environment variables securely managed through GitHub secrets
- Complete signing and packaging for distribution

For details on setting up the CI/CD environment:
1. See [Developer Setup](docs/developer-setup.md) for CI/CD configuration details
2. Review `.github/workflows/build-and-release.yml` for workflow configuration

## Coming Soon

- Push notifications for ideal conditions
- Historical accuracy tracking
- Server-powered Wind Guru predictions

## Contact & Support

For questions, feature requests, or support open a GitHub issue in this repository

## Transmission Quality Monitoring

The app now includes advanced transmission quality monitoring to detect and warn users about antenna issues that can cause gaps in wind data:

### Transmission Quality Features

- **Antenna Issue Detection**: Automatically detects when weather stations are only transmitting indoor temperature/humidity due to antenna problems
- **Gap Analysis**: Identifies periods where outdoor sensors (wind, temperature, humidity) are not transmitting
- **Status Indicators**: Shows current transmission status (Good, Partial, Indoor-only, Offline)
- **User Alerts**: Clear warnings when data gaps are caused by transmission issues, not weather conditions
- **Chart Context**: Explains gaps in wind speed charts so users understand they're caused by antenna issues, not lack of wind

### Transmission Status Types

- 🟢 **Good**: All sensors transmitting normally
- 🟡 **Partial**: Some sensors missing data
- 🟠 **Indoor-only**: Only indoor temperature/humidity transmitting (antenna issue)
- 🔴 **Offline**: No data being received

### Why This Matters

Weather stations can experience periodic antenna transmission problems that cause only indoor data to be transmitted while outdoor sensors (including wind) stop reporting. This creates gaps in wind charts that users might interpret as "no wind" when actually the station just couldn't transmit the data. The app now clearly distinguishes between these technical issues and actual weather conditions.

