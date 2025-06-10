# Dawn Patrol Alarm - Soda Lake

An app that monitors wind conditions at Soda Lake (Soda Lake Dam 1) in Colorado and tells you whether it's worth waking up early for "dawn patrol". Get reliable predictions based on early morning wind patterns!

## Features

- **Morning Wind Alarm**: Wake up or sleep in based on actual wind conditions
- **Smart Analysis**: Uses 3am-5am window to analyze if conditions will be favorable
- **Verification System**: Confirms predictions using 6am-8am window data
- **Fully Configurable**: Customize all wind criteria to match your preferences
- **Standley Lake Monitor**: Monitor real-time wind conditions at Standley Lake (via Ecowitt weather stations)
- **🎯 NEW: Katabatic Wind Prediction**: Advanced meteorological analysis for mountain wind patterns (Phase 2 Complete!)

## Phase 2: Prediction Engine ✅ COMPLETE

**Advanced Katabatic Wind Prediction System**

The Wind Guru tab now features a sophisticated meteorological analysis engine that predicts katabatic wind conditions with scientific accuracy. Unlike simple weather apps, our system analyzes the specific physics of mountain wind formation.

### How It Works

**4-Factor Scientific Analysis:**
1. **☔ Precipitation Risk** (30% weight): Rain disrupts katabatic flow
2. **🌙 Sky Conditions** (25% weight): Clear skies needed for radiative cooling (2-5am)  
3. **📈 Pressure Changes** (25% weight): Indicates active air movement patterns
4. **🌡️ Temperature Differential** (20% weight): Valley vs mountain temperature drives flow

**Smart Probability Calculation:**
- Weighted algorithm considers factor importance
- Penalty system for unmet critical criteria  
- Confidence scoring validates prediction reliability
- Results in probability percentage with explanation

**Example: Understanding 47% Prediction**
```
✅ Rain: 17.8% (good, below 20% threshold)
❌ Sky: 56% clear (poor, below 70% requirement)  
✅ Pressure: -7.3 hPa change (good, above 2.0 threshold)
✅ Temp Diff: 6.1°C (good, above 5.0 threshold)

Result: 47% probability, Low confidence → SKIP
Why: Poor sky conditions prevent reliable cooling
```

### Katabatic Analysis Features

1. **Real-time Probability Scoring**: Live percentage with visual indicators
2. **Confidence Assessment**: High/Medium/Low reliability ratings
3. **Factor-by-Factor Breakdown**: See exactly what's working/not working
4. **Smart Recommendations**: Clear GO/MAYBE/SKIP guidance with explanations
5. **Detailed Analysis**: Technical explanations for weather enthusiasts
6. **Conservative Approach**: Better to miss good conditions than recommend poor ones

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

The new **Wind Guru** tab provides advanced katabatic wind prediction:

- **Real-time Prediction**: Live probability scoring with confidence levels
- **Factor Analysis**: Detailed breakdown of precipitation, sky conditions, pressure, and temperature
- **Visual Indicators**: Color-coded probability bars and condition status
- **Smart Recommendations**: Clear GO/MAYBE/SKIP guidance with explanations
- **Enhanced Insights**: Best time windows and detailed meteorological analysis

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

The documentation has been recently reorganized (June 2025) to eliminate sprawl and improve accessibility. Historical documentation is preserved in `docs/archive/` for reference.

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

