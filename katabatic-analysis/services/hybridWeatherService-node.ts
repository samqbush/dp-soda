/**
 * Node.js-compatible version of HybridWeatherService
 * Extracted from services/hybridWeatherService.ts for use in scripts
 * Uses the same logic but without React Native/Expo dependencies
 */

import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// NOAA API configuration
const NOAA_BASE_URL = 'https://api.weather.gov';

// Base weather types (extracted from weatherService.ts)
export interface WeatherDataPoint {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  precipitationProbability: number;
  cloudCover: number;
  visibility: number;
  condition: string;
  feelsLike: number;
  uvIndex: number;
}

export interface LocationWeatherData {
  name: string;
  coordinates: { lat: number; lon: number };
  data: WeatherDataPoint[];
}

export interface WeatherServiceData {
  locations: LocationWeatherData[];
  lastUpdated: string;
  source: string;
  reliability: 'high' | 'medium' | 'low';
}

// Location constants - Colorado locations for Dawn Patrol analysis
export const LOCATIONS = {
  SODA_LAKE: { lat: 39.6533, lon: -105.1942, name: 'Soda Lake, CO' },
  MORRISON: { lat: 39.6547, lon: -105.1956, name: 'Morrison, CO' },
  NEDERLAND: { lat: 40.0142, lon: -105.5108, name: 'Nederland, CO' }
};

// NOAA API interfaces
interface NOAAForecastResponse {
  properties: {
    updated: string;
    periods: Array<{
      number: number;
      name: string;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      temperatureTrend?: string;
      probabilityOfPrecipitation?: {
        unitCode: string;
        value: number | null;
      };
      dewpoint?: {
        unitCode: string;
        value: number;
      };
      relativeHumidity?: {
        unitCode: string;
        value: number;
      };
      windSpeed?: string;
      windDirection?: string;
      detailedForecast: string;
    }>;
  };
}

// OpenWeather API interfaces
interface OpenWeatherResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current: {
    dt: number;
    sunrise: number;
    sunset: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
  };
  hourly: Array<{
    dt: number;
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    dew_point: number;
    uvi: number;
    clouds: number;
    visibility: number;
    wind_speed: number;
    wind_deg: number;
    wind_gust?: number;
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    pop: number;
  }>;
}

/**
 * Node.js-compatible Hybrid Weather Service
 */
export class HybridWeatherService {
  private static instance: HybridWeatherService;
  private openWeatherApiKey: string | null = null;

  private constructor() {
    this.initializeApiKeys();
  }

  public static getInstance(): HybridWeatherService {
    if (!HybridWeatherService.instance) {
      HybridWeatherService.instance = new HybridWeatherService();
    }
    return HybridWeatherService.instance;
  }

  private initializeApiKeys(): void {
    try {
      this.openWeatherApiKey = process.env.OPENWEATHER_API_KEY || null;
      
      if (this.openWeatherApiKey) {
        console.log('✅ Hybrid service: OpenWeather API key configured');
      } else {
        console.log('⚠️ Hybrid service: OpenWeather API key not found - limited functionality');
      }
    } catch (error) {
      console.error('❌ Error initializing hybrid weather service:', error);
      this.openWeatherApiKey = null;
    }
  }

  /**
   * Fetch hybrid weather data combining NOAA and OpenWeather
   */
  public async fetchHybridWeatherData(): Promise<WeatherServiceData> {
    console.log('🌤️ Fetching hybrid weather data (NOAA + OpenWeather)...');
    
    const locations: LocationWeatherData[] = [];
    const timestamp = new Date().toISOString();

    // Fetch data for each location
    for (const [key, location] of Object.entries(LOCATIONS)) {
      try {
        console.log(`🎯 Processing ${location.name}...`);
        
        // Get NOAA forecast
        const noaaData = await this.fetchNOAAForecast(location.lat, location.lon);
        
        // Get OpenWeather data for pressure/enhanced details
        const openWeatherData = await this.fetchOpenWeatherData(location.lat, location.lon);
        
        // Combine the data
        const combinedData = this.combineWeatherData(noaaData, openWeatherData, timestamp);
        
        locations.push({
          name: location.name,
          coordinates: { lat: location.lat, lon: location.lon },
          data: combinedData
        });
        
        console.log(`✅ Successfully processed ${location.name}`);
      } catch (error) {
        console.error(`❌ Error processing ${location.name}:`, error);
        // Add fallback data
        locations.push({
          name: location.name,
          coordinates: { lat: location.lat, lon: location.lon },
          data: []
        });
      }
    }

    return {
      locations,
      lastUpdated: timestamp,
      source: 'hybrid-noaa-openweather',
      reliability: 'high'
    };
  }

