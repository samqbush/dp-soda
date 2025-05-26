# GitHub Copilot Custom Instructions

## Project Context
This repository is for a wind trend analyzer focused on Bear Creek Lake (Soda Lake Dam 1), Colorado. It scrapes wind data from WindAlert, analyzes and visualizes early morning wind trends (especially 3am–5am), and determines if conditions are favorable for beach activities. The project includes:

## Mobile App Guidance
- Use Expo/React Native for cross-platform mobile development
- The application should be self contained and not rely on a backend server
- Visualize wind trends and alarm analysis in a simple, mobile-friendly UI
- Support dark mode, manual refresh, and offline access to last-fetched data
- Plan for push notifications and alarm integration in future versions

## Data Handling
- The data should be fetched a minute or two before the alarm time to minimize scrapping
- Data is processed to focus on the 2am–8am window, with special analysis for 3am–5am (alarm) and 6am–8am (verification)
- Wind speeds are converted from kph to mph
- Data is output as CSV and/or JSON for visualization and mobile consumption

## Alarm Logic
- Alarm-worthiness is determined by configurable criteria:
  - Minimum average wind speed (default: 10 mph)
  - Direction consistency (default: 70%)
  - Minimum consecutive good data points (default: 4)
  - Point speed and direction deviation thresholds
- Verification logic checks actual conditions in the 6am–8am window
- All thresholds and criteria should be user-configurable

## Documentation and User Experience
- Keep documentation up to date and clear
- Ensure all features are discoverable and easy to use
- Provide clear visual indicators for wind quality, alarm status, and prediction accuracy
- Make all settings and thresholds easily adjustable by the user

## What to Avoid
- Do not hardcode values that should be user-configurable
- Do not use deprecated libraries or patterns
- Do not add unnecessary complexity or dependencies
- Do not break existing automation or visualization workflows

## When in Doubt
- Prioritize user experience, clarity, and maintainability
- Follow the patterns and logic described in the spec and README
- Ask for clarification if a requirement is ambiguous


Refer to [WIND_README.md](./WIND_README.md) and [IMPLEMENTATION_SUMMARY](.IMPLEMENTATION_SUMMARY) for more details on the project, including setup instructions, development tools, and key features.