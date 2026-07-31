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

### Exception: `research/` folder
The anti-sprawl policy governs **user-facing and developer-facing documentation** in `docs/`.
It does **not** apply to `research/`, which holds working notes for exploratory sub-projects
that are not yet shipped features.

- `research/` may contain multiple markdown files, one per research thread
- Content there is **speculative and unshipped** — never cite it as how the app behaves
- When a research thread graduates into a real feature, migrate the relevant conclusions into
  one of the 3 core docs and delete or archive the research file
- Do not let research notes become a second, competing source of truth for shipped behavior

Current research threads:
- `research/katabatic-prediction.md` — morning katabatic prediction for Soda Lakes

Related work living outside this repo: afternoon/thermal wind prediction is tracked in the
separate `wind-guru` project (`~/Code/wind-guru/docs/afternoon-wind-research.md`), along with
Front Range katabatic physics reference notes. Afternoon wind is a different physical problem
and is deliberately not modelled here.

## Cleanup
- When creating debuging scripts & logs, clearly label them so they can be easily identified and removed later
