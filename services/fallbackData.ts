/**
 * Last resort fallback data
 * This minimal data is used when all other data fetching methods fail
 * It provides enough data for the app to function at a basic level
 */

import { WindDataPoint } from "@/services/windService";

// Safe fallback data with minimal set of points
export const EMERGENCY_FALLBACK_DATA: WindDataPoint[] = [
  {
    time: new Date().toISOString(),
    windSpeed: "10.5",
    windGust: "12.3",
    windDirection: "225"
  },
  {
    time: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    windSpeed: "9.8",
    windGust: "11.7",
    windDirection: "220"
  },
  {
    time: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    windSpeed: "8.2",
    windGust: "10.5",
    windDirection: "215"
  },
  {
    time: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    windSpeed: "7.5",
    windGust: "9.8",
    windDirection: "225"
  },
  {
    time: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    windSpeed: "11.2",
    windGust: "14.0",
    windDirection: "230"
  },
  {
    time: new Date(Date.now() - 18000000).toISOString(), // 5 hours ago
    windSpeed: "12.5",
    windGust: "16.2",
    windDirection: "235"
  }
];

export default EMERGENCY_FALLBACK_DATA;
