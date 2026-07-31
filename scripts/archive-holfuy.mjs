#!/usr/bin/env node

/**
 * Holfuy archiver — builds a local, committed copy of the ridge-top stations that Ecowitt
 * cannot see.
 *
 * WHY THIS EXISTS
 *
 * The Ecowitt meters sit at lake level. The katabatic flow that decides whether Soda fires is a
 * drainage current coming off the foothills, so the interesting sensor is the one *upstream and
 * above* the lake. Lookout Mtn (Holfuy 1295, run by RMHPA) is exactly that station, and the
 * local paragliding community already uses its overnight reading as a go/no-go signal.
 *
 * Measured 2026-07-31, on 12 months of archive, as overnight (00:00-05:00) predictors of the
 * 06:00-08:00 session at Soda — area under ROC, 0.50 being a coin flip:
 *
 *     Soda's own meter                0.729
 *     Golden ridge PWS (KCOGOLDE269)  0.627
 *     Hwy 93 @ 72 RWIS (CO109)        0.587
 *     Rooney Rd RWIS (CO008)          0.551
 *
 * Every accessible *substitute* for Lookout is worse than simply reading our own meter, and
 * combining them made it worse still. Lookout itself is the one candidate that has never been
 * tested at n > 6, because it is the only one that is genuinely ridge-top inside the drainage.
 * That is the entire reason for this script.
 *
 * THE PERISHABILITY PROBLEM — this is worse than Ecowitt's
 *
 * Holfuy's public feed exposes a rolling window of about **5.9 days** and nothing else. There is
 * no backfill, no archive endpoint we can reach, and no third-party mirror (checked: every
 * public Holfuy integration is a live display, not an archive). The `archive/` API *does* support
 * date ranges, but access is a per-station flag the owner controls and 1295 returns
 * `{"error":"No access"}`. Until RMHPA grants a password, **a day not captured within ~5 days is
 * gone permanently.** That makes the weekly cadence that is adequate for Ecowitt actively unsafe
 * here, which is why the workflow runs daily.
 *
 * Running daily buys resolution as well as safety: the feed carries ~1-minute rows for the most
 * recent day or two and thins to 15-minute rows further back. Days are merged rather than
 * overwritten, so a day first seen at 1-minute keeps its 1-minute detail forever.
 *
 * Usage:
 *   node scripts/archive-holfuy.mjs
 *   node scripts/archive-holfuy.mjs --station lookout-mtn
 *   node scripts/archive-holfuy.mjs --dry-run
 */

import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const ARCHIVE_ROOT = join(REPO_ROOT, 'data', 'holfuy-archive');

/**
 * Stations worth carrying. Keep this list short and justified — every entry is a permanent
 * commitment to a daily fetch, and an unused one is just noise in the diff.
 */
const STATIONS = [
  {
    slug: 'lookout-mtn',
    holfuyId: 1295,
    name: 'Lookout Mtn - RMHPA',
    // Rocky Mountain Hang gliding & Paragliding Assoc. launch, above Golden. ~7,400 ft, roughly
    // 2,000 ft above Soda and upstream of the Bear Creek drainage.
    lat: 39.7392,
    lon: -105.2419,
    timezone: 'America/Denver',
  },
];

// Holfuy serves the raw feed in metric regardless of the display units on the website; the
// browser converts client-side (holfuy.com/js/main.js, speedToUnit). The Ecowitt archive is
// stored imperial, so convert here and keep the two archives directly comparable.
const KMH_TO_MPH = 1 / 1.609;
const cToF = (c) => (c * 9) / 5 + 32;

function parseArgs(argv) {
  const args = { station: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const next = argv[i + 1];
    if (argv[i] === '--station' && next) args.station = next;
    if (argv[i] === '--dry-run') args.dryRun = true;
  }
  return args;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** UTC offset in seconds that `zone` was observing at `epochSeconds`. */
function zoneOffsetSeconds(epochSeconds, zone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    timeZoneName: 'longOffset',
  }).formatToParts(new Date(epochSeconds * 1000));
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+00:00';
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60);
}

/**
 * Holfuy timestamps are station-local wall clock ("2026/07/26 04:15:00") with no offset, so they
 * must be resolved against the station's zone or every DST-season day lands an hour out. Iterate
 * because the offset depends on the very instant being solved for.
 */
function localToEpoch(stamp, zone) {
  const [datePart, timePart] = stamp.trim().split(' ');
  if (!datePart || !timePart) return null;
  const [Y, Mo, D] = datePart.split('/').map(Number);
  const [h, mi, s] = timePart.split(':').map(Number);
  if ([Y, Mo, D, h, mi].some(Number.isNaN)) return null;

  const asUtc = Date.UTC(Y, Mo - 1, D, h, mi, s || 0) / 1000;
  let ts = asUtc;
  for (let i = 0; i < 3; i++) ts = asUtc - zoneOffsetSeconds(ts, zone);
  return ts;
}

/** Calendar day, in the station's own timezone, that an instant belongs to. */
function localDay(epochSeconds, zone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochSeconds * 1000));
  const g = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${g.year}-${g.month}-${g.day}`;
}

/** Pull one `var name = [...]` array out of the feed. */
function extractArray(source, name) {
  const m = source.match(new RegExp(`var\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!m) return null;
  return m[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
}

