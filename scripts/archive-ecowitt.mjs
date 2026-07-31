#!/usr/bin/env node

/**
 * Ecowitt archiver — builds a local, committed copy of the DP station history.
 *
 * Why this exists (research/katabatic-prediction.md §4.4): Ecowitt is a single point of failure,
 * and the Jan–Feb gap is proof the data is not guaranteed to exist later. This is insurance
 * against loss, and it is the substrate every backtest and P(hold) analysis reads from.
 *
 * Design constraints, all measured rather than assumed:
 *  - §4.3 Responses are size-capped (a 7-day 5min request returned 336 points, not 2016), so
 *    pulls MUST be chunked per-day and rate-limited.
 *  - §4.1 Resolution decays with age (5min → 30min after ~90 days). The 30-minute rows are true
 *    averages, not samples, and are decision-equivalent, so they are stored as first-class data.
 *  - §4.2 The winter shutdown is recorded as `unobserved`, never as calm and never as an error.
 *
 * Usage:
 *   node scripts/archive-ecowitt.mjs                      # backfill everything missing
 *   node scripts/archive-ecowitt.mjs --days 3             # just the last 3 days (daily append)
 *   node scripts/archive-ecowitt.mjs --from 2025-11-01 --to 2025-12-31
 *   node scripts/archive-ecowitt.mjs --station "DP Soda Lakes"
 *   node scripts/archive-ecowitt.mjs --force              # re-fetch days already on disk
 */

import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { join } from 'path';
import {
  REPO_ROOT,
  getDpDevices,
  getHistory,
  sleep,
  EcowittError,
  assertResearchCredentials,
} from './lib/ecowitt.mjs';
import { classifyEmptyDay } from './lib/season.mjs';

const ARCHIVE_ROOT = join(REPO_ROOT, 'data', 'ecowitt-archive');

// Politeness delay between per-day requests. The archive is a background chore; there is no
// reason to hammer a free API for it.
//
// Measured 2026-07-31: a full backfill at ~350ms/request tripped an undocumented Ecowitt rate
// cap ("The number of interface accesses reached the upper limit") after a few hundred calls.
// This is NOT in §4.3, which only documented the response-size cap. Backing off to a slower
// steady rate plus a real cooldown on 429-equivalents is what makes a 1300-request backfill
// survivable. Override with --delay if the limit ever changes.
const DEFAULT_REQUEST_DELAY_MS = 1200;

// Earliest date worth asking for — the Soda device was created 2025-06-09 (§4.2).
const DEFAULT_START = '2025-06-01';

function parseArgs(argv) {
  const args = { station: null, force: false, from: null, to: null, days: null, dryRun: false, delay: DEFAULT_REQUEST_DELAY_MS };
  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === '--station' && next) args.station = next;
    if (argv[i] === '--from' && next) args.from = next;
    if (argv[i] === '--to' && next) args.to = next;
    if (argv[i] === '--days' && next) args.days = parseInt(next, 10);
    if (argv[i] === '--delay' && next) args.delay = parseInt(next, 10);
    if (argv[i] === '--force') args.force = true;
    if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

const p2 = (n) => String(n).padStart(2, '0');
export const isoDay = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const isoMonth = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;

