---
name: dp-release-notes
description: >
  Generate release notes for the Dawn Patrol wind monitoring app by analyzing git changes
  between branches. Produces two versions: user-friendly notes for App Store / Play Store
  submissions, and technical notes for pull request descriptions. Use this skill whenever
  the user asks to generate release notes, write a changelog, prepare store listing updates,
  summarize what changed for a release, create PR descriptions from commits, or says things
  like "what's new in this version", "write the release notes", "prepare the app store update",
  "summarize changes since main", or "draft the PR description for this release". Also trigger
  when the user mentions version bumps, app store submissions, or preparing a release.
---

# Release Notes Generator

You generate release notes for Dawn Patrol, a wind monitoring app for Colorado lakes that
helps users decide whether conditions are right for water sports. Understanding the app's
purpose matters — your release notes should frame changes in terms of how they help someone
checking wind conditions before heading out.

## How it works

1. **Detect the version** by reading `app.config.js` and extracting the `version` field
   (e.g., `version: "1.1.0"`). Also note the `ios.buildNumber` and `android.versionCode`
   if relevant. Use this version in the release notes headers — never leave it as a
   placeholder.

2. **Gather the raw changes** by detecting the current branch and comparing against the
   appropriate base branch. The branching strategy is:
   - Feature branches merge into `dev`
   - `dev` merges into `main` for releases
   
   So determine the base branch automatically:
   - If on `dev` → compare against `main` (`git log --oneline main..HEAD`)
   - If on a feature branch → compare against `dev` (`git log --oneline dev..HEAD`)
   - If the user specifies a base branch, use that instead
   
   Run `git branch --show-current` first to detect which branch you're on.

3. **Read the app context** from the project README.md to stay grounded in what the app
   does and what its tabs/features are.

3. **Categorize** each change into one of these buckets:
   - 🆕 **New Features** — user-facing functionality that didn't exist before
   - ✨ **Improvements** — enhancements to things users already had
   - 🐛 **Bug Fixes** — things that were broken and are now fixed
   - ⚡ **Performance & Reliability** — behind-the-scenes work that makes the app faster
     or more stable (only include if meaningful to users — skip pure refactors)

4. **Produce two versions** of the notes:

### User-Friendly Version (App Store / Play Store)

This is what real people read when they see an app update notification. Write it so a
non-technical person who just wants to know "should I update?" gets a clear answer.

Here's the proven format from previous releases — follow this structure:

```
### 🎯 What's New
- **Feature Name** — one-sentence benefit description

### ✨ What's Better
- **Improvement area** — what changed and why it matters

### 🐛 Fixes
- Brief description of what was broken and that it's fixed
```

Guidelines:
- Lead with the most exciting or impactful change
- Describe what changed *for the user*, not what changed in the code
- Use plain language — no commit hashes, no file paths, no framework names
- Keep it concise — aim for 3-8 bullet points total, not an exhaustive list
- Group minor fixes into a single "Various bug fixes and stability improvements" line
  rather than listing each one
- Use bold for feature names followed by an em dash and the benefit
- If there's a new tab or major feature, call it out prominently
- Write in present tense ("Wind charts now load faster" not "Wind charts were optimized")

### Technical Version (Pull Request Description)

This goes into the PR body when merging dev → main for a release. It's for the developer
(the user) to have a record of what went into the release.

Here's the proven format from previous releases (e.g., v1.0.10 PR #29):

```
## 📋 Technical Release Notes

### 🔧 Detailed Changes

#### ✨ New Features
- **Feature Name** (PR #XX)
  - Detail about implementation
  - Files changed or architectural notes

#### 🐛 Bug Fixes
- **Bug Description** (PR #XX)
  - What was wrong
  - How it was fixed

#### 🧹 Maintenance
- **Change area** (commit abc1234)
  - What was updated and why
```

Guidelines:
- Include commit hashes (short form) for traceability
- Group by category using the emoji headers above
- Reference PR numbers where available (format: `#123` or link to full URL)
- Note any dependency updates, SDK changes, or build configuration changes
- Include migration notes or breaking changes if any
- Reference `Closes #XX` or `Fixes #XX` for any GitHub issues resolved

## Output format

Present both versions clearly separated. Use this structure:

```
## 📱 App Store Release Notes (v1.1.0)

[user-friendly version here]

---

## 🔧 Technical Release Notes (v1.1.0)

[technical version here]
```

Always use the actual version from `app.config.js` — never use a placeholder.

## Important context

- The app is built with Expo (React Native) and published manually to App Store and Play Store
- Release builds are created via GitHub Actions workflows in `.github/workflows/`
- The app monitors wind at Soda Lake, Standley Lake, and Boulder Reservoir using Ecowitt
  weather stations
- The "Wind Guru" feature is experimental and disabled by default
- The user copies the user-friendly notes directly into store listings, so formatting matters
