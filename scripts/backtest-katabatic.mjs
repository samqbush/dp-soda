#!/usr/bin/env node

/**
 * Backtest — replay the deterministic call rule across every archived morning.
 *
 * This is the deliverable that answers the user's actual question: *"what are we predicting, and
 * is it any good?"* It converts an unfalsifiable LLM judgment into a scored, reproducible record.
 *
 * ⚠️ NO LOOKAHEAD. Every feature is computed by `computeFeatures`, which filters to readings at
 * or before the call time. That barrier is asserted in __tests__/utils/katabaticBacktest.test.js.
 * If it is ever breached, results will look BETTER than reality — the worst failure mode here.
 *
 * Usage:
 *   node scripts/backtest-katabatic.mjs
 *   node scripts/backtest-katabatic.mjs --threshold 12 --out research/prediction-log.csv
 */

import { readFile, readdir, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { REPO_ROOT, SUNRISE_COORDS } from './lib/ecowitt.mjs';
import { computeFeatures, callRule } from './lib/call-rule.mjs';
import { labelDay, parseArchiveDate, DEFAULT_THRESHOLD_MPH } from './lib/label.mjs';
import { calcSunrise } from './lib/sunrise.mjs';
import { csvHeader, toCsvRow, buildLogRow } from './lib/prediction-log.mjs';

const ARCHIVE_ROOT = join(REPO_ROOT, 'data', 'ecowitt-archive');
const DEFAULT_OUT = join(REPO_ROOT, 'research', 'prediction-log.csv');

const TARGET_SLUG = 'dp-soda-lakes';
const NEIGHBOR_SLUGS = ['dp-standley-west', 'dp-boulder-res'];

// The window a dawn patrol decision actually gets made in.
const CALL_START_MIN = 5 * 60;
const CALL_END_MIN = 7 * 60;
const CALL_STEP_MIN = 15;

function parseArgs(argv) {
  const args = { threshold: DEFAULT_THRESHOLD_MPH, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === '--threshold' && next) args.threshold = parseFloat(next);
    if (argv[i] === '--out' && next) args.out = next;
  }
  return args;
}

async function loadStation(slug) {
  const root = join(ARCHIVE_ROOT, slug);
  const byDate = new Map();
  let months;
  try {
    months = await readdir(root);
  } catch {
    return byDate;
  }
  for (const month of months) {
    let files;
    try {
      files = await readdir(join(root, month));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const rec = JSON.parse(await readFile(join(root, month, file), 'utf8'));
      byDate.set(rec.date, rec);
    }
  }
  return byDate;
}

const fmtHM = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const target = await loadStation(TARGET_SLUG);
  if (!target.size) {
    console.error(`❌ No archive found at ${join(ARCHIVE_ROOT, TARGET_SLUG)}. Run scripts/archive-ecowitt.mjs first.`);
    process.exit(1);
  }

  const neighbors = [];
  for (const slug of NEIGHBOR_SLUGS) neighbors.push(await loadStation(slug));

  const rows = [];
  const dayLabels = [];
  let unobserved = 0;

  for (const date of [...target.keys()].sort()) {
    const rec = target.get(date);
    const label = labelDay(rec, { threshold: args.threshold });

    // §4.2: unobserved is NOT a negative. Excluded entirely rather than counted as a calm day.
    if (label.label === null) {
      unobserved++;
      continue;
    }
    dayLabels.push(label);

    const day = parseArchiveDate(date);
    const sunrise = calcSunrise(day, SUNRISE_COORDS.lat, SUNRISE_COORDS.lng);
    const sunriseTs = sunrise ? Math.floor(sunrise.getTime() / 1000) : null;

    const neighborSeries = neighbors
      .map((n) => n.get(date))
      .filter((r) => r && r.status === 'ok' && r.points?.length)
      .map((r) => r.points);

    for (let m = CALL_START_MIN; m <= CALL_END_MIN; m += CALL_STEP_MIN) {
      const callTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60, 0);
      const callTs = Math.floor(callTime.getTime() / 1000);

      const features = computeFeatures(rec.points, callTs, {
        station: rec.station,
        threshold: args.threshold,
        sunriseTs,
        neighborSeries,
      });
      // No readings yet at this hour — a real morning would have nothing to look at either.
      if (!features) continue;

      const call = callRule(features, { threshold: args.threshold });
      rows.push(
        buildLogRow({
          source: 'backtest',
          date,
          callTime: fmtHM(m),
          station: rec.station,
          threshold: args.threshold,
          features,
          call,
          label,
        })
      );
    }
  }

  await mkdir(join(args.out, '..'), { recursive: true });
  await writeFile(args.out, csvHeader() + rows.map(toCsvRow).join(''));

  const positives = dayLabels.filter((l) => l.label).length;
  const missedByGate = dayLabels.filter((l) => l.missedDueToGate).length;

  console.log('='.repeat(72));
  console.log(`BACKTEST — DP Soda Lakes, threshold ${args.threshold} mph`);
  console.log('='.repeat(72));
  console.log(`Scored days:        ${dayLabels.length}`);
  console.log(`Excluded (unobserved, never counted as calm): ${unobserved}`);
  console.log(`Rideable mornings:  ${positives} (${((positives / dayLabels.length) * 100).toFixed(1)}% base rate, gate-conditioned)`);
  console.log(`Blew well but before the gate opened: ${missedByGate}`);
  console.log(`Rows written:       ${rows.length} → ${args.out}`);
  console.log(`\nNext: node scripts/score-backtest.mjs`);
}

main().catch((err) => {
  console.error(`❌ Backtest failed: ${err.stack}`);
  process.exit(1);
});
