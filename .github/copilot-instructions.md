# GitHub Copilot Custom Instructions
## Development Guidelines
- Edit files in place, do not create backups or copies of files unless necessary.
## Build and Test Instructions
- This app is not built locally, it is built using a GitHub Actions workflow. 
- Ask me to run `npm start` or to refresh the server and wait.  Do not run this command yourself.
- Use `npm run lint` to check for code style issues and compilation errors.
- Wait for complete command output before concluding success/failure, especially for `npm run lint` which runs multiple tools sequentially
- Install javascript libraries locally instead of globally with `-g`.

## Documentation
- All documentation besides the README.md should be stored in the `docs` directory
- Keep documentation up to date and clear
- Update existing documentation insead of creating new files when possible, ask me if you are unsure
  - Refer to the [README.md](../README.md) for documentation structure

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
- When recreating files, delete the old files to avoid confusion
