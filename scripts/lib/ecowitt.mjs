/**
 * Shared Ecowitt API client.
 *
 * Extracted so the live skill (`.github/skills/dp-katabatic-check/scripts/katabatic-check.mjs`),
 * the archiver, and the backtest all speak to the API the same way. If they drift, the backtest
 * stops testing the thing that actually runs in the morning.
 *
 * See research/katabatic-prediction.md §4.1–§4.3 for the measured API behaviour encoded here.
 */

import axios from 'axios';
import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SUNRISE_COORDS } from './sunrise.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(__dirname, '..', '..');

config({ path: join(REPO_ROOT, '.env') });

const BASE_URL = 'https://api.ecowitt.net/api/v3';

export { SUNRISE_COORDS };

// Ecowitt unit ids. The parameter names matter: `wind_unit` / `temp_unit` are silently
// ignored by the API, which previously caused a 2.237x over-reporting bug (mph read as m/s).
// Always use the *_unitid names. See SKILL.md "Notes on the data source".
export const UNITS = {
  wind_speed_unitid: '9', // mph
  temp_unitid: '2', // Fahrenheit
  pressure_unitid: '3', // hPa
};

export class EcowittError extends Error {
  constructor(message, { retryable = false, rateLimited = false } = {}) {
    super(message);
    this.name = 'EcowittError';
    this.retryable = retryable;
    this.rateLimited = rateLimited;
  }
}

/**
 * Ecowitt enforces an undocumented call-rate cap and reports it in the message body with
 * `code !== 0`, NOT as an HTTP 429. Measured 2026-07-31 during the first full backfill: a run at
 * ~3 req/s died partway with "The number of interface accesses reached the upper limit".
 *
 * This must be distinguished from a genuine empty day, or a throttle would be silently archived
 * as "the station reported nothing" — which §4.2 forbids in the strongest terms.
 */
export function isRateLimitMessage(msg = '') {
  return /upper limit|frequency|too many|rate limit/i.test(msg);
}

export function assertCredentials() {
  if (!process.env.ECOWITT_APPLICATION_KEY || !process.env.ECOWITT_API_KEY) {
    throw new EcowittError(
      `Missing ECOWITT_APPLICATION_KEY / ECOWITT_API_KEY. Expected them in ${join(REPO_ROOT, '.env')} (see .env.example).`
    );
  }
}

function creds() {
  return {
    application_key: process.env.ECOWITT_APPLICATION_KEY,
    api_key: process.env.ECOWITT_API_KEY,
  };
}

/** Ecowitt wants local wall-clock time in `YYYY-MM-DD HH:mm:ss`, not ISO/UTC. */
export function fmtEcowittDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Distinguish a genuine empty response (station was off) from a transport failure.
 * This matters enormously: §4.2 requires that "no data" is recorded as *unobserved*,
 * never as calm — and an API error must never be mistaken for either.
 */
async function withRetry(fn, { attempts = 4, baseDelayMs = 1000, label = 'request', onRateLimit = null } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err.rateLimited) {
        // Backing off a second is useless against a rate cap — it needs a real cooldown, and
        // burning retries on it just deepens the hole.
        const cooldown = RATE_LIMIT_COOLDOWN_MS;
        if (onRateLimit) onRateLimit(cooldown, i);
        await sleep(cooldown);
        continue;
      }
      const retryable = err.retryable !== false;
      if (!retryable || i === attempts - 1) break;
      await sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  throw new EcowittError(`${label} failed after ${attempts} attempts: ${lastErr?.message}`, {
    retryable: true,
    rateLimited: !!lastErr?.rateLimited,
  });
}

export const RATE_LIMIT_COOLDOWN_MS = 65000;

export async function getDevices() {
  assertCredentials();
  return withRetry(
    async () => {
      const res = await axios.get(`${BASE_URL}/device/list`, { params: creds(), timeout: 15000 });
      if (res.data.code !== 0) throw new EcowittError(`device list error: ${res.data.msg}`);
      return res.data.data?.list || [];
    },
    { label: 'device list' }
  );
}

/** All stations this project tracks. Name prefix is the existing convention. */
export async function getDpDevices() {
  const devices = await getDevices();
  return devices.filter((d) => /^DP /i.test(d.name));
}

export async function findDevice(nameFragment) {
  const devices = await getDevices();
  const match = devices.find((d) => d.name.toLowerCase().includes(nameFragment.toLowerCase()));
  if (!match) {
    throw new EcowittError(`No station matching "${nameFragment}". Available: ${devices.map((d) => d.name).join(', ')}`);
  }
  return match;
}

/**
 * Fetch a window of history. Returns `{ points, cycleType }`.
 *
 * `points` may legitimately be empty — that is data, not an error (see §4.2). Callers must
 * decide what an empty result means based on the date; this function will not guess.
 */
export async function getHistory(mac, start, end, { cycleType = 'auto', onRateLimit = null } = {}) {
  assertCredentials();
  return withRetry(
    async () => {
      const res = await axios.get(`${BASE_URL}/device/history`, {
        params: {
          ...creds(),
          mac,
          start_date: fmtEcowittDate(start),
          end_date: fmtEcowittDate(end),
          cycle_type: cycleType,
          call_back: 'wind,outdoor',
          ...UNITS,
        },
        timeout: 25000,
      });
      if (res.data.code !== 0) {
        throw new EcowittError(`history error: ${res.data.msg}`, { rateLimited: isRateLimitMessage(res.data.msg) });
      }

      const d = res.data.data || {};
      const speed = d.wind?.wind_speed?.list || {};
      const gust = d.wind?.wind_gust?.list || {};
      const dir = d.wind?.wind_direction?.list || {};
      const temp = d.outdoor?.temperature?.list || {};
      const rh = d.outdoor?.humidity?.list || {};

      const points = Object.keys(speed)
        .map((ts) => ({
          ts: parseInt(ts, 10),
          speed: parseFloat(speed[ts]),
          gust: parseFloat(gust[ts] ?? speed[ts]),
          dir: parseFloat(dir[ts]),
          temp: temp[ts] !== undefined ? parseFloat(temp[ts]) : null,
          rh: rh[ts] !== undefined ? parseFloat(rh[ts]) : null,
        }))
        .filter((p) => Number.isFinite(p.speed))
        .sort((a, b) => a.ts - b.ts);

      return { points, cycleType: inferCycleType(points) };
    },
    { label: `history ${fmtEcowittDate(start)}`, onRateLimit }
  );
}

/**
 * Resolution decays with age (§4.1): ~5 min for the first ~90 days, ~30 min after.
 * Record what we actually got rather than what we asked for, so the archive is self-describing.
 */
export function inferCycleType(points) {
  if (points.length < 2) return null;
  const gaps = [];
  for (let i = 1; i < points.length; i++) gaps.push(points[i].ts - points[i - 1].ts);
  gaps.sort((a, b) => a - b);
  const medianSec = gaps[Math.floor(gaps.length / 2)];
  if (medianSec <= 450) return '5min';
  if (medianSec <= 2700) return '30min';
  return `${Math.round(medianSec / 60)}min`;
}

export async function getSunrise(date = new Date()) {
  try {
    const p = (n) => String(n).padStart(2, '0');
    const res = await axios.get('https://api.sunrise-sunset.org/json', {
      params: {
        lat: SUNRISE_COORDS.lat,
        lng: SUNRISE_COORDS.lng,
        date: `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`,
        formatted: 0,
      },
      timeout: 8000,
    });
    return res.data?.status === 'OK' ? new Date(res.data.results.sunrise) : null;
  } catch {
    return null; // Non-fatal: sunrise is context, not a gate.
  }
}
