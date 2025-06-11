import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

// OpenWeatherMap API configuration
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const WEATHER_CACHE_KEY = 'weather_data_cache';
const WEATHER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Location constants for Morrison, CO and mountain reference
export const LOCATIONS = {
  morrison: {
    name: 'Morrison, CO',
    lat: 39.6533,
    lon: -105.1942,
    elevation: 1740, // meters
  },
  nederland: {
    name: 'Nederland, CO', 
    lat: 39.9614,
    lon: -105.5111,
    elevation: 2540, // meters
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
  hourlyForecast: WeatherDataPoint[]; // Next 5 days (up to 120 hours)
  lastUpdated: number;
}

export interface WeatherServiceData {
  morrison: LocationWeatherData;
  mountain: LocationWeatherData;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
  dataSource: 'api' | 'cache' | 'mock'; // Track data source
  apiKeyConfigured: boolean; // Track if API key is available
}

/**
 * OpenWeatherMap API interfaces
 */
interface OpenWeatherCurrentResponse {
  coord: { lat: number; lon: number };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

interface OpenWeatherForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level: number;
      grnd_level: number;
      humidity: number;
      temp_kf: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    visibility: number;
    pop: number; // Probability of precipitation
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

/**
 * Weather Service for fetching meteorological data
 */
export class WeatherService {
  private static instance: WeatherService;
  private apiKey: string | null = null;

  private constructor() {
    this.initializeApiKey();
  }

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Initialize API key from environment variables
   */
  private initializeApiKey(): void {
    try {
      // Try to get API key from Expo config or environment
      this.apiKey = Constants.expoConfig?.extra?.OPENWEATHER_API_KEY || 
                   process.env.OPENWEATHER_API_KEY || 
                   null;
      
      if (this.apiKey) {
        console.log('✅ OpenWeatherMap API key configured');
      } else {
        console.log('⚠️ OpenWeatherMap API key not found - will use mock data');
      }
    } catch (error) {
      console.error('❌ Error initializing API key:', error);
      this.apiKey = null;
    }
  }

  /**
   * Set API key manually (for testing or runtime configuration)
   */
  public setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    console.log('✅ OpenWeatherMap API key set manually');
  }

  /**
   * Check if API key is configured
   */
  public isApiKeyConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch weather data with API integration and fallback
   */
  public async fetchWeatherData(): Promise<WeatherServiceData> {
    console.log('🌤️ Fetching weather data...');
    
    try {
      // Try API first if key is available
      if (this.apiKey) {
        return await this.fetchFromApi();
      } else {
        console.log('📱 No API key - checking cache then falling back to mock data');
        
        // Try cache first
        const cachedData = await this.getCachedWeatherData();
        if (cachedData) {
          return cachedData;
        }
        
        // Fall back to mock data
        return this.getMockWeatherData();
      }
    } catch (error) {
      console.error('❌ Error fetching weather data:', error);
      
      // Try cache on API failure
      const cachedData = await this.getCachedWeatherData();
      if (cachedData) {
        console.log('💾 Using cached data due to API error');
        return { ...cachedData, error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}` };
      }
      
      // Final fallback to mock data
      console.log('🔄 Using mock data due to API and cache failure');
      return { 
        ...this.getMockWeatherData(), 
        error: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        dataSource: 'mock' as const
      };
    }
  }

  /**
   * Fetch data from OpenWeatherMap API
   */
  private async fetchFromApi(): Promise<WeatherServiceData> {
    console.log('🌐 Fetching from OpenWeatherMap API...');
    
    try {
      // Fetch current weather and forecasts for both locations
      const [morrisonCurrent, morrisonForecast, mountainCurrent, mountainForecast] = await Promise.all([
        this.fetchCurrentWeather(LOCATIONS.morrison.lat, LOCATIONS.morrison.lon),
        this.fetchHourlyForecast(LOCATIONS.morrison.lat, LOCATIONS.morrison.lon),
        this.fetchCurrentWeather(LOCATIONS.nederland.lat, LOCATIONS.nederland.lon),
        this.fetchHourlyForecast(LOCATIONS.nederland.lat, LOCATIONS.nederland.lon)
      ]);

      const now = Date.now();
      
      const weatherData: WeatherServiceData = {
        morrison: {
          location: LOCATIONS.morrison.name,
          current: this.transformCurrentWeather(morrisonCurrent),
          hourlyForecast: this.transformHourlyForecast(morrisonForecast),
          lastUpdated: now,
        },
        mountain: {
          location: LOCATIONS.nederland.name,
          current: this.transformCurrentWeather(mountainCurrent),
          hourlyForecast: this.transformHourlyForecast(mountainForecast),
          lastUpdated: now,
        },
        isLoading: false,
        error: null,
        lastFetch: now,
        dataSource: 'api',
        apiKeyConfigured: true
      };

      // Cache the successful API response
      await this.cacheWeatherData(weatherData);
      
      console.log('✅ Successfully fetched data from OpenWeatherMap API');
      return weatherData;
      
    } catch (error) {
      console.error('❌ OpenWeatherMap API error:', error);
      throw error;
    }
  }

  /**
   * Fetch current weather from OpenWeatherMap
   */
  private async fetchCurrentWeather(lat: number, lon: number): Promise<OpenWeatherCurrentResponse> {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
      params: {
        lat,
        lon,
        appid: this.apiKey,
        units: 'metric' // Celsius
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Fetch hourly forecast from OpenWeatherMap  
   */
  private async fetchHourlyForecast(lat: number, lon: number): Promise<OpenWeatherForecastResponse> {
    const response = await axios.get(`${OPENWEATHER_BASE_URL}/forecast`, {
      params: {
        lat,
        lon,
        appid: this.apiKey,
        units: 'metric' // Celsius
      },
      timeout: 10000
    });

    if (response.status !== 200) {
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    return response.data;
  }

  /**
   * Transform OpenWeatherMap current weather to our format
   */
  private transformCurrentWeather(data: OpenWeatherCurrentResponse): WeatherDataPoint {
    return {
      timestamp: data.dt * 1000, // Convert to milliseconds
      temperature: data.main.temp,
      pressure: data.main.pressure,
      precipitationProbability: 0, // Current weather doesn't have precipitation probability
      cloudCover: data.clouds.all,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg || 0,
      humidity: data.main.humidity,
      weatherDescription: data.weather[0]?.description || 'unknown'
    };
  }

  /**
   * Transform OpenWeatherMap forecast to our format
   */
  private transformHourlyForecast(data: OpenWeatherForecastResponse): WeatherDataPoint[] {
    return data.list.map(item => ({ // Use all available forecast data (up to 5 days)
      timestamp: item.dt * 1000, // Convert to milliseconds
      temperature: item.main.temp,
      pressure: item.main.pressure,
      precipitationProbability: Math.round(item.pop * 100), // Convert from 0-1 to 0-100
      cloudCover: item.clouds.all,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg || 0,
      humidity: item.main.humidity,
      weatherDescription: item.weather[0]?.description || 'unknown'
    }));
  }

  /**
   * Cache weather data
   */
  private async cacheWeatherData(data: WeatherServiceData): Promise<void> {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 Weather data cached successfully');
    } catch (error) {
      console.error('❌ Error caching weather data:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Get cached weather data if still valid
   */
  private async getCachedWeatherData(): Promise<WeatherServiceData | null> {
    try {
      const cachedJson = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (!cachedJson) {
        return null;
      }

      const cached = JSON.parse(cachedJson);
      const age = Date.now() - cached.timestamp;
      
      if (age < WEATHER_CACHE_DURATION) {
        console.log(`💾 Using cached weather data (${Math.round(age / 1000 / 60)} minutes old)`);
        return {
          ...cached.data,
          dataSource: 'cache' as const
        };
      } else {
        console.log('🗑️ Cached weather data expired');
        return null;
      }
    } catch (error) {
      console.error('❌ Error loading cached weather data:', error);
      return null;
    }
  }

  /**
   * Generate mock weather data for development and fallback
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

    // Generate 5 days of forecast data (120 hours)
    const generateHourlyForecast = (baseTemp: number): WeatherDataPoint[] => {
      const forecast: WeatherDataPoint[] = [];
      for (let i = 0; i < 120; i++) { // 5 days * 24 hours
        const hour = new Date(now + i * 60 * 60 * 1000).getHours();
        const tempVariation = Math.sin((hour - 6) * Math.PI / 12) * 6;
        forecast.push({
          timestamp: now + i * 60 * 60 * 1000,
          temperature: baseTemp + tempVariation + (Math.random() - 0.5) * 2,
          pressure: 1013 + (Math.random() - 0.5) * 10,
          precipitationProbability: Math.max(0, 10 + (Math.random() - 0.5) * 20),
          cloudCover: Math.max(0, 30 + (Math.random() - 0.5) * 40),
          windSpeed: 2 + Math.random() * 6,
          windDirection: 270 + (Math.random() - 0.5) * 60,
          humidity: 40 + Math.random() * 30,
          weatherDescription: 'partly cloudy',
        });
      }
      return forecast;
    };

    console.log('🔄 Using mock weather data (API key not configured)');

    return {
      morrison: {
        location: LOCATIONS.morrison.name,
        current: morrisonCurrent,
        hourlyForecast: generateHourlyForecast(8),
        lastUpdated: now,
      },
      mountain: {
        location: LOCATIONS.nederland.name,
        current: mountainCurrent,
        hourlyForecast: generateHourlyForecast(2),
        lastUpdated: now,
      },
      isLoading: false,
      error: null,
      lastFetch: now,
      dataSource: 'mock',
      apiKeyConfigured: !!this.apiKey
    };
  }

  /**
   * Clear cache and force fresh data fetch
   */
  public async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
      console.log('🗑️ Weather data cache cleared');
    } catch (error) {
      console.error('❌ Error clearing weather cache:', error);
    }
  }
}

// Export singleton instance
export const weatherService = WeatherService.getInstance();
