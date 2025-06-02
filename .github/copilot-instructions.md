# GitHub Copilot Custom Instructions

## Development Guidelines
- Edit files in place, do not create backups or copies of files unless necessary.
## Build and Test Instructions
- This app is not built locally, it is built using a GitHub Actions workflow. 
- The app can be tested locally using `npm start`.
- Use `npm run lint` to check for code style issues.
- Install javascript libraries locally instead of globally with `-g`.

## Documentation
- All documentation besides the README.md should be stored in the `docs` directory
- Keep documentation up to date and clear
- Avoid creating multiple versions of the same documentation

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
- When recreating files, delete the old files to avoid confusion
