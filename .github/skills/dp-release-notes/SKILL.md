---
name: dp-release-notes
description: >
  Generate release notes for the Dawn Patrol wind monitoring app by analyzing git changes
  since the last documented release, and write them directly into CHANGELOG.md. Produces
  copy-paste-ready App Store and Play Store blocks plus a technical record. Use this skill
  whenever the user asks to generate release notes, write a changelog, prepare store listing
  updates, summarize what changed for a release, create PR descriptions from commits, or says
  things like "what's new in this version", "write the release notes", "prepare the app store
  update", "summarize changes since main", or "draft the PR description for this release".
  Also trigger when the user mentions version bumps, app store submissions, or preparing a
  release.
---

# Release Notes Generator

You generate release notes for Dawn Patrol, a wind monitoring app for Colorado lakes that helps
users decide whether conditions are right for water sports. Understanding the app's purpose
matters — frame every change in terms of how it helps someone checking wind conditions before
heading out.

Release notes live in **`CHANGELOG.md`**, which is the single source of truth. There is no
separate release notes file.

## Step 1 — Detect the version

Read `app.config.js` and extract `version`, `ios.buildNumber` and `android.versionCode`.

`app.config.js` is the **only** source of version truth. `package.json`'s `version` field is
stale and read by nothing — ignore it.

Never leave the version as a placeholder.

## Step 2 — Find the commit range

> **Do not diff against `main` or `dev`, and do not use git tags.**
>
> Tags do not exist in this repository and never will: every GitHub Release is deliberately left
> as a **draft** (a private channel for downloading test builds), and drafts don't create tags.
>
> Branch-based diffs are also wrong. A release merge often lands on `main` before its notes are
> written, so `main..HEAD` returns only the commits *after* the release and silently misses the
> entire release. This exact bug caused v1.1.0's notes to be reconstructed by hand.

Anchor on the newest version already documented in `CHANGELOG.md`, and find the commit that
introduced it:

```bash
# 1. Newest version already in the changelog, e.g. "1.1.1"
DOCUMENTED=$(grep -m1 '^## v' CHANGELOG.md | sed -E 's/^## v([0-9.]+).*/\1/')

# 2. The commit that first set that version in app.config.js
ANCHOR=$(git log --format=%H -S"version: \"$DOCUMENTED\"" -- app.config.js | tail -1)

# 3. Everything since
git log --oneline "$ANCHOR"..HEAD
```

`-S` counts occurrences of the literal string, so the commit that introduced
`version: "1.1.1"` is the one where the count goes 0 → 1. `tail -1` selects the earliest
(introducing) commit, since git logs newest-first.

If `ANCHOR` comes back empty, tell the user and ask for an explicit base rather than guessing.

Also read `README.md` to stay grounded in what the app does and what its tabs are.

## Step 3 — Categorise

Sort each change into:

- 🎯 **New Features** — user-facing functionality that didn't exist before
- ✨ **Improvements** — enhancements to things users already had
- 🐛 **Fixes** — things that were broken and are now fixed
- 🔧 **Technical** — everything else: refactors, dependencies, CI, tests, docs

Developer-only work (test harnesses, CI, Gradle, skills, docs) goes in **Technical only** and
must never appear in a store block.

## Step 4 — Write the entry into CHANGELOG.md

Prepend a new entry directly below the header block. Use this exact shape — the headings are
parsed by `scripts/check-release-notes.mjs`, so don't improvise them:

````markdown
## vX.Y.Z — YYYY-MM-DD

_iOS build N · Android versionCode N_

### 📱 App Store — "What's New" (≤4000 chars)

```text
<plain text>
```

### 🤖 Play Store — release notes (≤500 chars)

```text
<condensed plain text>
```

### 🎯 New Features
### ✨ Improvements
### 🐛 Fixes
### 🔧 Technical
````

Rules:

- Heading must be `## vX.Y.Z — YYYY-MM-DD` (an em dash). The parser depends on it.
- Omit empty categories rather than writing "N/A".
- **Never write a character count into the heading.** It goes stale the moment anyone edits the
  block, and a stale count is worse than none. The limit is checked, not recorded.
- For a development-only version that won't be submitted to the stores, omit both store blocks
  and say so explicitly in the entry. The checker understands this case.

### The store blocks

These are pasted by hand into App Store Connect and the Play Console, so they are **plain
text**, not markdown:

- No `#` headings, no `**bold**`, no backticks, no links.
- Bullets are `•`.
- **Apple allows 4000 characters. Google Play allows only 500 per language.** These are very
  different budgets — write the Play block as a genuine condensation, not a truncation.
- Lead with the single most exciting change. If there's a new tab or major feature, it goes
  first and gets a plain-language explanation.
- Describe what changed *for the user*, never the code. No file paths, no framework names, no
  version numbers of dependencies. "A faster, smoother app" — not "upgraded to Expo SDK 55".
- Present tense: "Wind charts now load faster", not "wind charts were optimized".
- Group minor fixes into one "Various bug fixes and stability improvements" line.

### The technical section

- Include short commit hashes for traceability and PR numbers where available.
- Note dependency, SDK and build configuration changes.
- Include migration notes or breaking changes if any.

## Step 5 — Verify

Run the checker and fix anything it reports:

```bash
npm run check:release-notes
```

It validates every store block against its limit and fails the build on overflow. This is the
same check CI runs, so a clean run here means a clean run there.

## Step 6 — Report

Show the user the full entry you added, confirm it's in `CHANGELOG.md`, and state both character
counts against their limits. Remind them that `CHANGELOG.md` **is** the record — there is no
scratch file to copy from.

## Important context

- Expo (React Native), published **manually** to the App Store and Play Store.
- Branching: feature branches → `dev` → `main` for releases.
- GitHub Releases are intentionally kept as **drafts** so the public can't download builds; the
  user publishes to the stores separately. Never suggest publishing a GitHub release.
- CI (`.github/workflows/build-and-release.yml`) skips builds for documentation-only changes,
  and `CHANGELOG.md` is on that ignore list. A changelog-only commit will therefore never
  produce a build — the entry must land in the **same merge** as the code it describes, or the
  draft release body will lag a version behind.
- CI enforces a version increment on pull requests to `main` (`npm run test-version`). Any PR
  touching files outside the ignore list needs a bump in `app.config.js`.
- The app monitors Soda Lake, Standley Lake and Boulder Reservoir via Ecowitt weather stations.
- The "Wind Guru" feature is experimental and disabled by default.
