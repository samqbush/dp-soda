/**
 * Sunrise/Sunset Service
 * Fetches sunrise and sunset times for Morrison, Colorado using the sunrise-sunset.org API
 */

import axios from 'axios';

// Morrison, Colorado coordinates (from existing NOAA scripts)
const MORRISON_COORDS = {
  lat: 39.6547,
  lon: -105.1956
};

export interface SunriseData {
  sunrise: string; // ISO string
  sunset: string; // ISO string
  sunriseTime: Date;
  sunsetTime: Date;
  formatted: {
    sunrise: string; // User-friendly format (e.g., "6:45 AM")
    sunset: string;  // User-friendly format (e.g., "7:30 PM")
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
 * Fetch sunrise and sunset times for Morrison, Colorado
 */
export async function fetchSunriseData(): Promise<SunriseData | null> {
  try {
    console.log('🌅 Fetching sunrise data for Morrison, CO...');
    
    const response = await axios.get<SunriseApiResponse>(
      'https://api.sunrise-sunset.org/json',
      {
        params: {
          lat: MORRISON_COORDS.lat,
          lng: MORRISON_COORDS.lon,
          formatted: 0 // Request UTC times
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'DawnPatrol/1.0'
        }
      }
    );

    if (response.data.status !== 'OK') {
      console.error('❌ Sunrise API returned error status:', response.data.status);
      return null;
    }

    const { sunrise, sunset } = response.data.results;
    
    // Convert UTC times to Date objects
    const sunriseTime = new Date(sunrise);
    const sunsetTime = new Date(sunset);

    // Format for display (convert to local time)
    const formatTime = (date: Date): string => {
      return date.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Denver' // Morrison, CO is in Mountain Time
      });
    };

    const result: SunriseData = {
      sunrise,
      sunset,
      sunriseTime,
      sunsetTime,
      formatted: {
        sunrise: formatTime(sunriseTime),
        sunset: formatTime(sunsetTime)
      }
    };

    console.log('✅ Sunrise data fetched successfully:', result.formatted);
    return result;

  } catch (error) {
    console.error('❌ Failed to fetch sunrise data:', error);
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
 * Check if the current time is after sunset
 */
export function isAfterSunset(sunriseData: SunriseData | null): boolean {
  if (!sunriseData) return false;
  return new Date() > sunriseData.sunsetTime;
}

/**
 * Get time until sunrise in minutes
 */
export function getMinutesUntilSunrise(sunriseData: SunriseData | null): number | null {
  if (!sunriseData) return null;
  const now = new Date();
  const diff = sunriseData.sunriseTime.getTime() - now.getTime();
  return Math.floor(diff / 60000); // Convert to minutes
}