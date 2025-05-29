# GitHub Copilot Custom Instructions

## Project Context
- This repository is for Dawn Patrol Alarm focused on Soda Lake (Soda Lake Dam 1), Colorado. 
- It is an Expo/React Native application that scrapes wind data from WindAlert, analyzes and visualizes early morning wind trends (especially 3am–5am), and determines if conditions are favorable for beach activities.

## Build and Test Instructions
- This app is not built locally, it is built using [build.yml](./workflows/build.yml) in the GitHub Actions workflow. 
- The app can be tested locally using `npx expo start` or `npx expo start --tunnel`.
- The app can be tested after a github action build by downloading the universal apk and installing on a usb tethered android device.

## Mobile App Guidance
- The application should be self contained and not rely on a backend server
- Visualize wind trends and alarm analysis in a simple, mobile-friendly UI
- Support dark mode, manual refresh, and offline access to last-fetched data
- Plan for push notifications and alarm integration in future versions

## Data Handling
- The data should be fetched a minute or two before the alarm time to minimize scrapping
- Data is processed to focus on the 2am–10am window, with special analysis for 3am–5am (alarm) and 6am–8am (verification)
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

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later

## Documentation
- All documentation besides the [README.md](../README.md) should be stored in the `docs` directory
- Keep documentation up to date and clear
  - Avoid creating multiple versions of the same documentation
- Refer to [IMPLEMENTATION_SUMMARY](../docs/IMPLEMENTATION_SUMMARY.md) for a summary of implemented features
- Refer to [FILE_STRUCTURE](../docs/FILE_STRUCTURE.md) for an overview of the project structure
- Refer to [DEVELOPMENT](../docs/DEVELOPMENT.md) for developer documentation

## User Experience
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
- Ask for clarification if a requirement is ambiguous
