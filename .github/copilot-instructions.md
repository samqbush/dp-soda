# GitHub Copilot Custom Instructions

## Project Context
- This repository is for Dawn Patrol Alarm focused on Soda Lake (Soda Lake Dam 1), Colorado. 
- It is an Expo/React Native application that scrapes wind data from WindAlert, analyzes and visualizes early morning wind trends (especially 3am–5am), and determines if conditions are favorable for wind sports.

## Build and Test Instructions
- This app is not built locally, it is built using a GitHub Actions workflow. 
- The app can be tested locally using `npx expo start` or `npx expo start --tunnel`.
- Install javascript libraries locally instead of globally with `-g`.

## Documentation
- All documentation besides the README.md should be stored in the `docs` directory
- Keep documentation up to date and clear
- Avoid creating multiple versions of the same documentation

## What to Avoid
- Do not hardcode values that should be user-configurable
- Do not use deprecated libraries or patterns
- Do not add unnecessary complexity or dependencies
- Do not break existing automation or visualization workflows

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
- When recreating files, delete the old files to avoid confusion
