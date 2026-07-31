#!/usr/bin/env node
/**
 * Weekly katabatic archive refresh — one command for the whole ritual.
 *
 * This exists because the research archive is a *perishable* asset. Ecowitt keeps 5-minute
 * history for roughly 90 days and downsamples anything older than about a year to 4-hour rows
 * (§4.3a), which are useless for a 30-minute sustained-wind label. Every day this is not run is
 * a day closer to losing resolution that cannot be recovered from any source.
 *
 * It replaces a scheduled GitHub Actions workflow deliberately: this is local research on an
 * unpushed branch, so a CI job that commits and pushes would be actively wrong.
 *
 * Steps: report staleness -> archive missing days -> re-label -> re-score -> summarise what
 * changed. Safe to run as often as you like; the archiver is idempotent.
 *
 *   node scripts/katabatic-refresh.mjs
 *   node scripts/katabatic-refresh.mjs --days 30     # wider catch-up after time away
 *   node scripts/katabatic-refresh.mjs --check       # report only, fetch nothing
 */

import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { labelDay } from './lib/label.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ARCHIVE = join(REPO_ROOT, 'data', 'ecowitt-archive');

// Ecowitt serves 5-minute rows for about this long, then coarsens. Past this, a day archived
// late is permanently lower resolution than one archived on time.
const FINE_RESOLUTION_DAYS = 90;

const STATIONS = ['dp-soda-lakes', 'dp-standley-west', 'dp-boulder-res'];

function parseArgs(argv) {
  const args = { days: 14, check: false };
  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === '--days' && next) args.days = parseInt(next, 10);
    if (argv[i] === '--check') args.check = true;
  }
  return args;
}

function run(script, extraArgs = []) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [join(__dirname, script), ...extraArgs], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))
    );
  });
}

/** Walk one station's archive and summarise what is there. */
function surveyStation(slug) {
  const dir = join(ARCHIVE, slug);
  if (!existsSync(dir)) return { slug, days: 0, latest: null, rideable: 0, usable: 0 };

  let days = 0;
  let usable = 0;
  let rideable = 0;
  let latest = null;

  for (const month of readdirSync(dir)) {
    const monthDir = join(dir, month);
    for (const file of readdirSync(monthDir)) {
      if (!file.endsWith('.json')) continue;
      days++;
      const rec = JSON.parse(readFileSync(join(monthDir, file), 'utf8'));
      if (!latest || rec.date > latest) latest = rec.date;
      const l = labelDay(rec);
      if (l.label === null) continue;
      usable++;
      if (l.label) rideable++;
    }
  }
  return { slug, days, latest, usable, rideable };
}

function daysBetween(isoDate, now) {
  const [y, m, d] = isoDate.split('-').map(Number);
  // Compare calendar days, not elapsed time — otherwise a file archived this morning reads as
  // "1 day behind" purely because the clock has moved past midnight-plus-a-bit.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - new Date(y, m - 1, d)) / 86400000);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();

  console.log('='.repeat(72));
  console.log('KATABATIC ARCHIVE REFRESH');
  console.log('='.repeat(72));

  const before = STATIONS.map(surveyStation);

  console.log('\n## ARCHIVE STATUS\n');
  let worstLag = 0;
  for (const s of before) {
    if (!s.days) {
      console.log(`${s.slug.padEnd(20)} empty`);
      continue;
    }
    const lag = daysBetween(s.latest, now);
    worstLag = Math.max(worstLag, lag);
    console.log(
      `${s.slug.padEnd(20)} ${String(s.days).padStart(4)} days   latest ${s.latest} (${lag}d ago)`
    );
  }

  // The whole reason for the weekly cadence. Say it in terms of what is at stake, not as a
  // generic "data may be stale" warning.
  if (worstLag > FINE_RESOLUTION_DAYS) {
    console.log(
      `\n🚨 ${worstLag} days behind. Anything older than ~${FINE_RESOLUTION_DAYS} days is past the\n` +
        `   5-minute retention window, so those days can now only ever be archived at coarser\n` +
        `   resolution. That loss is permanent — Ecowitt is the only source.`
    );
  } else if (worstLag > 30) {
    console.log(
      `\n⚠️  ${worstLag} days behind. Still inside the ~${FINE_RESOLUTION_DAYS}-day fine-resolution\n` +
        `   window, but don't let it drift much further.`
    );
  } else if (worstLag > 0) {
    console.log(`\n✅ ${worstLag} day(s) behind — comfortably inside the fine-resolution window.`);
  }

  if (args.check) {
    console.log('\n(--check: nothing fetched.)');
    return;
  }

  // Reach back further than the gap so a partially-archived day gets completed rather than left
  // half-written. Re-fetching an already-complete day is free: the archiver skips it.
  const days = Math.max(args.days, worstLag + 3);
  console.log(`\n## FETCHING (last ${days} days)\n`);
  await run('archive-ecowitt.mjs', ['--days', String(days), '--delay', '1200']);

  console.log('\n## RE-LABELLING AND SCORING\n');
  await run('backtest-katabatic.mjs', ['--out', join(REPO_ROOT, 'research', 'prediction-log.csv')]);
  await run('score-backtest.mjs', ['--call-time', '06:30']);

  const after = STATIONS.map(surveyStation);

  console.log('\n' + '='.repeat(72));
  console.log('WHAT CHANGED');
  console.log('='.repeat(72));
  let anyNew = false;
  for (let i = 0; i < after.length; i++) {
    const newDays = after[i].days - before[i].days;
    const newRideable = after[i].rideable - before[i].rideable;
    if (!newDays && !newRideable) continue;
    anyNew = true;
    console.log(
      `${after[i].slug.padEnd(20)} +${newDays} day(s)` +
        (newRideable ? `, +${newRideable} rideable morning(s)` : '')
    );
  }
  if (!anyNew) {
    // Expected outcome most weeks in winter, and not a failure. §4.2: the meter is deliberately
    // switched off roughly Jan 6 - Feb 28, and those days are recorded as unobserved, never calm.
    console.log('No new days. Normal if already current, or during the winter shutdown (§4.2).');
  }

  const soda = after[0];
  console.log(
    `\nSoda: ${soda.usable} usable mornings, ${soda.rideable} rideable ` +
      `(${soda.usable ? ((100 * soda.rideable) / soda.usable).toFixed(1) : '0'}%).`
  );
  console.log('\nArchive is local research — commit when you want a checkpoint, or leave it.');
}

main().catch((err) => {
  console.error(`\n❌ Refresh failed: ${err.message}`);
  process.exit(1);
});
