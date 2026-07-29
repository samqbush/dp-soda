#!/usr/bin/env node
import fs from 'fs';

/**
 * Validates the app store release notes embedded in CHANGELOG.md.
 *
 * Apple's "What's New in This Version" field allows 4000 characters.
 * Google Play's release notes field allows 500 characters per language.
 * A block that overflows is silently truncated (or rejected) by the store,
 * so this is checked in CI rather than eyeballed.
 *
 * Usage:
 *   node scripts/check-release-notes.mjs              # validate every store block
 *   node scripts/check-release-notes.mjs --print-entry # print newest entry (for release bodies)
 */

const CHANGELOG = 'CHANGELOG.md';

const LIMITS = {
  'App Store': 4000,
  'Play Store': 500,
};

/**
 * Splits the changelog into version entries. Headings are normalised to
 * `## vX.Y.Z — YYYY-MM-DD`, so a single pattern matches every entry.
 */
function parseEntries(markdown) {
  const headingPattern = /^## v(\d+\.\d+\.\d+)(?:\s+—\s+(\S+))?\s*$/gm;
  const entries = [];
  let match;

  while ((match = headingPattern.exec(markdown)) !== null) {
    entries.push({
      version: match[1],
      date: match[2] ?? null,
      heading: match[0],
      start: match.index,
      bodyStart: match.index + match[0].length,
    });
  }

  return entries.map((entry, index) => {
    const end = index + 1 < entries.length ? entries[index + 1].start : markdown.length;
    const body = markdown.slice(entry.bodyStart, end);
    return { ...entry, body, storeBlocks: extractStoreBlocks(body) };
  });
}

/**
 * Pulls the fenced ```text blocks that follow an "App Store" or "Play Store"
 * heading. The fence marks exactly what gets copied into the store, so there
 * is no ambiguity about where the pasted text begins and ends.
 */
function extractStoreBlocks(body) {
  const blockPattern = /^###\s+\S+\s+(App Store|Play Store)[^\n]*\n+```text\n([\s\S]*?)\n```/gm;
  const blocks = [];
  let match;

  while ((match = blockPattern.exec(body)) !== null) {
    blocks.push({ store: match[1], text: match[2] });
  }

  return blocks;
}

function checkEntry(entry) {
  const failures = [];

  for (const block of entry.storeBlocks) {
    const limit = LIMITS[block.store];
    const length = block.text.length;

    if (length > limit) {
      failures.push(
        `❌ v${entry.version} ${block.store}: ${length} characters, ${length - limit} over the ${limit} limit`
      );
    } else {
      console.log(`✅ v${entry.version} ${block.store}: ${length}/${limit} characters`);
    }
  }

  const stores = new Set(entry.storeBlocks.map((block) => block.store));
  for (const store of Object.keys(LIMITS)) {
    if (entry.storeBlocks.length > 0 && !stores.has(store)) {
      failures.push(`❌ v${entry.version} is missing its ${store} block`);
    }
  }

  return failures;
}

function main() {
  if (!fs.existsSync(CHANGELOG)) {
    console.log(`❌ Error: ${CHANGELOG} not found. Run this script from the project root.`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(CHANGELOG, 'utf8');
  const entries = parseEntries(markdown);

  if (entries.length === 0) {
    console.log(`❌ Error: no version entries found in ${CHANGELOG}.`);
    console.log('   Headings must match: ## vX.Y.Z — YYYY-MM-DD');
    process.exit(1);
  }

  if (process.argv.includes('--print-entry')) {
    process.stdout.write(`${entries[0].heading}\n\n${entries[0].body.trim()}\n`);
    return;
  }

  console.log(`🔍 Checking ${entries.length} version entries in ${CHANGELOG}\n`);

  const failures = entries.flatMap(checkEntry);

  const newest = entries[0];
  if (newest.storeBlocks.length === 0) {
    console.log(`\nℹ️  v${newest.version} has no store blocks (development build, not submitted).`);
    const released = entries.find((entry) => entry.storeBlocks.length > 0);
    if (released) {
      console.log(`   Newest release with store notes: v${released.version}`);
    }
  }

  if (failures.length > 0) {
    console.log(`\n${failures.join('\n')}`);
    console.log('\n💡 Shorten the offending block in CHANGELOG.md and re-run.');
    process.exit(1);
  }

  console.log('\n✅ All store release notes are within their character limits');
}

main();