  private async fetchNOAAForecast(lat: number, lon: number): Promise<NOAAForecastResponse | null> {
    try {
      // First get the office and grid point
      const pointResponse = await axios.get(`${NOAA_BASE_URL}/points/${lat},${lon}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DP-Soda-Lakes-App/1.0 (contact@example.com)'
        }
      });

      const forecastUrl = pointResponse.data.properties.forecast;
      
      // Get the forecast
      const forecastResponse = await axios.get(forecastUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'DP-Soda-Lakes-App/1.0 (contact@example.com)'
        }
      });

      return forecastResponse.data;
    } catch (error) {
      console.error('NOAA API error:', error);
      return null;
    }
  }

  private async fetchOpenWeatherData(lat: number, lon: number): Promise<OpenWeatherResponse | null> {
    if (!this.openWeatherApiKey) {
      console.log('⚠️ No OpenWeather API key - skipping OpenWeather data');
      return null;
    }
    try {
      // Use the free current weather API (2.5)
      const currentResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${this.openWeatherApiKey}&units=imperial`,
        { timeout: 10000 }  
      );

      const current = currentResponse.data;
      
      // Convert free API response to match our expected format
      const mockOneCallResponse: OpenWeatherResponse = {
        lat: current.coord.lat,
        lon: current.coord.lon,
        timezone: 'UTC',
        timezone_offset: 0,
        current: {
          dt: current.dt,
          sunrise: current.sys?.sunrise || 0,
          sunset: current.sys?.sunset || 0,
          temp: current.main.temp,
          feels_like: current.main.feels_like,
          pressure: current.main.pressure,
          humidity: current.main.humidity,
          dew_point: 0, // Not available in free tier
          uvi: 0, // Not available in free tier
          clouds: current.clouds?.all || 0,
          visibility: current.visibility || 10000,
          wind_speed: current.wind?.speed || 0,
          wind_deg: current.wind?.deg || 0,
          weather: [{
            id: current.weather[0]?.id || 800,
            main: current.weather[0]?.main || 'Clear',
            description: current.weather[0]?.description || 'clear sky',
            icon: current.weather[0]?.icon || '01d'
          }]
        },
        hourly: [] // Empty array for free tier
      };

      return mockOneCallResponse;
    } catch (error) {
      console.error('OpenWeather free tier API error:', error);
      return null;
    }
  }

  private combineWeatherData(
    noaaData: NOAAForecastResponse | null,
    openWeatherData: OpenWeatherResponse | null,
    baseTimestamp: string
  ): WeatherDataPoint[] {
    const combinedData: WeatherDataPoint[] = [];
    const now = new Date();

    // Process NOAA periods (next 7 days, 12-hour periods)
    if (noaaData?.properties?.periods) {
      for (const period of noaaData.properties.periods.slice(0, 14)) { // Next 7 days (14 periods)
        const periodDate = new Date(period.startTime);
        
        // Find corresponding OpenWeather hourly data
        let owHourly = null;
        if (openWeatherData?.hourly) {
          const targetTime = Math.floor(periodDate.getTime() / 1000);
          owHourly = openWeatherData.hourly.find(h => 
            Math.abs(h.dt - targetTime) < 6 * 3600 // Within 6 hours
          );
        }

        const dataPoint: WeatherDataPoint = {
          timestamp: period.startTime,
          temperature: period.temperature,
          humidity: period.relativeHumidity?.value || 50,
          pressure: owHourly?.pressure || 1013, // Use OpenWeather pressure if available
          windSpeed: this.parseWindSpeed(period.windSpeed || '0 mph'),
          windDirection: this.parseWindDirection(period.windDirection || 'N'),
          precipitationProbability: period.probabilityOfPrecipitation?.value || 0,
          cloudCover: owHourly?.clouds || 50, // Use OpenWeather clouds if available
          visibility: owHourly?.visibility ? owHourly.visibility / 1000 : 10, // Convert to miles
          condition: period.detailedForecast,
          feelsLike: owHourly?.feels_like || period.temperature,
          uvIndex: owHourly?.uvi || 0
        };

        combinedData.push(dataPoint);
      }
    }

    // If we have OpenWeather data but no NOAA, use OpenWeather as fallback
    if (!noaaData && openWeatherData?.hourly) {
      for (const hourly of openWeatherData.hourly.slice(0, 24)) { // Next 24 hours
        const dataPoint: WeatherDataPoint = {
          timestamp: new Date(hourly.dt * 1000).toISOString(),
          temperature: hourly.temp,
          humidity: hourly.humidity,
          pressure: hourly.pressure,
          windSpeed: hourly.wind_speed * 2.237, // Convert m/s to mph
          windDirection: hourly.wind_deg,
          precipitationProbability: hourly.pop * 100,
          cloudCover: hourly.clouds,
          visibility: hourly.visibility / 1609.34, // Convert m to miles
          condition: hourly.weather[0]?.description || 'Unknown',
          feelsLike: hourly.feels_like,
          uvIndex: hourly.uvi
        };

        combinedData.push(dataPoint);
      }
    }

    return combinedData;
  }

  private parseWindSpeed(windSpeed: string): number {
    const match = windSpeed.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private parseWindDirection(windDirection: string): number {
    const directions: { [key: string]: number } = {
      'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
      'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
      'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
      'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
    };
    return directions[windDirection.toUpperCase()] || 0;
  }
}

// Export singleton instance
export const hybridWeatherService = HybridWeatherService.getInstance();
