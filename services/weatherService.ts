import AsyncStorage from '@react-native-async-storage/async-storage';

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
  hourlyForecast: WeatherDataPoint[]; // Next 48 hours
  lastUpdated: number;
}

export interface WeatherServiceData {
  morrison: LocationWeatherData;
  mountain: LocationWeatherData;
  isLoading: boolean;
  error: string | null;
  lastFetch: number;
}

/**
 * Weather Service for fetching meteorological data
 */
export class WeatherService {
  private static instance: WeatherService;

  private constructor() {}

  public static getInstance(): WeatherService {
    if (!WeatherService.instance) {
      WeatherService.instance = new WeatherService();
    }
    return WeatherService.instance;
  }

  /**
   * Fetch weather data (using mock data for Phase 1)
   */
  public async fetchWeatherData(): Promise<WeatherServiceData> {
    return this.getMockWeatherData();
  }

  /**
   * Generate mock weather data for development
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

    // Generate 48 hours of forecast data
    const generateHourlyForecast = (baseTemp: number): WeatherDataPoint[] => {
      const forecast: WeatherDataPoint[] = [];
      for (let i = 0; i < 48; i++) {
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
    };
  }

  /**
   * Clear cache placeholder
   */
  public async clearCache(): Promise<void> {
    // Phase 1: No-op, real cache clearing will be added later
  }
}

// Export singleton instance
export const weatherService = WeatherService.getInstance();
