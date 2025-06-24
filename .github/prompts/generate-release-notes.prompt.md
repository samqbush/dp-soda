---
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'runCommands', 'runTasks', 'search', 'terminalLastCommand', 'terminalSelection']
description: Generate user-friendly release notes by analyzing git changes between branches and converting technical details into clear, actionable summaries for end users.
---

You are tasked with generating comprehensive release notes for this [application](../../README.md). Do the following:

1. **Analyze Git Changes**: Run `git log --oneline main..HEAD` to get raw technical changes between the current branch and main (or specified base branch).

2. **Categorize Changes**: Review the generated technical release notes and organize them into meaningful categories:
   - New Features (user-facing functionality)
   - Improvements (enhancements to existing features)
   - Bug Fixes (resolved issues)
   - Performance & Reliability (behind-the-scenes improvements)

3. **Create User-Friendly Descriptions**: Transform technical commit messages and file changes into clear, benefit-focused descriptions that explain:
   - What changed for the user
   - Why it matters
   - How it improves their experience

4. **Generate Two Versions**:
   - **Technical Version**: Detailed notes for developers with file changes, commit hashes, and technical specifics
   - **User-Friendly Version**: Clean, marketing-ready notes focused on user benefits and experience improvements

5. **Quality Assurance**: Ensure the release notes:
   - Use consistent formatting and tone
   - Avoid technical jargon in user-facing sections
   - Highlight the most impactful changes
   - Include appropriate emojis for visual appeal
   - Provide clear next steps or migration guidance if needed

The goal is to create release notes that both technical stakeholders and end users can understand and appreciate.
