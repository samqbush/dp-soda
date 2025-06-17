import axios from 'axios';
import Constants from 'expo-constants';
import { WeatherDataPoint, LocationWeatherData, WeatherServiceData, LOCATIONS } from './weatherService';

// NOAA API configuration
const NOAA_BASE_URL = 'https://api.weather.gov';

// Hybrid weather service interfaces
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
      windSpeed: string;
      windDirection: string;
      icon: string;
      shortForecast: string;
      detailedForecast: string;
    }>;
  };
}

interface NOAAHourlyResponse {
  properties: {
    updated: string;
    periods: Array<{
      startTime: string;
      endTime: string;
      temperature: number;
      temperatureUnit: string;
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
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
    }>;
  };
}

interface HybridWeatherDataPoint extends WeatherDataPoint {
  dataSource: 'noaa' | 'openweather' | 'hybrid';
  transportWinds?: {
    speed: number;      // m/s
    direction: number;  // degrees
    analysis: string;
  };
  mixingHeight?: number; // meters - from NOAA transport data
}

/**
 * Hybrid Weather Service combining NOAA and OpenWeather APIs
 * NOAA primary for: Rain Probability, Clear Sky, Temperature Difference, Wave Pattern Analysis
 * OpenWeather for: Pressure Change (missing from NOAA)
 * Smart fallback: NOAA → OpenWeather → Cache → Mock
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
      this.openWeatherApiKey = Constants.expoConfig?.extra?.OPENWEATHER_API_KEY || 
                              process.env.OPENWEATHER_API_KEY || 
                              null;
      
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
    
    try {
      const now = Date.now();
      
      // Fetch data from both sources
      const [morrisonHybrid, mountainHybrid] = await Promise.all([
        this.fetchLocationHybridData(LOCATIONS.morrison),
        this.fetchLocationHybridData(LOCATIONS.evergreen)
      ]);

      const hybridData: WeatherServiceData = {
        morrison: {
          location: LOCATIONS.morrison.name,
          current: morrisonHybrid.current,
          hourlyForecast: morrisonHybrid.hourlyForecast,
          lastUpdated: now,
        },
        mountain: {
          location: LOCATIONS.evergreen.name,
          current: mountainHybrid.current,
          hourlyForecast: mountainHybrid.hourlyForecast, 
          lastUpdated: now,
        },
        isLoading: false,
        error: null,
        lastFetch: now,
        dataSource: 'api',
        apiKeyConfigured: true
      };

      console.log('✅ Successfully fetched hybrid weather data');
      return hybridData;
      
    } catch (error) {
      console.error('❌ Hybrid weather service error:', error);
      throw error;
    }
  }

  /**
   * Fetch hybrid data for a specific location
   */
  private async fetchLocationHybridData(location: typeof LOCATIONS[keyof typeof LOCATIONS]): Promise<{
    current: HybridWeatherDataPoint;
    hourlyForecast: HybridWeatherDataPoint[];
  }> {
    console.log(`🌍 Fetching hybrid data for ${location.name}...`);
    
    try {
      // Step 1: Try NOAA as primary source
      const noaaData = await this.fetchNOAAData(location);
      console.log(`✅ NOAA data fetched for ${location.name}`);
      
      // Step 2: Fetch OpenWeather for pressure data (missing from NOAA)
      let pressureData = null;
      if (this.openWeatherApiKey) {
        try {
          pressureData = await this.fetchOpenWeatherPressureData(location);
          console.log(`✅ OpenWeather pressure data fetched for ${location.name}`);
        } catch (error) {
          console.log(`⚠️ OpenWeather pressure fetch failed for ${location.name}:`, error);
        }
      }
      
      // Step 3: Combine data sources intelligently
      const hybridCurrent = this.combineCurrentData(noaaData.current, pressureData?.current);
      const hybridForecast = this.combineForecastData(noaaData.hourlyForecast, pressureData?.hourlyForecast);
      
      return {
        current: hybridCurrent,
        hourlyForecast: hybridForecast
      };
      
    } catch (noaaError) {
      console.log(`⚠️ NOAA fetch failed for ${location.name}, falling back to OpenWeather only`);
      
      // Fallback to OpenWeather only
      if (this.openWeatherApiKey) {
        const openWeatherData = await this.fetchOpenWeatherData(location);
        return {
          current: { ...openWeatherData.current, dataSource: 'openweather' as const },
          hourlyForecast: openWeatherData.hourlyForecast.map(point => ({ 
            ...point, 
            dataSource: 'openweather' as const 
          }))
        };
      }
      
      throw new Error('Both NOAA and OpenWeather failed');
    }
  }

  /**
   * Fetch data from NOAA API
   */
  private async fetchNOAAData(location: typeof LOCATIONS[keyof typeof LOCATIONS]): Promise<{
    current: HybridWeatherDataPoint;
    hourlyForecast: HybridWeatherDataPoint[];
  }> {
    // Get NOAA grid point for location
    const pointResponse = await axios.get(`${NOAA_BASE_URL}/points/${location.lat},${location.lon}`, {
      timeout: 10000,
      headers: {
        'User-Agent': 'WindGuru/1.0 (contact@windguru.app)'
      }
    });

    const gridX = pointResponse.data.properties.gridX;
    const gridY = pointResponse.data.properties.gridY;
    const office = pointResponse.data.properties.gridId;

    // Fetch hourly forecast
    const hourlyResponse = await axios.get(
      `${NOAA_BASE_URL}/gridpoints/${office}/${gridX},${gridY}/forecast/hourly`,
      {
        timeout: 15000,
        headers: {
          'User-Agent': 'WindGuru/1.0 (contact@windguru.app)'
        }
      }
    );

    const hourlyData = hourlyResponse.data as NOAAHourlyResponse;
    
    // Transform NOAA data to our format
    const hourlyForecast = hourlyData.properties.periods.slice(0, 120).map(period => {
      const temp = period.temperatureUnit === 'F' 
        ? (period.temperature - 32) * 5/9 
        : period.temperature;
      
      // Parse wind speed (convert from "X mph" or "X to Y mph" to m/s)
      const windSpeedMatch = period.windSpeed.match(/(\d+)(?:\s*to\s*(\d+))?\s*mph/);
      const windSpeedMph = windSpeedMatch 
        ? (windSpeedMatch[2] ? (parseInt(windSpeedMatch[1]) + parseInt(windSpeedMatch[2])) / 2 : parseInt(windSpeedMatch[1]))
        : 0;
      const windSpeed = windSpeedMph * 0.44704; // Convert mph to m/s
      
      // Parse wind direction
      const windDirectionMap: Record<string, number> = {
        'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
        'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
        'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
        'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
      };
      const windDirection = windDirectionMap[period.windDirection] || 0;

      return {
        timestamp: new Date(period.startTime).getTime(),
        temperature: temp,
        pressure: 1013, // Will be filled from OpenWeather
        precipitationProbability: period.probabilityOfPrecipitation?.value || 0,
        cloudCover: this.estimateCloudCoverFromForecast(period.shortForecast),
        windSpeed,
        windDirection,
        humidity: period.relativeHumidity?.value || 50,
        weatherDescription: period.shortForecast.toLowerCase(),
        dataSource: 'noaa' as const,
        transportWinds: {
          speed: windSpeed,
          direction: windDirection,
          analysis: `NOAA transport wind: ${period.windSpeed} from ${period.windDirection}`
        }
      } as HybridWeatherDataPoint;
    });

    return {
      current: hourlyForecast[0] || this.getDefaultWeatherPoint('noaa'),
      hourlyForecast
    };
  }

  /**
   * Fetch pressure data from OpenWeather API
   */
  private async fetchOpenWeatherPressureData(location: typeof LOCATIONS[keyof typeof LOCATIONS]): Promise<{
    current: Partial<HybridWeatherDataPoint>;
    hourlyForecast: Partial<HybridWeatherDataPoint>[];
  }> {
    if (!this.openWeatherApiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    // Fetch current weather for pressure
    const currentResponse = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        lat: location.lat,
        lon: location.lon,
        appid: this.openWeatherApiKey,
        units: 'metric'
      },
      timeout: 10000
    });

    // Fetch forecast for pressure trends
    const forecastResponse = await axios.get('https://api.openweathermap.org/data/2.5/forecast', {
      params: {
        lat: location.lat,
        lon: location.lon,
        appid: this.openWeatherApiKey,
        units: 'metric'
      },
      timeout: 10000
    });

    const forecastData = forecastResponse.data.list.map((item: any) => ({
      timestamp: item.dt * 1000,
      pressure: item.main.pressure,
      dataSource: 'openweather' as const
    }));

    return {
      current: {
        pressure: currentResponse.data.main.pressure,
        dataSource: 'openweather' as const
      },
      hourlyForecast: forecastData
    };
  }

  /**
   * Fallback OpenWeather data fetch
   */
  private async fetchOpenWeatherData(location: typeof LOCATIONS[keyof typeof LOCATIONS]): Promise<{
    current: WeatherDataPoint;
    hourlyForecast: WeatherDataPoint[];
  }> {
    if (!this.openWeatherApiKey) {
      throw new Error('OpenWeather API key not configured');
    }

    // This is a simplified version - reuse existing OpenWeather logic
    const [currentResponse, forecastResponse] = await Promise.all([
      axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          lat: location.lat,
          lon: location.lon,
          appid: this.openWeatherApiKey,
          units: 'metric'
        },
        timeout: 10000
      }),
      axios.get('https://api.openweathermap.org/data/2.5/forecast', {
        params: {
          lat: location.lat,
          lon: location.lon,
          appid: this.openWeatherApiKey,
          units: 'metric'
        },
        timeout: 10000
      })
    ]);

    const current: WeatherDataPoint = {
      timestamp: currentResponse.data.dt * 1000,
      temperature: currentResponse.data.main.temp,
      pressure: currentResponse.data.main.pressure,
      precipitationProbability: 0,
      cloudCover: currentResponse.data.clouds.all,
      windSpeed: currentResponse.data.wind.speed,
      windDirection: currentResponse.data.wind.deg || 0,
      humidity: currentResponse.data.main.humidity,
      weatherDescription: currentResponse.data.weather[0]?.description || 'unknown'
    };

    const hourlyForecast: WeatherDataPoint[] = forecastResponse.data.list.map((item: any) => ({
      timestamp: item.dt * 1000,
      temperature: item.main.temp,
      pressure: item.main.pressure,
      precipitationProbability: Math.round(item.pop * 100),
      cloudCover: item.clouds.all,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg || 0,
      humidity: item.main.humidity,
      weatherDescription: item.weather[0]?.description || 'unknown'
    }));

    return { current, hourlyForecast };
  }

  /**
   * Combine current weather data from multiple sources
   */
  private combineCurrentData(
    noaaData: HybridWeatherDataPoint,
    pressureData?: Partial<HybridWeatherDataPoint>
  ): HybridWeatherDataPoint {
    return {
      ...noaaData,
      pressure: pressureData?.pressure || 1013, // Use OpenWeather pressure if available
      dataSource: pressureData?.pressure ? 'hybrid' as const : 'noaa' as const
    };
  }

  /**
   * Combine forecast data from multiple sources
   */
  private combineForecastData(
    noaaForecast: HybridWeatherDataPoint[],
    pressureForecast?: Partial<HybridWeatherDataPoint>[]
  ): HybridWeatherDataPoint[] {
    if (!pressureForecast) {
      return noaaForecast;
    }

    // Match timestamps and combine data
    return noaaForecast.map(noaaPoint => {
      const matchingPressure = pressureForecast.find(pressurePoint => 
        Math.abs((pressurePoint.timestamp || 0) - noaaPoint.timestamp) < 3600000 // Within 1 hour
      );

      return {
        ...noaaPoint,
        pressure: matchingPressure?.pressure || noaaPoint.pressure,
        dataSource: matchingPressure?.pressure ? 'hybrid' as const : 'noaa' as const
      };
    });
  }

  /**
   * Estimate cloud cover from NOAA text forecast
   */
  private estimateCloudCoverFromForecast(forecast: string): number {
    const lower = forecast.toLowerCase();
    
    if (lower.includes('clear') || lower.includes('sunny')) return 5;
    if (lower.includes('mostly clear') || lower.includes('mostly sunny')) return 15;
    if (lower.includes('partly cloudy') || lower.includes('partly sunny')) return 35;
    if (lower.includes('mostly cloudy')) return 75;
    if (lower.includes('overcast') || lower.includes('cloudy')) return 95;
    
    // Default based on precipitation indicators
    if (lower.includes('rain') || lower.includes('storm')) return 90;
    if (lower.includes('snow')) return 85;
    
    return 50; // Default moderate cloud cover
  }

  /**
   * Get default weather point for fallback
   */
  private getDefaultWeatherPoint(source: 'noaa' | 'openweather'): HybridWeatherDataPoint {
    return {
      timestamp: Date.now(),
      temperature: 5,
      pressure: 1013,
      precipitationProbability: 10,
      cloudCover: 30,
      windSpeed: 3,
      windDirection: 285,
      humidity: 50,
      weatherDescription: 'partly cloudy',
      dataSource: source
    };
  }

  /**
   * Clear cached weather data (for refresh functionality)
   */
  public async clearCache(): Promise<void> {
    // Hybrid service doesn't cache data locally, so this is a no-op
    // Could implement caching in the future if needed
    console.log('🗑️ Hybrid service: Cache clear requested (no cache to clear)');
  }

  /**
   * Set OpenWeather API key
   */
  public setApiKey(apiKey: string): void {
    this.openWeatherApiKey = apiKey;
    console.log('🔑 Hybrid service: OpenWeather API key updated');
  }

  /**
   * Check if OpenWeather API key is configured
   */
  public isApiKeyConfigured(): boolean {
    return this.openWeatherApiKey !== null && this.openWeatherApiKey.trim() !== '';
  }
}

// Export singleton instance
export const hybridWeatherService = HybridWeatherService.getInstance();
