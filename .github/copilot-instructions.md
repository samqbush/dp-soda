# GitHub Copilot Custom Instructions

## Agent Guidelines
- Be concise in your output.

## Development Guidelines
- Never use mock data. In runtime application code, if required external data cannot be retrieved, show the user a clear error message and avoid displaying fabricated data. In developer scripts or tests, fail clearly with an actionable error.

## Build and Test Instructions
- Before completing a code change, run the relevant linter when possible and fix all lint errors and warnings introduced by the change. Report any pre-existing unrelated lint issues instead of modifying unrelated code without approval. If the linter cannot be run because dependencies or tooling are unavailable, state that explicitly and provide the exact command the user should run locally.
- Install javascript libraries locally instead of globally with `-g`.
- This application is built and released using GitHub Actions in .github/workflows
- It is manually published to the Play Store and App Store using the release notes from GitHub Actions as the release notes for the app store releases.

## CI Runs (avoid redundant builds)
- Locally, run only fast checks: `npm run lint`, `npx jest`, and `npm run check:release-notes` when `CHANGELOG.md` changes. Don't build the native apps locally.
- PRs into `dev` run lint, Jest and Playwright only. That's the gate for feature work.
- Native builds and Maestro smoke tests (~45 min) run on the `dev` → `main` release PR. Every merge into `dev` re-runs them there, even docs-only merges.
- While a release PR is open, don't start manual runs (`gh workflow run build-and-release.yml`); merge into `dev` and rely on the release PR's checks. Batch related changes into fewer merges.
- Start a manual run only when no release PR is open and the change touches native config, `.maestro/`, `.github/scripts/` or the workflow.
- Details: `docs/developer-setup.md` → Build Triggers.

## Git Branching and Commits
- Branch from `dev` and open PRs into `dev`. Only `dev` → `main` PRs go to `main` (release builds run on merge to `main`).
- Branch names: `<type>/<kebab-description>`, where type is `feature`, `fix`, `chore`, `docs`, or `upgrade` (e.g. `feature/rename-colorado-lakes-wind-monitor`, `upgrade/expo-sdk-55`).
- Commit messages follow Conventional Commits: `type(optional-scope): summary` (e.g. `feat: …`, `fix(ecowitt): …`, `ci: …`, `docs: …`).
- Full details: `docs/developer-setup.md` → Git Workflow.

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
