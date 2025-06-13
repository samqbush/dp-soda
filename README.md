# Dawn Patrol Alarm - Soda Lake

An app that monitors wind conditions at Soda Lake (Soda Lake Dam 1) in Colorado and tells you whether it's worth waking up early for "dawn patrol". Get reliable predictions based on early morning wind patterns!

## Features

- **Morning Wind Alarm**: Wake up or sleep in based on actual wind conditions
- **Smart Analysis**: Uses 3am-5am window to analyze if conditions will be favorable
- **Verification System**: Confirms predictions using 6am-8am window data
- **Fully Configurable**: Customize all wind criteria to match your preferences
- **Standley Lake Monitor**: Monitor real-time wind conditions at Standley Lake (via Ecowitt weather stations)
- **🎯 NEW: Mountain Wave-Katabatic Interaction (MKI)**: Revolutionary 6-factor atmospheric analysis (Phase 4 Complete!)

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

The Dawn Patrol Alarm helps you decide when to head to the beach by analyzing early morning wind patterns at Soda Lake.

### Smart Wake-Up Decisions

1. **Morning Analysis**: The app checks wind conditions during the crucial 3am-5am window
2. **Decision Making**: Based on speed, consistency, and direction, it determines if conditions are favorable
3. **Clear Results**: Get a simple "Wake Up! 🌊" or "Sleep In 😴" recommendation with alarm
4. **Verification**: The app also checks the 6am-8am window to validate its predictions

### Default Settings (All Customizable)

- **Minimum Wind Speed**: 15 mph (good for most water activities)
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

