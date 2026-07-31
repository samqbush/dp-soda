#!/usr/bin/env node
/**
 * Classifies a set of changed files against two independent questions.
 *
 *   noRelease - can this change alter the shipped app? If not, no version bump is
 *               needed and no build/release is worth running. `create-release` tags
 *               from the app version, so a change that cannot produce a release has
 *               no business demanding a bump.
 *   noLint    - is there anything here a linter can even read? Markdown, JSON data
 *               and CSV are not lintable by this toolchain.
 *
 * The two are deliberately not conflated. Research scripts are `noRelease` but NOT
 * `noLint`: they are real code and must be linted, they just cannot ship. Folding
 * them together would mean either linting archive data or shipping unlinted code.
 *
 * This file is the single source of truth, used by BOTH .husky/pre-commit and the
 * `classify` job in .github/workflows/build-and-release.yml. Those two previously
 * carried duplicate hand-maintained lists in two different glob dialects, which is
 * exactly the kind of pair that drifts silently.
 *
 * NOTE: this script is itself release-critical and must never be added to the
 * exempt paths below, or a change to the release gate could skip its own checks.
 */

import { pathToFileURL } from 'node:url';

/** Prose and generated docs. Nothing a linter reads, nothing that ships. */
function isDocs(f) {
  if (['README.md', 'CHANGELOG.md', 'LICENSE', '.github/copilot-instructions.md'].includes(f)) return true;
  if (f.startsWith('docs/') && f.endsWith('.md')) return true;
  if (f.startsWith('.github/skills/') && f.endsWith('.md')) return true;
  return false;
}

/** Katabatic research data and notes — not code, not shipped. */
function isResearchData(f) {
  return f.startsWith('research/') || f.startsWith('data/ecowitt-archive/');
}

/** Katabatic research code — not shipped, but still real code that must lint. */
const RESEARCH_SCRIPTS = new Set([
  'scripts/archive-ecowitt.mjs',
  'scripts/backtest-katabatic.mjs',
  'scripts/score-backtest.mjs',
  'scripts/katabatic-refresh.mjs',
]);

function isResearchCode(f) {
  // scripts/** is deliberately NOT exempt wholesale: increment-version.mjs and
  // test-version-increment.mjs live there and are release-critical.
  return f.startsWith('scripts/lib/') || RESEARCH_SCRIPTS.has(f);
}

/**
 * @param {string[]} files
 * @returns {{noRelease: boolean, noLint: boolean, hasFiles: boolean}}
 */
export function classifyChanges(files) {
  const list = files.map((f) => f.trim()).filter(Boolean);
  // An empty set (for example a message-only `git commit --amend`, or a push with
  // no diff) falls through to the full checks rather than being waved through.
  if (list.length === 0) return { noRelease: false, noLint: false, hasFiles: false };

  let noRelease = true;
  let noLint = true;

  for (const f of list) {
    if (isDocs(f) || isResearchData(f)) continue;
    if (isResearchCode(f)) {
      noLint = false;
      continue;
    }
    return { noRelease: false, noLint: false, hasFiles: true };
  }

  return { noRelease, noLint, hasFiles: true };
}

// CLI: paths on argv, or newline-separated on stdin.
// Prints `key=value` lines, which is also the GITHUB_OUTPUT format.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const read = async () => {
    if (args.length) return args;
    let buf = '';
    for await (const chunk of process.stdin) buf += chunk;
    return buf.split('\n');
  };
  const files = await read();
  const { noRelease, noLint, hasFiles } = classifyChanges(files);
  process.stdout.write(
    `no_release=${noRelease}\nno_lint=${noLint}\nhas_files=${hasFiles}\napp_changed=${!noRelease}\n`
  );
}
