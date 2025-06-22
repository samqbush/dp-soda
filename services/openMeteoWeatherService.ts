import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Open-Meteo API configuration - NO API KEY REQUIRED!
const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';
const WEATHER_CACHE_KEY = 'open_meteo_weather_cache';
const AGGRESSIVE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours aggressive caching

// Location constants for Morrison, CO and mountain reference
export const LOCATIONS = {
  morrison: {
    name: 'Morrison, CO',
    lat: 39.6533,
    lon: -105.1942,
    elevation: 1740, // meters
  },
  evergreen: {
    name: 'Evergreen, CO', 
    lat: 39.6364,
    lon: -105.3283,
    elevation: 2200, // meters (7,220 ft)
  },
} as const;

export interface WeatherDataPoint {
  timestamp: number;
  temperature: number;        // Celsius
  pressure: number;          // hPa
  precipitationProbability: number; // 0-100 %
  cloudCover: number;        // 0-100 %
  windSpeed: number;         // m/s
  windDirection: number;     // degrees
  humidity: number;          // 0-100 %
  weatherDescription: string;
}

export interface LocationWeatherData {
  location: string;
  current: WeatherDataPoint;
  hourlyForecast: WeatherDataPoint[]; // Next 7 days (up to 168 hours)
  lastUpdated: number;
}

export interface WeatherServiceData {
  morrison: LocationWeatherData;
  mountain: LocationWeatherData;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
  dataSource: 'api' | 'cache' | 'mock'; // Track data source
  apiKeyConfigured: boolean; // Always true for Open-Meteo (no key required)
}

/**
 * Open-Meteo API Response Interfaces
 */
interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number; // Sea level pressure
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  current_units: {
    temperature_2m: string;
    relative_humidity_2m: string;
    pressure_msl: string;
    wind_speed_10m: string;
  };
}

interface OpenMeteoForecastResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    cloud_cover: number[];
    pressure_msl: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
  };
  hourly_units: {
    temperature_2m: string;
    pressure_msl: string;
    wind_speed_10m: string;
  };
}

interface OpenMeteoCombinedResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current: OpenMeteoCurrentResponse['current'];
  current_units: OpenMeteoCurrentResponse['current_units'];
  hourly: OpenMeteoForecastResponse['hourly'];
  hourly_units: OpenMeteoForecastResponse['hourly_units'];
}

/**
 * Weather code to description mapping (WMO Weather interpretation codes)
 */
const WEATHER_CODE_DESCRIPTIONS: { [key: number]: string } = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'fog',
  48: 'depositing rime fog',
  51: 'light drizzle',
  53: 'moderate drizzle',
  55: 'dense drizzle',
  61: 'slight rain',
  63: 'moderate rain',
  65: 'heavy rain',
  71: 'slight snow',
  73: 'moderate snow',
  75: 'heavy snow',
  80: 'slight rain showers',
  81: 'moderate rain showers',
  82: 'violent rain showers',
  95: 'thunderstorm',
  96: 'thunderstorm with slight hail',
  99: 'thunderstorm with heavy hail'
};

/**
 * Open-Meteo Weather Service - Free, unlimited API
 */
export class OpenMeteoWeatherService {
  private static instance: OpenMeteoWeatherService;

  private constructor() {}

  static getInstance(): OpenMeteoWeatherService {
    if (!OpenMeteoWeatherService.instance) {
      OpenMeteoWeatherService.instance = new OpenMeteoWeatherService();
    }
    return OpenMeteoWeatherService.instance;
  }

  /**
   * Main method to get weather data with aggressive caching
   */
  async getWeatherData(): Promise<WeatherServiceData> {
    try {
      // Try cache first (6-hour cache duration)
      const cachedData = await this.getCachedWeatherData();
      if (cachedData) {
        console.log('✅ Using cached Open-Meteo weather data');
        return cachedData;
      }

      // Fetch fresh data from API
      console.log('🌐 Fetching fresh data from Open-Meteo API...');
      const freshData = await this.fetchFromApi();
      
      // Cache the fresh data
      await this.cacheWeatherData(freshData);
      
      return freshData;
    } catch (error) {
      console.error('❌ Open-Meteo weather service error:', error);
      
      // Try to return stale cached data if API fails
      const staleCache = await this.getStaleCache();
      if (staleCache) {
        console.log('⚠️ Using stale cached data due to API error');
        return {
          ...staleCache,
          error: 'Using cached data - API temporarily unavailable',
          dataSource: 'cache'
        };
      }

      // Last resort: return mock data
      console.log('🔄 Falling back to mock weather data');
      return this.getMockWeatherData();
    }
  }