/** Filesystem-safe station slug: "DP Soda Lakes" -> "dp-soda-lakes". */
export function stationSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function dayFilePath(stationName, date) {
  return join(ARCHIVE_ROOT, stationSlug(stationName), isoMonth(date), `${isoDay(date)}.json`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function parseDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function eachDay(from, to) {
  const days = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cur <= to) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/**
 * Fetch and persist one station-day.
 *
 * Returns a summary describing what happened. An empty response is a legitimate, recordable
 * outcome — it is classified via `classifyEmptyDay`, never written as calm, and never thrown.
 * A transport failure is a *different* thing and is reported as `error` so the run summary can
 * surface it for a retry, rather than being silently baked into the archive as absence.
 */
async function archiveDay(device, date, { force = false, dryRun = false } = {}) {
  const path = dayFilePath(device.name, date);

  if (!force && (await exists(path))) return { day: isoDay(date), status: 'skipped-exists' };

  // Days before the device existed are not "missing data" — there was no station yet. Don't
  // request them, and don't let them pollute the unexplained-gap report.
  if (device.createtime) {
    const created = new Date(device.createtime * 1000);
    const createdDay = new Date(created.getFullYear(), created.getMonth(), created.getDate());
    if (date < createdDay) return { day: isoDay(date), status: 'pre-creation' };
  }

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  let points;
  let cycleType;
  try {
    ({ points, cycleType } = await getHistory(device.mac, start, end, {
      onRateLimit: (ms) => console.log(`   ⏳ rate limited — cooling down ${Math.round(ms / 1000)}s (${isoDay(date)})`),
    }));
  } catch (err) {
    return { day: isoDay(date), status: 'error', message: err.message, rateLimited: !!err.rateLimited };
  }

  const base = {
    station: device.name,
    mac: device.mac,
    date: isoDay(date),
    fetched_at: new Date().toISOString(),
  };

  const record = points.length
    ? { ...base, status: 'ok', cycle_type: cycleType, point_count: points.length, points }
    : { ...base, ...classifyEmptyDay(date, device.name), cycle_type: null, point_count: 0, points: [] };

  if (!dryRun) {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, `${JSON.stringify(record, null, 0)}\n`);
  }

  return { day: isoDay(date), status: record.status, reason: record.reason, points: points.length, cycleType };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Gate before a single request goes out. This job is the heaviest Ecowitt consumer in the repo
  // and Ecowitt rate-limits per account, so running it on the keys compiled into the shipped app
  // risks taking wind data down for every installed app. Refuse rather than warn.
  try {
    assertResearchCredentials();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  let devices;
  try {
    devices = await getDpDevices();
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }

  if (args.station) {
    devices = devices.filter((d) => d.name.toLowerCase().includes(args.station.toLowerCase()));
    if (!devices.length) {
      console.error(`❌ No DP station matching "${args.station}".`);
      process.exit(1);
    }
  }

  const today = new Date();
  let from;
  let to = args.to ? parseDay(args.to) : new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (args.days) {
    from = new Date(to);
    from.setDate(from.getDate() - (args.days - 1));
  } else {
    from = parseDay(args.from || DEFAULT_START);
  }

  console.log(`Archiving ${devices.length} station(s) from ${isoDay(from)} to ${isoDay(to)}${args.force ? ' (force)' : ''}${args.dryRun ? ' (dry run)' : ''}`);

  const errors = [];
  const unexplained = [];
  let rateLimitAborted = false;

  for (const device of devices) {
    if (rateLimitAborted) break;
    const days = eachDay(from, to);
    const tally = { ok: 0, unobserved: 0, 'no-data': 0, 'skipped-exists': 0, 'pre-creation': 0, error: 0 };

    for (const day of days) {
      const res = await archiveDay(device, day, { force: args.force, dryRun: args.dryRun });
      tally[res.status] = (tally[res.status] || 0) + 1;

      if (res.status === 'error') errors.push({ station: device.name, ...res });
      // §4.2: an unexplained empty day is the one case a human should actually look at.
      if (res.status === 'no-data') unexplained.push({ station: device.name, day: res.day });

      // If the cooldown didn't clear the cap, grinding on just wastes quota. The archive is
      // idempotent, so stopping and resuming later loses nothing.
      if (res.status === 'error' && res.rateLimited) {
        console.log(`\n⏹  Still rate limited after cooldown. Stopping cleanly — re-run to resume where this left off.`);
        rateLimitAborted = true;
        break;
      }

      if (res.status !== 'skipped-exists' && res.status !== 'pre-creation') await sleep(args.delay);
    }

    console.log(
      `${device.name.padEnd(20)} ok ${tally.ok}  unobserved ${tally.unobserved}  no-data ${tally['no-data']}  ` +
        `skipped ${tally['skipped-exists']}  pre-creation ${tally['pre-creation']}  errors ${tally.error}`
    );
  }

  if (unexplained.length) {
    console.log(`\n⚠️  ${unexplained.length} unexplained empty day(s) — outside the known seasonal shutdown:`);
    for (const u of unexplained.slice(0, 20)) console.log(`   ${u.station} ${u.day}`);
    if (unexplained.length > 20) console.log(`   ... and ${unexplained.length - 20} more`);
    console.log('   These are recorded as "no-data" (unobserved), never as calm. Worth a look.');
  }

  if (errors.length) {
    console.log(`\n❌ ${errors.length} day(s) failed to fetch. These were NOT written to the archive —`);
    console.log('   re-run to retry. A fetch failure must never be archived as absence of wind.');
    for (const e of errors.slice(0, 10)) console.log(`   ${e.station} ${e.day}: ${e.message}`);
    process.exitCode = 1;
  }
}

// Only run when invoked directly, so the helpers above stay importable by the backtest.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`❌ Archive failed: ${err instanceof EcowittError ? err.message : err.stack}`);
    process.exit(1);
  });
}
