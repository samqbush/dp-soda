/**
 * Sunrise/Sunset Service
 * Fetches sunrise and sunset times for Morrison, Colorado using the sunrise-sunset.org API
 */

import axios from 'axios';

// Morrison, Colorado coordinates (same as NOAA scripts)
const MORRISON_COORDS = {
  lat: 39.6547,
  lng: -105.1956
};

export interface SunriseData {
  sunrise: string; // ISO string from API
  sunset: string;
  sunriseTime: Date;
  sunsetTime: Date;
  formatted: {
    sunrise: string; // e.g., "6:45 AM"
    sunset: string;  // e.g., "7:30 PM"
  };
}

interface SunriseApiResponse {
  results: {
    sunrise: string;
    sunset: string;
    solar_noon: string;
    day_length: string;
    civil_twilight_begin: string;
    civil_twilight_end: string;
    nautical_twilight_begin: string;
    nautical_twilight_end: string;
    astronomical_twilight_begin: string;
    astronomical_twilight_end: string;
  };
  status: string;
}

/**
 * Format a Date to a user-friendly time string in Mountain Time
 */
const formatMountainTime = (date: Date): string => {
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Denver'
  });
};

/**
 * Fetch sunrise and sunset times for Morrison, Colorado
 * Returns null on failure (graceful degradation)
 */
export async function fetchSunriseData(): Promise<SunriseData | null> {
  try {
    const response = await axios.get<SunriseApiResponse>(
      'https://api.sunrise-sunset.org/json',
      {
        params: {
          lat: MORRISON_COORDS.lat,
          lng: MORRISON_COORDS.lng,
          formatted: 0 // Request ISO 8601 UTC times
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'DawnPatrol/1.0'
        }
      }
    );

    if (response.data.status !== 'OK') {
      console.error('Sunrise API returned error status:', response.data.status);
      return null;
    }

    const { sunrise, sunset } = response.data.results;
    const sunriseTime = new Date(sunrise);
    const sunsetTime = new Date(sunset);

    return {
      sunrise,
      sunset,
      sunriseTime,
      sunsetTime,
      formatted: {
        sunrise: formatMountainTime(sunriseTime),
        sunset: formatMountainTime(sunsetTime)
      }
    };
  } catch (error) {
    console.error('Failed to fetch sunrise data:', error);
    return null;
  }
}

/**
 * Check if the current time is before sunrise
 */
export function isBeforeSunrise(sunriseData: SunriseData | null): boolean {
  if (!sunriseData) return false;
  return new Date() < sunriseData.sunriseTime;
}

/**
 * Get minutes until sunrise (negative if past sunrise)
 */
export function getMinutesUntilSunrise(sunriseData: SunriseData | null): number | null {
  if (!sunriseData) return null;
  const diff = sunriseData.sunriseTime.getTime() - Date.now();
  return Math.floor(diff / 60000);
}