  /**
   * Fetch data from Open-Meteo API
   */
  private async fetchFromApi(): Promise<WeatherServiceData> {
    console.log('🌐 Fetching from Open-Meteo API...');
    
    try {
      // Fetch weather data for both locations simultaneously
      const [morrisonResponse, evergreenResponse] = await Promise.all([
        this.fetchLocationWeather(LOCATIONS.morrison),
        this.fetchLocationWeather(LOCATIONS.evergreen)
      ]);

      const now = Date.now();
      
      const weatherData: WeatherServiceData = {
        morrison: {
          location: LOCATIONS.morrison.name,
          current: this.transformCurrentWeather(morrisonResponse.current),
          hourlyForecast: this.transformHourlyForecast(morrisonResponse.hourly),
          lastUpdated: now,
        },
        mountain: {
          location: LOCATIONS.evergreen.name,
          current: this.transformCurrentWeather(evergreenResponse.current),
          hourlyForecast: this.transformHourlyForecast(evergreenResponse.hourly),
          lastUpdated: now,
        },
        isLoading: false,
        error: null,
        lastFetch: now,
        dataSource: 'api',
        apiKeyConfigured: true // Always true for Open-Meteo
      };

      console.log('✅ Successfully fetched data from Open-Meteo API');
      return weatherData;
      
    } catch (error) {
      console.error('❌ Open-Meteo API error:', error);
      throw error;
    }
  }

