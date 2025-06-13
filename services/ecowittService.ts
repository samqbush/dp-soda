import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import {
  DEVICE_MAC_STORAGE_KEY,
  ECOWITT_CONFIG,
  MAC_ADDRESS_CACHE_DURATION
} from '../config/ecowittConfig';

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

export interface EcowittDevice {
  id: number;
  name: string;
  mac: string;
  type: number;
  date_zone_id: string;
  createtime: number;
  longitude: number;
  latitude: number;
  stationtype: string;
  iotdevice_list: any[];
}

export interface EcowittDeviceListResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    list: EcowittDevice[];
    pageNum: number;
    total: number;
    totalPage: number;
  };
}

export interface EcowittHistoricResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    wind: {
      wind_speed: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      wind_gust: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      wind_direction: {
        unit: string;
        list: { [timestamp: string]: string };
      };
    };
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
 * Get stored Ecowitt API configuration (legacy function - kept for compatibility)
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
 * Debug function to test device list API and log response structure
 */
export async function debugDeviceListAPI(): Promise<void> {
  console.log('🔍 DEBUG: Testing device list API...');
  
  try {
    const params = {
      application_key: ECOWITT_CONFIG.applicationKey,
      api_key: ECOWITT_CONFIG.apiKey,
      call_back: 'device', // Request device information
    };

    console.log('📡 DEBUG: Making API request to device/list');
    
    const response = await axios.get(`${BASE_URL}/device/list`, {
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

    console.log('📊 DEBUG: Raw API response:', JSON.stringify(response.data, null, 2));
    console.log('📊 DEBUG: Response status:', response.status);
    console.log('📊 DEBUG: Response headers:', response.headers);
    
    if (response.data.code !== 0) {
      console.error('❌ DEBUG: API returned error code:', response.data.code, response.data.msg);
    } else {
      console.log('✅ DEBUG: API call successful');
      console.log('📊 DEBUG: Response data structure:');
      console.log('  - data exists:', !!response.data.data);
      console.log('  - list exists:', !!response.data.data?.list);
      console.log('  - list is array:', Array.isArray(response.data.data?.list));
      console.log('  - list length:', response.data.data?.list?.length);
      console.log('  - pageNum:', response.data.data?.pageNum);
      console.log('  - total:', response.data.data?.total);
      
      if (response.data.data?.list) {
        response.data.data.list.forEach((device: any, index: number) => {
          console.log(`  - Device ${index}:`, JSON.stringify(device, null, 4));
        });
      }
    }
    
  } catch (error) {
    console.error('❌ DEBUG: Device list API failed:', error);
    if (axios.isAxiosError(error)) {
      console.error('❌ DEBUG: Response data:', error.response?.data);
      console.error('❌ DEBUG: Response status:', error.response?.status);
    }
  }
}

/**
 * Fetch device list from Ecowitt API to get MAC address automatically
 */
export async function fetchEcowittDeviceList(): Promise<EcowittDevice[]> {
  console.log('📱 Fetching Ecowitt device list...');
  
  try {
    const params = {
      application_key: ECOWITT_CONFIG.applicationKey,
      api_key: ECOWITT_CONFIG.apiKey,
      call_back: 'device', // Request device information
    };

    console.log('📡 Making Ecowitt device list API request');

    const response = await axios.get<EcowittDeviceListResponse>(`${BASE_URL}/device/list`, {
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
      throw new Error(`Ecowitt device list API error: ${response.data.msg}`);
    }

    // Validate response structure - the API returns 'list' not 'device_list'
    if (!response.data.data || !Array.isArray(response.data.data.list)) {
      console.error('❌ Invalid device list response structure:', response.data);
      throw new Error('Invalid device list response from Ecowitt API');
    }

    const deviceList = response.data.data.list;
    console.log('📊 Received Ecowitt devices:', deviceList.length);
    return deviceList;

  } catch (error) {
    console.error('❌ Error fetching Ecowitt device list:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API credentials for device list.');
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
 * Get or fetch the device MAC address automatically
 */
export async function getDeviceMacAddress(): Promise<string> {
  try {
    // Check if we have a cached MAC address
    const cachedMacData = await AsyncStorage.getItem(DEVICE_MAC_STORAGE_KEY);
    
    if (cachedMacData) {
      const parsed = JSON.parse(cachedMacData);
      const now = Date.now();
      
      // Use cached MAC if it's still valid (within cache duration)
      if (parsed.timestamp && (now - parsed.timestamp) < MAC_ADDRESS_CACHE_DURATION && parsed.macAddress) {
        console.log('📱 Using cached device MAC address');
        return parsed.macAddress;
      }
    }

    // Fetch fresh device list
    console.log('🔍 Fetching fresh device MAC address...');
    const devices = await fetchEcowittDeviceList();
    
    if (!devices || devices.length === 0) {
      throw new Error('No devices found in your Ecowitt account. Please check your API credentials and ensure you have registered devices.');
    }

    // Select the best device for Standley Lake monitoring
    // Look for "DP Standley West" device first, otherwise use first device
    let selectedDevice = devices.find(device => 
      device && device.name && device.name.toLowerCase().includes('standley')
    );
    
    if (!selectedDevice) {
      selectedDevice = devices[0];
      if (!selectedDevice) {
        throw new Error('No valid devices found in your Ecowitt account.');
      }
      console.log('⚠️ No Standley device found, using first device:', selectedDevice.name || 'Unknown');
    } else {
      console.log('✅ Using Standley device:', selectedDevice.name || 'Unknown');
    }

    // Validate device has required fields
    if (!selectedDevice.mac) {
      throw new Error('Selected device does not have a MAC address.');
    }

    // Cache the MAC address
    const cacheData = {
      macAddress: selectedDevice.mac,
      timestamp: Date.now(),
      deviceName: selectedDevice.name || 'Unknown Device',
      deviceModel: selectedDevice.stationtype || 'Unknown Model'
    };
    
    await AsyncStorage.setItem(DEVICE_MAC_STORAGE_KEY, JSON.stringify(cacheData));
    console.log('💾 Cached device MAC address for device:', selectedDevice.name || 'Unknown');
    
    return selectedDevice.mac;

  } catch (error) {
    console.error('❌ Error getting device MAC address:', error);
    throw error;
  }
}

/**
 * Select device by name from device list
 */
export function selectDeviceByName(devices: EcowittDevice[], deviceName: string): EcowittDevice | null {
  if (!devices || devices.length === 0) {
    return null;
  }

  // Look for exact device name match
  let selectedDevice = devices.find(device => 
    device && device.name && device.name === deviceName
  );
  
  // If no exact match, try partial match (case insensitive)
  if (!selectedDevice) {
    const searchName = deviceName.toLowerCase();
    selectedDevice = devices.find(device => 
      device && device.name && device.name.toLowerCase().includes(searchName)
    );
  }
  
  if (selectedDevice) {
    console.log(`✅ Found device "${deviceName}":`, selectedDevice.name, `(${selectedDevice.mac})`);
    return selectedDevice;
  }
  
  console.warn(`❌ Device "${deviceName}" not found in device list`);
  return null;
}

/**
 * Get device MAC address for specific device name
 */
export async function getDeviceMacAddressForDevice(deviceName: string): Promise<string> {
  try {
    // For device-specific requests, we need fresh device list (no caching)
    console.log(`🔍 Fetching device MAC address for: ${deviceName}...`);
    const devices = await fetchEcowittDeviceList();
    
    if (!devices || devices.length === 0) {
      throw new Error('No devices found in your Ecowitt account. Please check your API credentials and ensure you have registered devices.');
    }

    // Select the specific device
    const selectedDevice = selectDeviceByName(devices, deviceName);
    
    if (!selectedDevice) {
      const availableDevices = devices.map(d => d.name).join(', ');
      throw new Error(`Device "${deviceName}" not found. Available devices: ${availableDevices}`);
    }

    // Validate device has required fields
    if (!selectedDevice.mac) {
      throw new Error(`Selected device "${deviceName}" does not have a MAC address.`);
    }

    console.log(`✅ Using device "${deviceName}":`, selectedDevice.name || 'Unknown');
    return selectedDevice.mac;

  } catch (error) {
    console.error(`❌ Error getting device MAC address for ${deviceName}:`, error);
    throw error;
  }
}

/**
 * Get the complete Ecowitt configuration with auto-fetched MAC address (for Standley Lake)
 */
export async function getAutoEcowittConfig(): Promise<EcowittApiConfig> {
  const macAddress = await getDeviceMacAddress();
  
  return {
    applicationKey: ECOWITT_CONFIG.applicationKey,
    apiKey: ECOWITT_CONFIG.apiKey,
    macAddress
  };
}

/**
 * Get the complete Ecowitt configuration with auto-fetched MAC address for specific device
 */
export async function getAutoEcowittConfigForDevice(deviceName: string): Promise<EcowittApiConfig> {
  const macAddress = await getDeviceMacAddressForDevice(deviceName);
  
  return {
    applicationKey: ECOWITT_CONFIG.applicationKey,
    apiKey: ECOWITT_CONFIG.apiKey,
    macAddress
  };
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
  
  // Use auto-configuration instead of manual config
  const config = await getAutoEcowittConfig();

  try {
    // Get today's date range
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Format dates as YYYY-MM-DD HH:MM:SS (Ecowitt API format)
    const formatEcowittDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      start_date: formatEcowittDate(startOfDay),
      end_date: formatEcowittDate(endOfDay),
      cycle_type: '5min', // 5-minute intervals for detailed data
      temp_unit: '1', // Celsius (1 = Celsius, 2 = Fahrenheit)
      pressure_unit: '3', // hPa (3 = hPa, 1 = inHg)
      wind_unit: '6', // m/s (6 = m/s, 7 = mph)
      call_back: 'wind', // Request wind data
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

    console.log('📊 Ecowitt API response received. Status:', response.status);
    console.log('📊 Response data structure:', JSON.stringify(response.data, null, 2));

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt API error: ${response.data.msg}`);
    }

    // Handle empty data response gracefully (station offline or no data available)
    if (!response.data.data || Array.isArray(response.data.data) && response.data.data.length === 0) {
      console.warn(`⚠️ No data available from Ecowitt station - station may be offline or not reporting data`);
      console.log(`🔄 API returned success but empty data array`);
      return []; // Return empty array instead of crashing
    }

    // Validate response structure before accessing data
    if (!response.data.data.wind) {
      console.error('❌ Invalid Ecowitt API response structure:', JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Ecowitt API - missing wind data');
    }

    const windData = response.data.data.wind;
    if (!windData.wind_speed?.list || !windData.wind_direction?.list) {
      console.error('❌ Missing wind speed or direction data in response');
      throw new Error('Invalid response structure from Ecowitt API - missing wind measurements');
    }

    // Get timestamps from wind speed data (they should be consistent across all measurements)
    const timestamps = Object.keys(windData.wind_speed.list);
    console.log('📊 Received Ecowitt data points:', timestamps.length);

    // Transform API response to our format
    const windDataPoints: EcowittWindDataPoint[] = timestamps
      .map(timestamp => {
        // Convert timestamp to Date object and ISO string
        const timestampMs = parseInt(timestamp) * 1000;
        const date = new Date(timestampMs);
        const timeString = date.toISOString();
        
        // Extract wind data from the response structure
        const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windData.wind_direction.list[timestamp] || '0');
        
        // Convert to m/s for internal consistency (API already provides mph)
        const windSpeedMs = windSpeedMph / 2.237;
        const windGustMs = windGustMph / 2.237;
        
        return {
          time: timeString,
          timestamp: timestampMs,
          windSpeed: windSpeedMs,
          windSpeedMph,
          windGust: windGustMs,
          windGustMph,
          windDirection,
          temperature: undefined, // Not available in wind-only response
          humidity: undefined // Not available in wind-only response
        };
      })
      .filter(point => !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Cache the data
    await cacheEcowittData(windDataPoints);
    
    console.log('✅ Processed Ecowitt wind data points:', windDataPoints.length);
    return windDataPoints;

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
 * Fetch historic wind data from Ecowitt API for specific device
 */
export async function fetchEcowittWindDataForDevice(deviceName: string): Promise<EcowittWindDataPoint[]> {
  console.log(`🌬️ Fetching Ecowitt wind data for ${deviceName}...`);
  
  try {
    const config = await getAutoEcowittConfigForDevice(deviceName);
    
    // Format dates as YYYY-MM-DD HH:MM:SS (Ecowitt API format)
    const formatEcowittDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      start_date: formatEcowittDate(startOfDay),
      end_date: formatEcowittDate(endOfDay),
      cycle_type: '5min', // 5-minute intervals for detailed data
      temp_unit: '1', // Celsius (1 = Celsius, 2 = Fahrenheit)
      pressure_unit: '3', // hPa (3 = hPa, 1 = inHg)
      wind_unit: '6', // m/s (6 = m/s, 7 = mph)
      call_back: 'wind', // Request wind data
    };

    console.log(`📡 Making Ecowitt history API request for ${deviceName}`);

    const response = await axios.get<EcowittHistoricResponse>(`${BASE_URL}/device/history`, {
      params,
      timeout: 15000, // Longer timeout for history data
      headers: {
        'User-Agent': Platform.select({
          ios: 'DawnPatrol/1.0 (iOS)',
          android: 'DawnPatrol/1.0 (Android)',
          default: 'DawnPatrol/1.0'
        })
      }
    });

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt history API error: ${response.data.msg}`);
    }

    // Handle empty data response gracefully (station offline or no data available)
    if (!response.data.data || Array.isArray(response.data.data) && response.data.data.length === 0) {
      console.warn(`⚠️ No data available from ${deviceName} - station may be offline or not reporting data`);
      console.log(`🔄 API returned success but empty data array for ${deviceName}`);
      return []; // Return empty array instead of crashing
    }

    // Validate response structure before accessing data
    if (!response.data.data.wind) {
      console.error(`❌ Invalid Ecowitt API response structure for ${deviceName}:`, JSON.stringify(response.data, null, 2));
      throw new Error('Invalid response structure from Ecowitt API - missing wind data');
    }

    const windData = response.data.data.wind;
    if (!windData.wind_speed?.list || !windData.wind_direction?.list) {
      console.error(`❌ Missing wind speed or direction data in response for ${deviceName}`);
      throw new Error('Invalid response structure from Ecowitt API - missing wind measurements');
    }

    // Get timestamps from wind speed data (they should be consistent across all measurements)
    const timestamps = Object.keys(windData.wind_speed.list);
    console.log(`📊 Received ${timestamps.length} data points for ${deviceName}`);

    // Transform API response to our format
    const windDataPoints: EcowittWindDataPoint[] = timestamps
      .map(timestamp => {
        // Convert timestamp to Date object and ISO string
        const timestampMs = parseInt(timestamp) * 1000;
        const date = new Date(timestampMs);
        const timeString = date.toISOString();
        
        // Extract wind data from the response structure
        const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windData.wind_direction.list[timestamp] || '0');
        
        // Convert to m/s for internal consistency (API provides mph but we want m/s internally)
        const windSpeedMs = windSpeedMph / 2.237;
        const windGustMs = windGustMph / 2.237;
        
        return {
          time: timeString,
          timestamp: timestampMs,
          windSpeed: windSpeedMs,
          windSpeedMph,
          windGust: windGustMs,
          windGustMph,
          windDirection,
          temperature: undefined, // Not available in wind-only response
          humidity: undefined // Not available in wind-only response
        };
      })
      .filter(point => !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    // Cache the data using enhanced caching
    await cacheEcowittDataEnhanced(deviceName, windDataPoints, false);
    console.log(`✅ Successfully fetched and cached ${windDataPoints.length} wind data points for ${deviceName}`);
    
    return windDataPoints;

  } catch (error) {
    console.error(`❌ Error fetching Ecowitt wind data for ${deviceName}:`, error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error(`Invalid API credentials for ${deviceName} data.`);
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
 * Enhanced Cache Types and Interfaces
 */
export interface EcowittCacheMetadata {
  date: string; // YYYY-MM-DD
  lastUpdated: number; // timestamp
  firstDataTime?: number; // timestamp of first data point
  lastDataTime?: number; // timestamp of last data point
  dataCount: number;
  cacheVersion: string; // for future cache format changes
}

export interface EcowittCacheData {
  data: EcowittWindDataPoint[];
  metadata: EcowittCacheMetadata;
}

// Storage keys for device-specific caches
const ECOWITT_DEVICE_CACHE_KEY = (deviceName: string, date: string) => 
  `ecowitt_${deviceName.replace(/\s+/g, '_')}_${date}`;

/**
 * Enhanced incremental fetch function - only fetches new data since last update
 */
export async function fetchIncrementalEcowittData(
  deviceName: string,
  lastDataTimestamp?: number
): Promise<EcowittWindDataPoint[]> {
  console.log(`🔄 Fetching incremental Ecowitt wind data for ${deviceName}...`);
  
  try {
    const config = await getAutoEcowittConfigForDevice(deviceName);
    
    // Calculate time range for incremental update
    const now = new Date();
    let startTime: Date;
    
    if (lastDataTimestamp) {
      // Start from 5 minutes after the last data point to avoid duplicates
      startTime = new Date(lastDataTimestamp + 5 * 60 * 1000);
    } else {
      // Fallback to start of day if no last timestamp
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    
    // Don't fetch if start time is in the future or very recent (less than 5 min ago)
    if (startTime >= now || (now.getTime() - startTime.getTime()) < 5 * 60 * 1000) {
      console.log('⏭️ No new data to fetch - too recent');
      return [];
    }
    
    const formatEcowittDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };
    
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      start_date: formatEcowittDate(startTime),
      end_date: formatEcowittDate(now),
      cycle_type: '5min',
      temp_unit: '1',
      pressure_unit: '3',
      wind_unit: '6',
      call_back: 'wind',
    };

    console.log(`📡 Incremental update: ${formatEcowittDate(startTime)} to ${formatEcowittDate(now)}`);

    const response = await axios.get<EcowittHistoricResponse>(`${BASE_URL}/device/history`, {
      params,
      timeout: 15000,
      headers: {
        'User-Agent': Platform.select({
          ios: 'DawnPatrol/1.0 (iOS)',
          android: 'DawnPatrol/1.0 (Android)',
          default: 'DawnPatrol/1.0'
        })
      }
    });

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt incremental API error: ${response.data.msg}`);
    }

    // Handle empty response
    if (!response.data.data?.wind?.wind_speed?.list) {
      console.log('📊 No new data available from incremental fetch');
      return [];
    }

    const windData = response.data.data.wind;
    const timestamps = Object.keys(windData.wind_speed.list);
    
    console.log(`📊 Incremental fetch returned ${timestamps.length} new data points`);

    // Transform API response to our format
    const newDataPoints: EcowittWindDataPoint[] = timestamps
      .map(timestamp => {
        const timestampMs = parseInt(timestamp) * 1000;
        const date = new Date(timestampMs);
        const timeString = date.toISOString();
        
        const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windData.wind_direction.list[timestamp] || '0');
        
        const windSpeedMs = windSpeedMph / 2.237;
        const windGustMs = windGustMph / 2.237;
        
        return {
          time: timeString,
          timestamp: timestampMs,
          windSpeed: windSpeedMs,
          windSpeedMph,
          windGust: windGustMs,
          windGustMph,
          windDirection,
          temperature: undefined,
          humidity: undefined
        };
      })
      .filter(point => !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0)
      .sort((a, b) => a.timestamp - b.timestamp);

    console.log(`✅ Processed ${newDataPoints.length} new valid data points`);
    return newDataPoints;

  } catch (error) {
    console.error(`❌ Error in incremental fetch for ${deviceName}:`, error);
    throw error;
  }
}

/**
 * Enhanced cache function with device-specific storage and metadata
 */
export async function cacheEcowittDataEnhanced(
  deviceName: string, 
  data: EcowittWindDataPoint[],
  isIncremental = false
): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = ECOWITT_DEVICE_CACHE_KEY(deviceName, today);
    
    let finalData = data;
    let metadata: EcowittCacheMetadata;
    
    if (isIncremental) {
      // Merge with existing cache
      const existingCache = await getEnhancedCachedData(deviceName);
      if (existingCache) {
        // Merge and deduplicate data
        const allData = [...existingCache.data, ...data];
        finalData = deduplicateWindData(allData);
        console.log(`🔄 Merged cache: ${existingCache.data.length} existing + ${data.length} new = ${finalData.length} total`);
      } else {
        finalData = data;
      }
    }
    
    // Create metadata
    if (finalData.length > 0) {
      const timestamps = finalData.map(d => d.timestamp).sort((a, b) => a - b);
      metadata = {
        date: today,
        lastUpdated: Date.now(),
        firstDataTime: timestamps[0],
        lastDataTime: timestamps[timestamps.length - 1],
        dataCount: finalData.length,
        cacheVersion: '1.0'
      };
    } else {
      metadata = {
        date: today,
        lastUpdated: Date.now(),
        dataCount: 0,
        cacheVersion: '1.0'
      };
    }
    
    const cacheData: EcowittCacheData = {
      data: finalData,
      metadata
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`💾 Enhanced cache saved for ${deviceName}: ${finalData.length} points`);
    
  } catch (error) {
    console.error(`Error caching enhanced data for ${deviceName}:`, error);
  }
}

/**
 * Get enhanced cached data with metadata
 */
export async function getEnhancedCachedData(deviceName: string): Promise<EcowittCacheData | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = ECOWITT_DEVICE_CACHE_KEY(deviceName, today);
    
    const cachedJson = await AsyncStorage.getItem(cacheKey);
    if (!cachedJson) return null;
    
    const cached: EcowittCacheData = JSON.parse(cachedJson);
    
    // Validate cache structure and date
    if (!cached.metadata || cached.metadata.date !== today) {
      console.log(`📱 Cache invalid or from different day for ${deviceName}`);
      return null;
    }
    
    console.log(`📱 Using enhanced cached data for ${deviceName}: ${cached.data.length} points`);
    return cached;
    
  } catch (error) {
    console.error(`Error loading enhanced cached data for ${deviceName}:`, error);
    return null;
  }
}

/**
 * Smart refresh function - determines whether to do full or incremental fetch
 */
export async function smartRefreshEcowittData(deviceName: string): Promise<EcowittWindDataPoint[]> {
  console.log(`🧠 Smart refresh for ${deviceName}...`);
  
  try {
    const cachedData = await getEnhancedCachedData(deviceName);
    
    if (!cachedData || cachedData.data.length === 0) {
      // No cache or empty cache - do full fetch
      console.log(`📥 No cache found - doing full fetch for ${deviceName}`);
      const fullData = await fetchEcowittWindDataForDevice(deviceName);
      await cacheEcowittDataEnhanced(deviceName, fullData, false);
      return fullData;
    }
    
    // Check if cache is recent enough for incremental update
    const now = Date.now();
    const cacheAge = now - cachedData.metadata.lastUpdated;
    const maxIncrementalAge = 4 * 60 * 60 * 1000; // 4 hours
    
    if (cacheAge > maxIncrementalAge) {
      // Cache is too old - do full refresh
      console.log(`📥 Cache too old (${Math.round(cacheAge / 60000)} min) - doing full fetch for ${deviceName}`);
      const fullData = await fetchEcowittWindDataForDevice(deviceName);
      await cacheEcowittDataEnhanced(deviceName, fullData, false);
      return fullData;
    }
    
    // Try incremental update
    try {
      const newData = await fetchIncrementalEcowittData(deviceName, cachedData.metadata.lastDataTime);
      
      if (newData.length > 0) {
        await cacheEcowittDataEnhanced(deviceName, newData, true);
        // Return merged data
        const updatedCache = await getEnhancedCachedData(deviceName);
        return updatedCache?.data || cachedData.data;
      } else {
        // No new data - return cached data
        console.log(`📱 No new data - using cached data for ${deviceName}`);
        return cachedData.data;
      }
      
    } catch (incrementalError) {
      console.warn(`⚠️ Incremental update failed for ${deviceName}, falling back to full fetch:`, incrementalError);
      const fullData = await fetchEcowittWindDataForDevice(deviceName);
      await cacheEcowittDataEnhanced(deviceName, fullData, false);
      return fullData;
    }
    
  } catch (error) {
    console.error(`❌ Smart refresh failed for ${deviceName}:`, error);
    throw error;
  }
}

/**
 * Deduplicate wind data points based on timestamp
 */
function deduplicateWindData(data: EcowittWindDataPoint[]): EcowittWindDataPoint[] {
  const seen = new Set<number>();
  return data.filter(point => {
    if (seen.has(point.timestamp)) {
      return false;
    }
    seen.add(point.timestamp);
    return true;
  }).sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Clear enhanced cache for a specific device
 */
export async function clearEnhancedDeviceCache(deviceName: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = ECOWITT_DEVICE_CACHE_KEY(deviceName, today);
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared enhanced cache for ${deviceName}`);
  } catch (error) {
    console.error(`Error clearing enhanced cache for ${deviceName}:`, error);
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
 * Get cached Ecowitt wind data (legacy function - maintained for compatibility)
 * For new code, use getEnhancedCachedData instead
 */
export async function getCachedEcowittData(): Promise<EcowittWindDataPoint[]> {
  try {
    // Try to get enhanced cache data for any device
    // This is a fallback for legacy compatibility
    const cachedJson = await AsyncStorage.getItem(ECOWITT_CACHE_KEY);
    if (!cachedJson) return [];
    
    const cached = JSON.parse(cachedJson);
    const today = new Date().toISOString().split('T')[0];
    
    // Only return cached data if it's from today
    if (cached.date === today && cached.data && Array.isArray(cached.data)) {
      console.log('📱 Using legacy cached Ecowitt data:', cached.data.length, 'points');
      return cached.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error loading cached Ecowitt data:', error);
    return [];
  }
}

/**
 * Clear cached Ecowitt wind data and device MAC address
 */
export async function clearEcowittDataCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ECOWITT_CACHE_KEY);
    await AsyncStorage.removeItem(DEVICE_MAC_STORAGE_KEY);
    console.log('🗑️ Cleared Ecowitt data and device cache');
  } catch (error) {
    console.error('Error clearing Ecowitt cache:', error);
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
