# GitHub Copilot Custom Instructions
## Development Guidelines
- Edit files in place, do not create backups or copies of files unless necessary.
- Never use mock data.  If data is not available, notify the user that we were unable to retrieve data and display a relevant error message.

## Build and Test Instructions
- This app is not built locally, it is built using a GitHub Actions workflow. 
- I always have the server running during development.  Do not run run `npm start`, `npm run dev`, or any other command that starts the server.  Instead tail the logs if you need to see what the problem is.  
- Always monitor the background terminal output when running `npm run lint` to check for code style issues and compilation errors.
- Always fix all linting errors and warnings before submitting code.
- Install javascript libraries locally instead of globally with `-g`.

## Documentation - STRICT ANTI-SPRAWL POLICY
- **ONLY 4 documentation files allowed:**
  1. `README.md` (root) - User-facing information only
  2. `docs/developer-setup.md` - ALL developer/deployment/build info
  3. `docs/architecture.md` - Technical system design
  4. `docs/wind-prediction-guide.md` - Wind analysis technical details
- **❌ Do not create new documentation files unless specifically requested**
- **✅ ALWAYS update existing core files instead**
- **✅ ALWAYS consolidate content into appropriate core file**
- **✅ ASK which core file to update if unclear**
- When documentation is needed, determine which of the 4 core files should be updated
- Deployment, build, troubleshooting → `docs/developer-setup.md`
- User features, getting started → `README.md`
- System design, APIs, services → `docs/architecture.md`
- Wind prediction details → `docs/wind-prediction-guide.md`

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
- When recreating files, delete the old files to avoid confusion
