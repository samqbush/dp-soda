/**
 * Local sunrise calculation (NOAA solar position algorithm).
 *
 * The backtest needs sunrise for ~400 mornings. Hitting api.sunrise-sunset.org that many times
 * is slow and adds a network dependency to a computation that is pure math, so this replaces it
 * for bulk work. The live skill still uses the API for the single morning it cares about.
 *
 * Accurate to well under a minute at these latitudes, which is far tighter than the ±85 min
 * spread of the katabatic window close (§4.5) — so precision is not a limiting factor here.
 */

const DEG = Math.PI / 180;

/**
 * Morrison, CO — the drainage basin all the DP stations sit in.
 *
 * Lives here rather than in ecowitt.mjs so that pure-computation consumers (the label, the
 * backtest, the unit tests) can use it without dragging in axios, dotenv and `import.meta`.
 */
export const SUNRISE_COORDS = { lat: 39.6547, lng: -105.1956 };

function toJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function fromJulian(j) {
  return new Date((j - 2440587.5) * 86400000);
}

/**
 * @param {Date}   date Local date (only Y/M/D are used)
 * @param {number} lat  Degrees north
 * @param {number} lng  Degrees east (negative for the western hemisphere)
 * @returns {Date|null} Local sunrise, or null above/below the polar circles where none occurs
 */
export function calcSunrise(date, lat, lng) {
  const noonLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const n = Math.round(toJulian(noonLocal) - 2451545.0 + 0.0008);

  // Solar mean anomaly
  const Jstar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Jstar) % 360;

  // Equation of the center and ecliptic longitude
  const C = 1.9148 * Math.sin(M * DEG) + 0.02 * Math.sin(2 * M * DEG) + 0.0003 * Math.sin(3 * M * DEG);
  const lambda = (M + C + 180 + 102.9372) % 360;

  // Solar transit
  const Jtransit = 2451545.0 + Jstar + 0.0053 * Math.sin(M * DEG) - 0.0069 * Math.sin(2 * lambda * DEG);

  // Declination of the sun
  const sinDec = Math.sin(lambda * DEG) * Math.sin(23.44 * DEG);
  const cosDec = Math.cos(Math.asin(sinDec));

  // Hour angle, using the standard -0.833° altitude for refraction and solar radius
  const cosOmega = (Math.sin(-0.833 * DEG) - Math.sin(lat * DEG) * sinDec) / (Math.cos(lat * DEG) * cosDec);
  if (cosOmega > 1 || cosOmega < -1) return null; // polar day/night

  const omega = Math.acos(cosOmega) / DEG;
  return fromJulian(Jtransit - omega / 360);
}
