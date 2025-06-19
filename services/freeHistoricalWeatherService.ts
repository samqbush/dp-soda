/**
 * Free Historical Weather Service using Open-Meteo API
 * 
 * Open-Meteo provides completely free historical weather data with:
 * - No API keys required
 * - No rate limits
 * - High quality reanalysis data (ERA5, ECMWF IFS)
 * - Hourly data back to 1940
 * - 9km spatial resolution
 * 
 * Perfect for getting today's actual afternoon heating temperatures
 * when forecast data is missing or unreliable.
 */

import axios from 'axios';

export interface FreeHistoricalTemperatureData {
  timestamp: string; // ISO 8601 format
  temperature: number; // Celsius
  hour: number; // 0-23
}

export interface FreeHistoricalDayData {
  date: string; // YYYY-MM-DD
  hourlyTemperatures: FreeHistoricalTemperatureData[];
  afternoonMax: number | null; // Max temp between 12-17h
  morningMin: number | null;   // Min temp between 3-7h
  overallMax: number;
  overallMin: number;
  dataSource: 'open_meteo_historical';
}

/**
 * Morrison, CO coordinates (valley location)
 */
const MORRISON_COORDS = {
  latitude: 39.6533,
  longitude: -105.1972,
  elevation: 1740 // meters
};

/**
 * Evergreen, CO coordinates (mountain location)
 */
const EVERGREEN_COORDS = {
  latitude: 39.6384,
  longitude: -105.3272,
  elevation: 2200 // meters
};

export class FreeHistoricalWeatherService {
  private static instance: FreeHistoricalWeatherService;
  
  public static getInstance(): FreeHistoricalWeatherService {
    if (!FreeHistoricalWeatherService.instance) {
      FreeHistoricalWeatherService.instance = new FreeHistoricalWeatherService();
    }
    return FreeHistoricalWeatherService.instance;
  }

