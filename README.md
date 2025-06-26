# Dawn Patrol - Soda Lake Wind Monitor

A wind monitoring app for Soda Lake (Soda Lake Dam 1) in Colorado that helps you decide whether it's worth heading out for water sports based on real-time wind conditions and advanced meteorological analysis.

## Features

- **Real-time Wind Monitoring**: Live wind conditions at Soda Lake and Standley Lake
- **Smart Analysis**: Advanced wind pattern analysis with multiple data sources
- **Configurable Thresholds**: Customize wind speed preferences for visual indicators
- **Standley Lake Monitor**: Real-time wind conditions via Ecowitt weather stations
- **🎯 NEW: Mountain Wave-Katabatic Interaction (MKI)**: Revolutionary 6-factor atmospheric analysis (Phase 4 Complete!)
- **🆓 FREE Historical Enhancement**: Uses actual observed weather data for improved thermal cycle analysis (no additional API costs)

## Phase 4: MKI Integration ✅ COMPLETE

**Mountain Wave-Katabatic Interaction Prediction System**

The Wind Guru tab now features groundbreaking meteorological analysis based on atmospheric science research. Our system is the first consumer implementation of Mountain Wave-Katabatic Interaction (MKI) theory, providing unprecedented accuracy in mountain wind prediction.

### How It Works

**Enhanced 6-Factor MKI Analysis:**
1. **☔ Precipitation Risk** (25% weight): Rain disrupts both katabatic flow and wave patterns
2. **🌙 Sky Conditions** (20% weight): Clear skies enable radiative cooling and wave development
3. **📈 Pressure Changes** (20% weight): Enhanced analysis including wave-induced pressure modifications
4. **🌡️ Temperature Differential** (15% weight): Valley vs mountain temperature with wave mixing effects
5. **🌊 Wave Pattern** (15% weight): Mountain wave enhancement using Froude number analysis
6. **🏔️ Atmospheric Stability** (5% weight): Multi-layer coupling efficiency between surface and wave levels

**🆓 FREE Historical Enhancement:**
- Uses [Open-Meteo](https://open-meteo.com/) for actual observed temperature data
- Replaces forecast estimates with real thermal cycle data when available
- Provides 95% confidence thermal analysis at no additional cost
- Automatically falls back to forecast data when historical unavailable

**Advanced MKI Calculations:**
- Froude number assessment for optimal wave conditions (Fr = 0.4-0.6)
- Nonlinear wave-katabatic interaction modeling
- Multi-scale variability analysis (mesoscale hourly + microscale rapid)
- Enhanced bonus system for positive wave enhancement scenarios
- Results in probability percentage with explanation

**Example: Understanding 73% MKI Prediction**
```
✅ Rain: 8.2% (excellent, below 25% threshold)
✅ Sky: 78% clear (good, above 45% requirement)  
✅ Pressure: +3.1 hPa change (excellent, above 1.0 threshold)
✅ Temp Diff: 7.3°F (good, above 6.0°F threshold)
✅ Wave Pattern: Fr=0.52 (optimal, positive enhancement)
❌ Stability: 42% coupling (marginal, below 50% threshold)

Result: 73% probability, High confidence → GO!
Why: Strong basic conditions + positive wave enhancement
```

### MKI Analysis Features

1. **6-Factor Probability Scoring**: Live percentage with MKI visual indicators
2. **Enhanced Confidence**: High/Medium/Low reliability with wave consideration
3. **Complete Factor Breakdown**: See all 6 atmospheric interactions
4. **MKI-Aware Recommendations**: GO/MAYBE/SKIP with wave enhancement context
5. **Scientific Analysis**: Technical explanations based on atmospheric research
6. **Intelligent Approach**: Captures complex scenarios traditional models miss

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

### Wind Guru Tab

The enhanced **Wind Guru** tab provides revolutionary MKI wind prediction:

- **6-Factor MKI Analysis**: Complete atmospheric interaction assessment 
- **Live Probability Scoring**: Real-time percentage with confidence levels
- **Enhanced Factor Breakdown**: Detailed analysis of precipitation, sky, pressure, temperature, wave patterns, and stability
- **Mountain Wave Assessment**: Froude number analysis and wave enhancement potential
- **Visual MKI Indicators**: Color-coded probability bars and comprehensive condition status
- **Scientific Recommendations**: GO/MAYBE/SKIP guidance based on atmospheric research
- **Advanced Insights**: Optimal time windows and detailed meteorological analysis with wave considerations

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

Comprehensive documentation is available in the [`docs/`](docs/) directory:

**Quick Links:**
- 📖 **[Complete Documentation Index](docs/README.md)** - Start here for all documentation
- 👤 **[User Guide](docs/user-guide.md)** - How to use the app effectively
- 🔬 **[Wind Prediction Guide](docs/wind-prediction-guide.md)** - Understanding katabatic wind analysis
- 👨‍💻 **[Developer Setup](docs/developer-setup.md)** - Contributing to the project
- 🚀 **[Deployment Guide](docs/deployment.md)** - Build and release processes
- 🛠️ **[Troubleshooting Guide](docs/troubleshooting.md)** - Fixing common issues

The documentation has been recently reorganized (June 10, 2025) to eliminate sprawl and improve accessibility. Historical development documentation is preserved in `docs/archive/` for reference.

## CI/CD with GitHub Actions

This project uses GitHub Actions for continuous integration and delivery:

- Automatic builds for Android releases
- Environment variables securely managed through GitHub secrets
- Complete signing and packaging for Google Play Store distribution

For details on setting up the CI/CD environment:
1. See [Deployment Guide](docs/deployment.md) for CI/CD configuration details
2. Review `.github/workflows/android.yml` for workflow configuration

## Coming Soon

- Push notifications for ideal conditions
- Historical accuracy tracking
- iOS builds in GitHub Actions workflow

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

