# GitHub Copilot Custom Instructions
## Development Guidelines
- Never use mock data.  If data is not available, notify the user that we were unable to retrieve data and display a relevant error message.

## Build and Test Instructions
- Always fix all linting errors and warnings before submitting code.
- Install javascript libraries locally instead of globally with `-g`.
- All npm scripts should also be VSCode tasks located in `.vscode/tasks.json`

## Documentation - STRICT ANTI-SPRAWL POLICY
- **ONLY 3 documentation files allowed:**
  1. `README.md` (root) - User-facing information only
  2. `docs/developer-setup.md` - ALL developer/deployment/build info
  3. `docs/architecture.md` - Technical system design
- **❌ Do not create new documentation files unless specifically requested**
- **✅ ALWAYS update existing core files instead**
- **✅ ALWAYS consolidate content into appropriate core file**
- **✅ ASK which core file to update if unclear**
- When documentation is needed, determine which of the 3 core files should be updated
- Deployment, build, troubleshooting → `docs/developer-setup.md`
- User features, getting started → `README.md`
- System design, APIs, services → `docs/architecture.md`

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
