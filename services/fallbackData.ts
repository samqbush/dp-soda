/**
 * Last resort fallback data
 * This minimal data is used when all other data fetching methods fail
 * It provides enough data for the app to function at a basic level
 */

import { WindDataPoint } from "@/services/windService";

/**
 * Returns emergency fallback data with fresh timestamps computed at call time.
 */
export function getEmergencyFallbackData(): WindDataPoint[] {
  const now = Date.now();
  return [
    {
      time: new Date(now).toISOString(),
      windSpeed: 10.5,
      windGust: 12.3,
      windDirection: 225
    },
    {
      time: new Date(now - 3600000).toISOString(),
      windSpeed: 9.8,
      windGust: 11.7,
      windDirection: 220
    },
    {
      time: new Date(now - 7200000).toISOString(),
      windSpeed: 8.2,
      windGust: 10.5,
      windDirection: 215
    },
    {
      time: new Date(now - 10800000).toISOString(),
      windSpeed: 7.5,
      windGust: 9.8,
      windDirection: 225
    },
    {
      time: new Date(now - 14400000).toISOString(),
      windSpeed: 11.2,
      windGust: 14.0,
      windDirection: 230
    },
    {
      time: new Date(now - 18000000).toISOString(),
      windSpeed: 12.5,
      windGust: 16.2,
      windDirection: 235
    }
  ];
}

export default getEmergencyFallbackData;