  /**
   * Get historical hourly temperature data for a specific date and location
   */
  async getHistoricalTemperatures(
    location: 'morrison' | 'evergreen',
    date: string // YYYY-MM-DD format
  ): Promise<FreeHistoricalDayData> {
    const coords = location === 'morrison' ? MORRISON_COORDS : EVERGREEN_COORDS;
    
    try {
      console.log(`🌡️ Fetching free historical data for ${location} on ${date}`);
      
      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          start_date: date,
          end_date: date,
          hourly: 'temperature_2m',
          timezone: 'America/Denver', // Mountain Time
          temperature_unit: 'celsius'
        },
        timeout: 10000
      });

      const data = response.data;
      
      if (!data.hourly || !data.hourly.time || !data.hourly.temperature_2m) {
        throw new Error('Invalid response format from Open-Meteo API');
      }

      // Parse hourly data
      const hourlyTemperatures: FreeHistoricalTemperatureData[] = data.hourly.time.map(
        (timeStr: string, index: number) => {
          const timestamp = new Date(timeStr);
          return {
            timestamp: timeStr,
            temperature: data.hourly.temperature_2m[index],
            hour: timestamp.getHours()
          };
        }
      );

      // Calculate afternoon max (12-17h) for thermal cycle analysis
      const afternoonTemps = hourlyTemperatures.filter(t => t.hour >= 12 && t.hour <= 17);
      const afternoonMax = afternoonTemps.length > 0 
        ? Math.max(...afternoonTemps.map(t => t.temperature))
        : null;

      // Calculate pre-dawn min (3-7h) for thermal cycle analysis
      const preDawnTemps = hourlyTemperatures.filter(t => t.hour >= 3 && t.hour <= 7);
      const morningMin = preDawnTemps.length > 0
        ? Math.min(...preDawnTemps.map(t => t.temperature))
        : null;

      // Overall daily min/max
      const allTemps = hourlyTemperatures.map(t => t.temperature);
      const overallMax = Math.max(...allTemps);
      const overallMin = Math.min(...allTemps);

      console.log(`✅ Historical data retrieved for ${location}:`, {
        date,
        hoursOfData: hourlyTemperatures.length,
        afternoonMax: afternoonMax ? `${afternoonMax.toFixed(1)}°C` : 'null',
        morningMin: morningMin ? `${morningMin.toFixed(1)}°C` : 'null',
        overallRange: `${overallMin.toFixed(1)}°C to ${overallMax.toFixed(1)}°C`
      });

      return {
        date,
        hourlyTemperatures,
        afternoonMax,
        morningMin,
        overallMax,
        overallMin,
        dataSource: 'open_meteo_historical'
      };

    } catch (error) {
      console.error(`❌ Failed to fetch historical data for ${location} on ${date}:`, error);
      throw new Error(`Historical weather data unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get today's thermal cycle data for both Morrison and Evergreen
   * Perfect for replacing missing forecast data with actual observed data
   */
  async getTodaysThermalCycleData(): Promise<{
    morrison: FreeHistoricalDayData | null;
    evergreen: FreeHistoricalDayData | null;
    thermalDifferential: number | null;
    dataAvailability: {
      morrisonAfternoonMax: boolean;
      evergreenMorningMin: boolean;
      canCalculateThermalCycle: boolean;
    };
  }> {
    const today = new Date().toISOString().split('T')[0];
    const currentHour = new Date().getHours();
    
    // Only fetch historical data if we're past morning (after 8 AM)
    // Since historical data has a 5-day delay, today's data might not be available yet
    if (currentHour < 8) {
      console.log('🌅 Too early for today\'s historical data - using forecast fallback');
      return {
        morrison: null,
        evergreen: null,
        thermalDifferential: null,
        dataAvailability: {
          morrisonAfternoonMax: false,
          evergreenMorningMin: false,
          canCalculateThermalCycle: false
        }
      };
    }

    try {
      // Fetch both locations in parallel
      const [morrisonData, evergreenData] = await Promise.allSettled([
        this.getHistoricalTemperatures('morrison', today),
        this.getHistoricalTemperatures('evergreen', today)
      ]);

      const morrison = morrisonData.status === 'fulfilled' ? morrisonData.value : null;
      const evergreen = evergreenData.status === 'fulfilled' ? evergreenData.value : null;

      // Calculate thermal differential if we have both afternoon max and morning min
      let thermalDifferential: number | null = null;
      const dataAvailability = {
        morrisonAfternoonMax: morrison?.afternoonMax !== null,
        evergreenMorningMin: evergreen?.morningMin !== null,
        canCalculateThermalCycle: false
      };

      if (morrison?.afternoonMax !== null && evergreen?.morningMin !== null && 
          morrison !== null && evergreen !== null) {
        thermalDifferential = morrison.afternoonMax - evergreen.morningMin;
        dataAvailability.canCalculateThermalCycle = true;
        
        console.log('🌡️ Thermal cycle calculated from historical data:', {
          morrisonAfternoonMax: `${morrison.afternoonMax.toFixed(1)}°C`,
          evergreenMorningMin: `${evergreen.morningMin.toFixed(1)}°C`,
          thermalDifferential: `${thermalDifferential.toFixed(1)}°C`
        });
      }

      return {
        morrison,
        evergreen,
        thermalDifferential,
        dataAvailability
      };

    } catch (error) {
      console.error('❌ Failed to get today\'s thermal cycle data:', error);
      return {
        morrison: null,
        evergreen: null,
        thermalDifferential: null,
        dataAvailability: {
          morrisonAfternoonMax: false,
          evergreenMorningMin: false,
          canCalculateThermalCycle: false
        }
      };
    }
  }

  /**
   * Get yesterday's thermal cycle data (more likely to be available)
   * Useful for validation and as a secondary fallback
   */
  async getYesterdaysThermalCycleData(): Promise<{
    morrison: FreeHistoricalDayData | null;
    evergreen: FreeHistoricalDayData | null;
    thermalDifferential: number | null;
  }> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    try {
      const [morrisonData, evergreenData] = await Promise.allSettled([
        this.getHistoricalTemperatures('morrison', yesterdayStr),
        this.getHistoricalTemperatures('evergreen', yesterdayStr)
      ]);

      const morrison = morrisonData.status === 'fulfilled' ? morrisonData.value : null;
      const evergreen = evergreenData.status === 'fulfilled' ? evergreenData.value : null;

      let thermalDifferential: number | null = null;
      if (morrison?.afternoonMax !== null && evergreen?.morningMin !== null && 
          morrison !== null && evergreen !== null) {
        // Use yesterday's afternoon max with today's morning min (cross-day thermal cycle)
        thermalDifferential = morrison.afternoonMax - evergreen.morningMin;
      }

      return {
        morrison,
        evergreen,
        thermalDifferential
      };

    } catch (error) {
      console.error('❌ Failed to get yesterday\'s thermal cycle data:', error);
      return {
        morrison: null,
        evergreen: null,
        thermalDifferential: null
      };
    }
  }
}

export default FreeHistoricalWeatherService;
