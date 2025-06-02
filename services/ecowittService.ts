import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// Ecowitt API constants
const BASE_URL = 'https://api.ecowitt.net/api/v3';

export interface EcowittWindDataPoint {
  time: string;
  timestamp: number;
  windSpeed: number; // m/s from API
  windSpeedMph: number; // converted to mph
  windGust: number; // m/s from API
  windGustMph: number; // converted to mph
  windDirection: number; // degrees
  temperature?: number; // optional temperature data
  humidity?: number; // optional humidity data
}

export interface EcowittApiConfig {
  applicationKey: string;
  apiKey: string;
  macAddress: string; // Device MAC address
}

export interface EcowittHistoricResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    list: Array<{
      datetime: string;
      [key: string]: any; // Wind speed, direction, etc. fields vary by device
    }>;
  };
}

// Storage keys
const ECOWITT_CONFIG_KEY = 'ecowitt_config';
const ECOWITT_CACHE_KEY = 'ecowitt_wind_data_cache';

/**
 * Convert m/s to mph
 */
function msToMph(ms: number): number {
  return Math.round(ms * 2.237 * 100) / 100;
}

/**
 * Get stored Ecowitt API configuration
 */
export async function getEcowittConfig(): Promise<EcowittApiConfig | null> {
  try {
    const configJson = await AsyncStorage.getItem(ECOWITT_CONFIG_KEY);
    return configJson ? JSON.parse(configJson) : null;
  } catch (error) {
    console.error('Error loading Ecowitt config:', error);
    return null;
  }
}

/**
 * Store Ecowitt API configuration
 */
export async function setEcowittConfig(config: EcowittApiConfig): Promise<void> {
  try {
    await AsyncStorage.setItem(ECOWITT_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving Ecowitt config:', error);
    throw error;
  }
}

/**
 * Fetch historic wind data from Ecowitt API for current day
 */
export async function fetchEcowittWindData(): Promise<EcowittWindDataPoint[]> {
  console.log('🌬️ Fetching Ecowitt wind data...');
  
  const config = await getEcowittConfig();
  if (!config) {
    throw new Error('Ecowitt API configuration not found. Please configure your API keys in settings.');
  }

  try {
    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      start_date: Math.floor(startOfDay.getTime() / 1000).toString(),
      end_date: Math.floor(endOfDay.getTime() / 1000).toString(),
      cycle_type: '5min', // 5-minute intervals for detailed data
    };

    console.log('📡 Making Ecowitt API request with params:', {
      ...params,
      api_key: '***hidden***'
    });

    const response = await axios.get<EcowittHistoricResponse>(`${BASE_URL}/device/history`, {
      params,
      timeout: 10000,
      headers: {
        'User-Agent': Platform.select({
          ios: 'DawnPatrol/1.0 (iOS)',
          android: 'DawnPatrol/1.0 (Android)',
          default: 'DawnPatrol/1.0'
        })
      }
    });

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt API error: ${response.data.msg}`);
    }

    console.log('📊 Received Ecowitt data points:', response.data.data.list.length);

    // Transform API response to our format
    const windData: EcowittWindDataPoint[] = response.data.data.list
      .map(item => {
        // Parse datetime from API (format: "2025-06-02 14:30:00")
        const timestamp = new Date(item.datetime).getTime();
        
        // Extract wind data - field names may vary by device
        // Common field names: windspeed, winddir, windgust
        const windSpeedMs = parseFloat(item.windspeed || item.wind_speed || '0');
        const windGustMs = parseFloat(item.windgust || item.wind_gust || windSpeedMs);
        const windDirection = parseFloat(item.winddir || item.wind_dir || '0');
        
        return {
          time: item.datetime,
          timestamp,
          windSpeed: windSpeedMs,
          windSpeedMph: msToMph(windSpeedMs),
          windGust: windGustMs,
          windGustMph: msToMph(windGustMs),
          windDirection,
          temperature: item.temp || item.temperature,
          humidity: item.humidity
        };
      })
      .filter(point => !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Cache the data
    await cacheEcowittData(windData);
    
    console.log('✅ Processed Ecowitt wind data points:', windData.length);
    return windData;

  } catch (error) {
    console.error('❌ Error fetching Ecowitt wind data:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API credentials. Please check your Ecowitt API keys.');
      } else if (error.response?.status === 429) {
        throw new Error('API rate limit exceeded. Please try again later.');
      } else if (error.response && error.response.status >= 500) {
        throw new Error('Ecowitt server error. Please try again later.');
      }
    }
    
    throw error;
  }
}

/**
 * Cache Ecowitt wind data
 */
async function cacheEcowittData(data: EcowittWindDataPoint[]): Promise<void> {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };
    await AsyncStorage.setItem(ECOWITT_CACHE_KEY, JSON.stringify(cacheData));
    console.log('💾 Cached Ecowitt wind data');
  } catch (error) {
    console.error('Error caching Ecowitt data:', error);
  }
}

/**
 * Get cached Ecowitt wind data
 */
export async function getCachedEcowittData(): Promise<EcowittWindDataPoint[]> {
  try {
    const cachedJson = await AsyncStorage.getItem(ECOWITT_CACHE_KEY);
    if (!cachedJson) return [];
    
    const cached = JSON.parse(cachedJson);
    const today = new Date().toISOString().split('T')[0];
    
    // Only return cached data if it's from today
    if (cached.date === today && cached.data && Array.isArray(cached.data)) {
      console.log('📱 Using cached Ecowitt data:', cached.data.length, 'points');
      return cached.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading cached Ecowitt data:', error);
    return [];
  }
}

/**
 * Clear cached Ecowitt wind data
 */
export async function clearEcowittDataCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ECOWITT_CACHE_KEY);
    console.log('🗑️ Cleared Ecowitt data cache');
  } catch (error) {
    console.error('Error clearing Ecowitt data cache:', error);
  }
}

/**
 * Convert EcowittWindDataPoint to WindDataPoint for compatibility with existing components
 */
export function convertToWindDataPoint(ecowittData: EcowittWindDataPoint[]): import('./windService').WindDataPoint[] {
  return ecowittData.map(point => ({
    time: point.time,
    timestamp: point.timestamp,
    windSpeed: point.windSpeedMph,
    windSpeedMph: point.windSpeedMph,
    windGust: point.windGustMph,
    windDirection: point.windDirection
  }));
}
