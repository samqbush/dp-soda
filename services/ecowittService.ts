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

export interface EcowittRealTimeWindData {
  wind_speed: {
    time: string;
    unit: string;
    value: string;
  };
  wind_gust: {
    time: string;
    unit: string;
    value: string;
  };
  wind_direction: {
    time: string;
    unit: string;
    value: string;
  };
}

export interface EcowittRealTimeResponse {
  code: number;
  msg: string;
  time: string;
  data: {
    wind?: EcowittRealTimeWindData;
    outdoor?: {
      temperature?: {
        time: string;
        unit: string;
        value: string;
      };
      humidity?: {
        time: string;
        unit: string;
        value: string;
      };
    };
    // Add other sections as needed
  };
}

export interface EcowittCurrentWindConditions {
  windSpeed: number; // in m/s from API
  windSpeedMph: number; // converted to mph
  windGust: number; // in m/s from API
  windGustMph: number; // converted to mph
  windDirection: number; // degrees
  timestamp: number; // Unix timestamp
  time: string; // ISO string
  temperature?: number; // optional temperature data
  humidity?: number; // optional humidity data
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

// In-memory cache for device list to prevent rapid API calls
let deviceListCache: {
  data: EcowittDevice[] | null;
  timestamp: number;
  promise: Promise<EcowittDevice[]> | null;
} = {
  data: null,
  timestamp: 0,
  promise: null
};

const DEVICE_LIST_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for in-memory cache

/**
 * Fetch device list from Ecowitt API to get MAC address automatically
 * Includes throttling and caching to prevent rate limiting
 */
export async function fetchEcowittDeviceList(): Promise<EcowittDevice[]> {
  console.log('📱 Fetching Ecowitt device list...');
  
  try {
    // Check in-memory cache first
    const now = Date.now();
    if (deviceListCache.data && (now - deviceListCache.timestamp) < DEVICE_LIST_CACHE_DURATION) {
      console.log('📱 Using cached device list');
      return deviceListCache.data;
    }

    const params = {
      application_key: ECOWITT_CONFIG.applicationKey,
      api_key: ECOWITT_CONFIG.apiKey,
      call_back: 'device', // Request device information
    };

    console.log('📡 Making Ecowitt device list API request');

    // Use a promise to handle the API request
    if (!deviceListCache.promise) {
      deviceListCache.promise = axios.get<EcowittDeviceListResponse>(`${BASE_URL}/device/list`, {
        params,
        timeout: 10000,
        headers: {
          'User-Agent': Platform.select({
            ios: 'DawnPatrol/1.0 (iOS)',
            android: 'DawnPatrol/1.0 (Android)',
            default: 'DawnPatrol/1.0'
          })
        }
      }).then(response => {
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

        // Update in-memory cache
        deviceListCache = {
          data: deviceList,
          timestamp: Date.now(),
          promise: null // Reset promise
        };

        return deviceList;

      }).catch(error => {
        deviceListCache.promise = null; // Reset promise on error
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
        
        // Check for specific Ecowitt "Operation too frequent" error
        if (error instanceof Error && error.message.includes('Operation too frequent')) {
          throw new Error('Ecowitt API rate limit exceeded. Please wait a moment and try again.');
        }
        
        throw error;
      });
    }

    // Wait for the ongoing request to complete
    return await deviceListCache.promise;

  } catch (error) {
    console.error('❌ Error fetching Ecowitt device list:', error);
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
    // Check if we have a cached MAC address for this specific device
    const deviceCacheKey = `${DEVICE_MAC_STORAGE_KEY}_${deviceName.replace(/\s+/g, '_')}`;
    const cachedMacData = await AsyncStorage.getItem(deviceCacheKey);
    
    if (cachedMacData) {
      const parsed = JSON.parse(cachedMacData);
      const now = Date.now();
      
      // Use cached MAC if it's still valid (within cache duration)
      if (parsed.timestamp && (now - parsed.timestamp) < MAC_ADDRESS_CACHE_DURATION && parsed.macAddress) {
        console.log(`📱 Using cached device MAC address for ${deviceName}`);
        return parsed.macAddress;
      }
    }

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

    // Cache the MAC address for this specific device
    const cacheData = {
      macAddress: selectedDevice.mac,
      timestamp: Date.now(),
      deviceName: selectedDevice.name || 'Unknown Device',
      deviceModel: selectedDevice.stationtype || 'Unknown Model'
    };
    
    await AsyncStorage.setItem(deviceCacheKey, JSON.stringify(cacheData));
    console.log(`💾 Cached device MAC address for ${deviceName}:`, selectedDevice.name || 'Unknown');

    console.log(`✅ Using device "${deviceName}":`, selectedDevice.name || 'Unknown');
    return selectedDevice.mac;

  } catch (error) {
    console.error(`❌ Error getting device MAC address for ${deviceName}:`, error);
    
    // If we get a rate limit error, try to return a cached value even if it's older
    if (error instanceof Error && error.message.includes('Operation too frequent')) {
      console.log(`⚠️ Rate limited, attempting to use any cached MAC for ${deviceName}...`);
      
      const deviceCacheKey = `${DEVICE_MAC_STORAGE_KEY}_${deviceName.replace(/\s+/g, '_')}`;
      const cachedMacData = await AsyncStorage.getItem(deviceCacheKey);
      
      if (cachedMacData) {
        const parsed = JSON.parse(cachedMacData);
        if (parsed.macAddress) {
          console.log(`📱 Using older cached MAC for ${deviceName} due to rate limiting`);
          return parsed.macAddress;
        }
      }
    }
    
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

    // Format dates as YYYY-MM-DD HH:MM:SS in device timezone
    // The device is in America/Denver timezone, and the API expects dates in device local time
    const formatEcowittDate = (date: Date): string => {
      // Convert to Mountain Time for the API request
      // In summer (MDT), this is UTC-6; in winter (MST), this is UTC-7
      // For June 2025, we're in Mountain Daylight Time (UTC-6)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      const parts = formatter.formatToParts(date);
      
      const year = parts.find(p => p.type === 'year')?.value || '2025';
      const month = parts.find(p => p.type === 'month')?.value || '01';
      const day = parts.find(p => p.type === 'day')?.value || '01';
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const second = parts.find(p => p.type === 'second')?.value || '00';
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
      wind_unit: '7', // mph (7 = mph, 6 = m/s) - Changed to mph to match our processing
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
        // API now returns mph since we requested wind_unit: '7'
        const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windData.wind_direction.list[timestamp] || '0');
        
        // Convert mph to m/s for internal consistency
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

    // Cache the data (TODO: Re-implement caching)
    // await cacheEcowittData(windDataPoints);
    
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
    
    // Format dates as YYYY-MM-DD HH:MM:SS in device timezone
    // The device is in America/Denver timezone, and the API expects dates in device local time
    const formatEcowittDate = (date: Date): string => {
      // Convert to Mountain Time for the API request
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-CA', options);
      const parts = formatter.formatToParts(date);
      
      const year = parts.find(p => p.type === 'year')?.value || '2025';
      const month = parts.find(p => p.type === 'month')?.value || '01';
      const day = parts.find(p => p.type === 'day')?.value || '01';
      const hour = parts.find(p => p.type === 'hour')?.value || '00';
      const minute = parts.find(p => p.type === 'minute')?.value || '00';
      const second = parts.find(p => p.type === 'second')?.value || '00';
      
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
      wind_unit: '7', // mph (7 = mph, 6 = m/s) - Changed to mph to match our processing
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
        // API now returns mph since we requested wind_unit: '7'
        const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windData.wind_direction.list[timestamp] || '0');
        
        // Convert mph to m/s for internal consistency
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

    // Cache the data using enhanced caching (TODO: Re-implement caching)
    // await cacheEcowittDataEnhanced(deviceName, windDataPoints, false);
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
 * Fetch real-time wind data from Ecowitt API for specific device
 * This provides more current data (within 2 hours) compared to historical data
 */
export async function fetchEcowittRealTimeWindData(deviceName: string): Promise<EcowittCurrentWindConditions | null> {
  console.log(`⚡ Fetching real-time Ecowitt wind data for ${deviceName}...`);
  
  try {
    const config = await getAutoEcowittConfigForDevice(deviceName);
    
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      call_back: 'wind,outdoor', // Request wind and outdoor data
      wind_speed_unitid: '6', // m/s
      temp_unitid: '1', // Celsius
    };

    console.log(`📡 Making Ecowitt real-time API request for ${deviceName}`);

    const response = await axios.get<EcowittRealTimeResponse>(`${BASE_URL}/device/real_time`, {
      params,
      timeout: 10000, // Shorter timeout for real-time data
      headers: {
        'User-Agent': Platform.select({
          ios: 'DawnPatrol/1.0 (iOS)',
          android: 'DawnPatrol/1.0 (Android)',
          default: 'DawnPatrol/1.0'
        })
      }
    });

    if (response.data.code !== 0) {
      throw new Error(`Ecowitt real-time API error: ${response.data.msg}`);
    }

    // Handle empty data response gracefully
    if (!response.data.data || !response.data.data.wind) {
      console.warn(`⚠️ No real-time wind data available from ${deviceName}`);
      return null;
    }

    const windData = response.data.data.wind;
    const outdoorData = response.data.data.outdoor;

    // Parse wind data
    const windSpeedMs = parseFloat(windData.wind_speed.value);
    const windGustMs = parseFloat(windData.wind_gust.value);
    const windDirection = parseFloat(windData.wind_direction.value);
    const timestamp = parseInt(windData.wind_speed.time);

    // Convert to our format
    const currentConditions: EcowittCurrentWindConditions = {
      windSpeed: windSpeedMs,
      windSpeedMph: msToMph(windSpeedMs),
      windGust: windGustMs,
      windGustMph: msToMph(windGustMs), 
      windDirection: windDirection,
      timestamp: timestamp * 1000, // Convert to milliseconds
      time: new Date(timestamp * 1000).toISOString(),
      temperature: outdoorData?.temperature ? parseFloat(outdoorData.temperature.value) : undefined,
      humidity: outdoorData?.humidity ? parseFloat(outdoorData.humidity.value) : undefined,
    };

    console.log(`✅ Retrieved real-time wind data for ${deviceName}:`, {
      windSpeed: currentConditions.windSpeedMph,
      direction: currentConditions.windDirection,
      timestamp: new Date(currentConditions.timestamp).toLocaleString()
    });

    return currentConditions;

  } catch (error) {
    console.error(`❌ Error fetching real-time wind data for ${deviceName}:`, error);
    
    // Don't throw - allow fallback to historical data
    if (axios.isAxiosError(error)) {
      console.error('Real-time API request failed:', error.response?.data || error.message);
    }
    
    return null;
  }
}

/**
 * Fetch current real-time wind data from Ecowitt API
 */
export async function fetchEcowittRealTimeData(config: EcowittApiConfig): Promise<EcowittCurrentWindConditions | null> {
  console.log('🔄 Fetching Ecowitt real-time data...');
  
  try {
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      call_back: 'wind', // Request wind data
    };

    console.log('📡 Making Ecowitt real-time API request');

    const response = await axios.get<EcowittRealTimeResponse>(`${BASE_URL}/device/real_time`, {
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
      throw new Error(`Ecowitt real-time API error: ${response.data.msg}`);
    }

    // Validate response structure
    if (!response.data.data?.wind) {
      console.warn('⚠️ No real-time wind data available');
      return null;
    }

    const windData = response.data.data.wind;
    
    // Extract wind measurements
    const windSpeedMph = parseFloat(windData.wind_speed?.value || '0');
    const windGustMph = parseFloat(windData.wind_gust?.value || windSpeedMph.toString());
    const windDirection = parseFloat(windData.wind_direction?.value || '0');
    
    // Use the timestamp from wind speed (they should all be the same)
    const timestamp = parseInt(windData.wind_speed?.time || '0') * 1000;
    const timeString = new Date(timestamp).toISOString();
    
    // Convert mph to m/s for internal consistency
    const windSpeedMs = windSpeedMph / 2.237;
    const windGustMs = windGustMph / 2.237;
    
    const realTimeConditions: EcowittCurrentWindConditions = {
      windSpeed: windSpeedMs,
      windSpeedMph,
      windGust: windGustMs,
      windGustMph,
      windDirection,
      timestamp,
      time: timeString
    };
    
    console.log('✅ Processed real-time wind data:', {
      time: timeString,
      windSpeedMph,
      windDirection
    });
    
    return realTimeConditions;

  } catch (error) {
    console.error('❌ Error fetching Ecowitt real-time data:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid API credentials for real-time data.');
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
 * Fetch combined wind data: historical + real-time for complete coverage
 */
export async function fetchEcowittCombinedWindData(): Promise<EcowittWindDataPoint[]> {
  console.log('🌬️ Fetching combined Ecowitt wind data (historical + real-time)...');
  
  const config = await getAutoEcowittConfig();
  
  try {
    // Fetch historical data for the day
    const historicalData = await fetchEcowittWindData();
    
    // Fetch current real-time data
    const realTimeData = await fetchEcowittRealTimeData(config);
    
    // Combine the data
    let combinedData = [...historicalData];
    
    if (realTimeData) {
      // Check if real-time data is newer than the last historical point
      const lastHistoricalTime = historicalData.length > 0 
        ? historicalData[historicalData.length - 1].timestamp 
        : 0;
      
      if (realTimeData.timestamp > lastHistoricalTime) {
        // Convert real-time data to wind data point format
        const realTimePoint: EcowittWindDataPoint = {
          time: realTimeData.time,
          timestamp: realTimeData.timestamp,
          windSpeed: realTimeData.windSpeed,
          windSpeedMph: realTimeData.windSpeedMph,
          windGust: realTimeData.windGust,
          windGustMph: realTimeData.windGustMph,
          windDirection: realTimeData.windDirection,
          temperature: realTimeData.temperature,
          humidity: realTimeData.humidity
        };
        
        combinedData.push(realTimePoint);
        console.log('✅ Added real-time data point to historical data');
      } else {
        console.log('⚠️ Real-time data is not newer than historical data');
      }
    }
    
    // Sort by timestamp to ensure proper order
    combinedData.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Combined data: ${historicalData.length} historical + ${realTimeData ? 1 : 0} real-time = ${combinedData.length} total points`);
    
    return combinedData;
    
  } catch (error) {
    console.error('❌ Error fetching combined wind data:', error);
    
    // Fallback to historical data only if real-time fails
    console.log('⚠️ Falling back to historical data only');
    return await fetchEcowittWindData();
  }
}

/**
 * Fetch combined wind data for specific device: historical + real-time
 */
export async function fetchEcowittCombinedWindDataForDevice(deviceName: string): Promise<EcowittWindDataPoint[]> {
  console.log(`🌬️ Fetching combined wind data for ${deviceName} (historical + real-time)...`);
  
  const config = await getAutoEcowittConfigForDevice(deviceName);
  
  try {
    // Fetch historical data for the day
    const historicalData = await fetchEcowittWindDataForDevice(deviceName);
    
    // Fetch current real-time data
    const realTimeData = await fetchEcowittRealTimeData(config);
    
    // Combine the data
    let combinedData = [...historicalData];
    
    if (realTimeData) {
      // Check if real-time data is newer than the last historical point
      const lastHistoricalTime = historicalData.length > 0 
        ? historicalData[historicalData.length - 1].timestamp 
        : 0;
      
      if (realTimeData.timestamp > lastHistoricalTime) {
        // Convert real-time data to wind data point format
        const realTimePoint: EcowittWindDataPoint = {
          time: realTimeData.time,
          timestamp: realTimeData.timestamp,
          windSpeed: realTimeData.windSpeed,
          windSpeedMph: realTimeData.windSpeedMph,
          windGust: realTimeData.windGust,
          windGustMph: realTimeData.windGustMph,
          windDirection: realTimeData.windDirection,
          temperature: realTimeData.temperature,
          humidity: realTimeData.humidity
        };
        
        combinedData.push(realTimePoint);
        console.log(`✅ Added real-time data point for ${deviceName}`);
      } else {
        console.log(`⚠️ Real-time data for ${deviceName} is not newer than historical data`);
      }
    }
    
    // Sort by timestamp to ensure proper order
    combinedData.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Combined data for ${deviceName}: ${historicalData.length} historical + ${realTimeData ? 1 : 0} real-time = ${combinedData.length} total points`);
    
    return combinedData;
    
  } catch (error) {
    console.error(`❌ Error fetching combined wind data for ${deviceName}:`, error);
    
    // Fallback to historical data only if real-time fails
    console.log(`⚠️ Falling back to historical data only for ${deviceName}`);
    return await fetchEcowittWindDataForDevice(deviceName);
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

/**
 * Simple cache clear function for device data
 */
export async function clearDeviceCache(deviceName: string): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `ecowitt_${deviceName}_${today}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log(`🗑️ Cleared cache for ${deviceName}`);
  } catch (error) {
    console.error(`Error clearing cache for ${deviceName}:`, error);
  }
}