  /**
   * Fetch weather data for a specific location from Open-Meteo
   */
  private async fetchLocationWeather(location: typeof LOCATIONS[keyof typeof LOCATIONS]): Promise<OpenMeteoCombinedResponse> {
    const params = {
      latitude: location.lat,
      longitude: location.lon,
      elevation: location.elevation,
      // Current weather variables
      current: [
        'temperature_2m',
        'relative_humidity_2m', 
        'apparent_temperature',
        'precipitation',
        'weather_code',
        'cloud_cover',
        'pressure_msl',
        'wind_speed_10m',
        'wind_direction_10m'
      ].join(','),
      // Hourly forecast variables (7 days = 168 hours)
      hourly: [
        'temperature_2m',
        'relative_humidity_2m',
        'precipitation_probability',
        'precipitation',
        'weather_code', 
        'cloud_cover',
        'pressure_msl',
        'wind_speed_10m',
        'wind_direction_10m'
      ].join(','),
      timezone: 'America/Denver', // Mountain Time
      forecast_days: 7, // 7 days forecast
      temperature_unit: 'celsius',
      wind_speed_unit: 'ms', // meters per second
      precipitation_unit: 'mm'
    };

    const response = await axios.get(`${OPEN_METEO_BASE_URL}/forecast`, {
      params,
      timeout: 15000 // 15 second timeout
    });

    if (response.status !== 200) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Transform Open-Meteo current weather to our format
   */
  private transformCurrentWeather(data: OpenMeteoCombinedResponse['current']): WeatherDataPoint {
    return {
      timestamp: new Date(data.time).getTime(),
      temperature: data.temperature_2m,
      pressure: data.pressure_msl,
      precipitationProbability: 0, // Not available in current weather
      cloudCover: data.cloud_cover,
      windSpeed: data.wind_speed_10m,
      windDirection: data.wind_direction_10m,
      humidity: data.relative_humidity_2m,
      weatherDescription: WEATHER_CODE_DESCRIPTIONS[data.weather_code] || 'unknown'
    };
  }

  /**
   * Transform Open-Meteo hourly forecast to our format
   */
  private transformHourlyForecast(data: OpenMeteoCombinedResponse['hourly']): WeatherDataPoint[] {
    return data.time.map((timeStr, index) => ({
      timestamp: new Date(timeStr).getTime(),
      temperature: data.temperature_2m[index] || 0,
      pressure: data.pressure_msl[index] || 1013,
      precipitationProbability: data.precipitation_probability[index] || 0,
      cloudCover: data.cloud_cover[index] || 0,
      windSpeed: data.wind_speed_10m[index] || 0,
      windDirection: data.wind_direction_10m[index] || 0,
      humidity: data.relative_humidity_2m[index] || 50,
      weatherDescription: WEATHER_CODE_DESCRIPTIONS[data.weather_code[index]] || 'unknown'
    }));
  }

  /**
   * Cache weather data with aggressive 6-hour duration
   */
  private async cacheWeatherData(data: WeatherServiceData): Promise<void> {
    try {
      const cacheData = {
        ...data,
        cachedAt: Date.now(),
        cacheExpiry: Date.now() + AGGRESSIVE_CACHE_DURATION
      };
      
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Cached Open-Meteo weather data for 6 hours');
    } catch (error) {
      console.error('❌ Failed to cache weather data:', error);
    }
  }

  /**
   * Get cached weather data if still valid (6-hour cache)
   */
  private async getCachedWeatherData(): Promise<WeatherServiceData | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (!cachedDataString) return null;

      const cachedData = JSON.parse(cachedDataString);
      const now = Date.now();

      // Check if cache is still valid (6 hours)
      if (cachedData.cacheExpiry && now < cachedData.cacheExpiry) {
        const cacheAge = Math.round((now - cachedData.cachedAt) / (1000 * 60)); // minutes
        console.log(`📦 Cache hit: ${cacheAge}m old (expires in ${Math.round((cachedData.cacheExpiry - now) / (1000 * 60))}m)`);
        
        // Remove cache metadata before returning
        const { cachedAt, cacheExpiry, ...weatherData } = cachedData;
        return {
          ...weatherData,
          dataSource: 'cache'
        };
      }

      console.log('⏰ Cache expired, will fetch fresh data');
      return null;
    } catch (error) {
      console.error('❌ Error reading cached weather data:', error);
      return null;
    }
  }

  /**
   * Get stale cached data (ignoring expiry) for error recovery
   */
  private async getStaleCache(): Promise<WeatherServiceData | null> {
    try {
      const cachedDataString = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (!cachedDataString) return null;

      const cachedData = JSON.parse(cachedDataString);
      const { cachedAt, cacheExpiry, ...weatherData } = cachedData;
      
      console.log('🔄 Using stale cache for error recovery');
      return weatherData;
    } catch (error) {
      console.error('❌ Error reading stale cache:', error);
      return null;
    }
  }

  /**
   * Generate mock weather data for development and ultimate fallback
   */
  private getMockWeatherData(): WeatherServiceData {
    const now = Date.now();
    
    const morrisonCurrent: WeatherDataPoint = {
      timestamp: now,
      temperature: 8,
      pressure: 1013,
      precipitationProbability: 10,
      cloudCover: 25,
      windSpeed: 3.5,
      windDirection: 285,
      humidity: 55,
      weatherDescription: 'partly cloudy',
    };

    const mountainCurrent: WeatherDataPoint = {
      timestamp: now,
      temperature: 2,
      pressure: 1018,
      precipitationProbability: 5,
      cloudCover: 15,
      windSpeed: 4.2,
      windDirection: 290,
      humidity: 45,
      weatherDescription: 'clear sky',
    };

    // Generate 7 days of forecast data (168 hours)
    const generateHourlyForecast = (baseTemp: number, basePressure: number): WeatherDataPoint[] => {
      const forecast: WeatherDataPoint[] = [];
      for (let i = 0; i < 168; i++) { // 7 days * 24 hours
        const hourOffset = i * 60 * 60 * 1000;
        const tempVariation = Math.sin((i % 24) / 24 * 2 * Math.PI) * 8; // Daily temp cycle
        const pressureVariation = Math.sin(i / 24 * Math.PI) * 5; // Multi-day pressure change
        
        forecast.push({
          timestamp: now + hourOffset,
          temperature: baseTemp + tempVariation + (Math.random() - 0.5) * 3,
          pressure: basePressure + pressureVariation + (Math.random() - 0.5) * 2,
          precipitationProbability: Math.max(0, Math.min(100, 10 + (Math.random() - 0.5) * 30)),
          cloudCover: Math.max(0, Math.min(100, 25 + (Math.random() - 0.5) * 40)),
          windSpeed: Math.max(0, 3.5 + (Math.random() - 0.5) * 4),
          windDirection: 285 + (Math.random() - 0.5) * 60,
          humidity: Math.max(20, Math.min(80, 50 + (Math.random() - 0.5) * 30)),
          weatherDescription: 'mock data',
        });
      }
      return forecast;
    };

    return {
      morrison: {
        location: LOCATIONS.morrison.name,
        current: morrisonCurrent,
        hourlyForecast: generateHourlyForecast(8, 1013),
        lastUpdated: now,
      },
      mountain: {
        location: LOCATIONS.evergreen.name,
        current: mountainCurrent,
        hourlyForecast: generateHourlyForecast(2, 1018),
        lastUpdated: now,
      },
      isLoading: false,
      error: 'Using mock data - API unavailable',
      lastFetch: now,
      dataSource: 'mock',
      apiKeyConfigured: true
    };
  }

  /**
   * Force refresh weather data (bypass cache)
   */
  async refreshWeatherData(): Promise<WeatherServiceData> {
    console.log('🔄 Force refreshing Open-Meteo weather data...');
    try {
      const freshData = await this.fetchFromApi();
      await this.cacheWeatherData(freshData);
      return freshData;
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      throw error;
    }
  }

  /**
   * Clear cached data
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
      console.log('🗑️ Cleared Open-Meteo weather cache');
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }

  /**
   * Get cache status for debugging
   */
  async getCacheStatus(): Promise<{
    isCached: boolean;
    cacheAge?: number; // minutes
    expiresIn?: number; // minutes
    dataSource?: string;
  }> {
    try {
      const cachedDataString = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (!cachedDataString) {
        return { isCached: false };
      }

      const cachedData = JSON.parse(cachedDataString);
      const now = Date.now();
      const cacheAge = Math.round((now - cachedData.cachedAt) / (1000 * 60));
      const expiresIn = Math.round((cachedData.cacheExpiry - now) / (1000 * 60));

      return {
        isCached: true,
        cacheAge,
        expiresIn,
        dataSource: cachedData.dataSource || 'unknown'
      };
    } catch (error) {
      console.error('❌ Error checking cache status:', error);
      return { isCached: false };
    }
  }
}

// Export singleton instance
export const openMeteoWeatherService = OpenMeteoWeatherService.getInstance();