const num = (v) => {
  if (v === undefined || v === null || v === '' || v === 'null') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Fetch and parse the rolling public feed.
 *
 * Deliberately throws rather than returning an empty set on failure. A network error must never
 * be recorded as "the wind was calm" — same rule as the Ecowitt archiver (§4.2).
 */
async function fetchStation(station) {
  const url = `https://holfuy.com/dynamic/graphs/tdarr${station.holfuyId}.js`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'dp-soda-research/1.0 (katabatic archive)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const body = await res.text();
  const times = extractArray(body, 'unt');
  if (!times || !times.length) throw new Error(`No timestamps in feed for station ${station.holfuyId}`);

  const speed = extractArray(body, 'gd_speed') ?? [];
  const gust = extractArray(body, 'gd_gust') ?? [];
  const dir = extractArray(body, 'gd_direction') ?? [];
  const temp = extractArray(body, 'gd_temp') ?? [];
  const rh = extractArray(body, 'gd_humidity') ?? [];
  const solar = extractArray(body, 'gd_solar') ?? [];

  const points = [];
  for (let i = 0; i < times.length; i++) {
    const ts = localToEpoch(times[i], station.timezone);
    if (ts === null) continue;
    const s = num(speed[i]);
    // A row with no wind reading is not a calm row — it is an absent row. Drop it.
    if (s === null) continue;
    const g = num(gust[i]);
    const t = num(temp[i]);
    points.push({
      ts,
      speed: Math.round(s * KMH_TO_MPH * 10) / 10,
      gust: g === null ? null : Math.round(g * KMH_TO_MPH * 10) / 10,
      dir: num(dir[i]),
      temp: t === null ? null : Math.round(cToF(t) * 10) / 10,
      rh: num(rh[i]),
      // Solar is not decoration: katabatic flow dies when the sun loads the slopes, so this is
      // the direct observable behind the sunrise-versus-gate mechanism (§4.5a).
      solar: num(solar[i]),
    });
  }
  return points;
}

/** Median sample spacing, reported the same way the Ecowitt archive reports `cycle_type`. */
function inferCycle(points) {
  if (points.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < points.length; i++) gaps.push(points[i].ts - points[i - 1].ts);
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  if (median <= 90) return '1min';
  if (median <= 400) return '5min';
  if (median <= 1200) return '15min';
  return `${Math.round(median / 60)}min`;
}

/**
 * Merge new points into whatever is already on disk, keyed by timestamp.
 *
 * This is what makes a coarse re-read harmless. The feed thins from ~1-minute to 15-minute rows
 * as a day ages, so a day captured today at full detail would be silently degraded by a naive
 * overwrite three days later. Union-by-timestamp means resolution only ever improves.
 */
function mergePoints(existing, fresh) {
  const byTs = new Map();
  for (const p of existing) byTs.set(p.ts, p);
  for (const p of fresh) byTs.set(p.ts, p);
  return [...byTs.values()].sort((a, b) => a.ts - b.ts);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stations = args.station
    ? STATIONS.filter((s) => s.slug === args.station || String(s.holfuyId) === args.station)
    : STATIONS;

  if (!stations.length) {
    console.error(`❌ No Holfuy station matching "${args.station}".`);
    process.exit(1);
  }

  let failed = 0;

  for (const station of stations) {
    let points;
    try {
      points = await fetchStation(station);
    } catch (err) {
      // Loud, and non-zero exit. A silent failure here costs days that cannot be re-fetched.
      console.error(`❌ ${station.slug}: ${err.message}`);
      failed++;
      continue;
    }

    const byDay = new Map();
    for (const p of points) {
      const day = localDay(p.ts, station.timezone);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(p);
    }

    const tally = { new: 0, updated: 0, unchanged: 0 };
    const days = [...byDay.keys()].sort();

    for (const day of days) {
      const path = join(ARCHIVE_ROOT, station.slug, day.slice(0, 7), `${day}.json`);
      const had = await exists(path);

      let existingPoints = [];
      if (had) {
        try {
          existingPoints = JSON.parse(await readFile(path, 'utf8')).points ?? [];
        } catch {
          existingPoints = [];
        }
      }

      const merged = mergePoints(existingPoints, byDay.get(day));
      if (had && merged.length === existingPoints.length) {
        tally.unchanged++;
        continue;
      }

      const record = {
        station: station.name,
        holfuy_id: station.holfuyId,
        slug: station.slug,
        lat: station.lat,
        lon: station.lon,
        date: day,
        fetched_at: new Date().toISOString(),
        status: 'ok',
        cycle_type: inferCycle(merged),
        point_count: merged.length,
        points: merged,
      };

      if (!args.dryRun) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, `${JSON.stringify(record, null, 0)}\n`);
      }
      tally[had ? 'updated' : 'new']++;
    }

    const span = days.length ? `${days[0]} → ${days[days.length - 1]}` : 'none';
    console.log(
      `${station.slug.padEnd(16)} ${String(points.length).padStart(5)} pts  ${span}  ` +
        `new ${tally.new}  updated ${tally.updated}  unchanged ${tally.unchanged}`
    );
  }

  if (failed) {
    console.error(
      `\n❌ ${failed} station(s) failed. Nothing was written for them — days are NOT recorded as calm.\n` +
        '   Re-run soon: the public Holfuy window is only ~5.9 days and does not backfill.'
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(`❌ Holfuy archive failed: ${err.stack}`);
    process.exit(1);
  });
}

export { STATIONS, localToEpoch, mergePoints, inferCycle };
