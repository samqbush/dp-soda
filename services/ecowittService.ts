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
  // Add transmission quality info
  transmissionQuality?: {
    isFullTransmission: boolean;
    hasOutdoorSensors: boolean;
    missingDataFields: string[];
  };
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
    wind?: {
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
    outdoor?: {
      temperature: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      humidity: {
        unit: string;
        list: { [timestamp: string]: string };
      };
    };
    indoor?: {
      temperature: {
        unit: string;
        list: { [timestamp: string]: string };
      };
      humidity: {
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

// Transmission quality interfaces
export interface TransmissionQualityInfo {
  isFullTransmission: boolean; // True if all outdoor sensors are transmitting
  hasOutdoorSensors: boolean; // True if outdoor temp/humidity are available
  hasWindData: boolean; // True if wind data is available
  hasCompleteSensorData: boolean; // True if all expected sensors are working
  transmissionGaps: TransmissionGap[]; // Array of detected gaps
  lastGoodTransmissionTime: string | null; // ISO timestamp of last complete transmission
  currentTransmissionStatus: 'good' | 'partial' | 'indoor-only' | 'offline';
}

export interface TransmissionGap {
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  durationMinutes: number;
  type: 'antenna' | 'offline' | 'partial' | 'indoor-only' | 'temporal';
  affectedSensors: string[]; // List of missing sensor types
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
      
      // Fallback implementation for Android devices without Intl support
      if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
        // Manual conversion to Mountain Time (UTC-6 for MDT, UTC-7 for MST)
        // For simplicity, we'll assume MDT (UTC-6) during summer months
        const utcTime = date.getTime();
        const isDST = isDaylightSavingTime(date);
        const mtOffset = isDST ? -6 : -7; // MDT = UTC-6, MST = UTC-7
        const mtTime = new Date(utcTime + (mtOffset * 60 * 60 * 1000));
        
        const year = mtTime.getUTCFullYear();
        const month = String(mtTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(mtTime.getUTCDate()).padStart(2, '0');
        const hour = String(mtTime.getUTCHours()).padStart(2, '0');
        const minute = String(mtTime.getUTCMinutes()).padStart(2, '0');
        const second = String(mtTime.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
      
      // Use Intl when available (iOS and modern Android)
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
      
      // Fallback implementation for Android devices without Intl support
      if (typeof Intl === 'undefined' || !Intl.DateTimeFormat) {
        // Manual conversion to Mountain Time (UTC-6 for MDT, UTC-7 for MST)
        const utcTime = date.getTime();
        const isDST = isDaylightSavingTime(date);
        const mtOffset = isDST ? -6 : -7; // MDT = UTC-6, MST = UTC-7
        const mtTime = new Date(utcTime + (mtOffset * 60 * 60 * 1000));
        
        const year = mtTime.getUTCFullYear();
        const month = String(mtTime.getUTCMonth() + 1).padStart(2, '0');
        const day = String(mtTime.getUTCDate()).padStart(2, '0');
        const hour = String(mtTime.getUTCHours()).padStart(2, '0');
        const minute = String(mtTime.getUTCMinutes()).padStart(2, '0');
        const second = String(mtTime.getUTCSeconds()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
      }
      
      // Use Intl when available (iOS and modern Android)
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
      call_back: 'wind,outdoor,indoor', // Request wind data + outdoor/indoor for transmission quality detection
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

    // Get available data sources for transmission quality analysis
    const windSpeedData = response.data.data.wind;
    const outdoorData = response.data.data.outdoor;
    const indoorData = response.data.data.indoor;

    // Get timestamps from wind speed data (they should be consistent across all measurements)
    const timestamps = Object.keys(windSpeedData.wind_speed.list);
    console.log(`📊 Received ${timestamps.length} data points for ${deviceName}`);

    // Transform API response to our format with transmission quality analysis
    const windDataPoints: EcowittWindDataPoint[] = timestamps
      .map(timestamp => {
        // Convert timestamp to Date object and ISO string
        const timestampMs = parseInt(timestamp) * 1000;
        const date = new Date(timestampMs);
        const timeString = date.toISOString();
        
        // Extract wind data from the response structure
        // API now returns mph since we requested wind_unit: '7'
        const windSpeedMph = parseFloat(windSpeedData.wind_speed.list[timestamp] || '0');
        const windGustMph = parseFloat(windSpeedData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
        const windDirection = parseFloat(windSpeedData.wind_direction.list[timestamp] || '0');
        
        // Convert mph to m/s for internal consistency
        const windSpeedMs = windSpeedMph / 2.237;
        const windGustMs = windGustMph / 2.237;

        // Extract temperature and humidity data if available
        const outdoorTemp = outdoorData?.temperature?.list?.[timestamp] ? 
          parseFloat(outdoorData.temperature.list[timestamp]) : undefined;
        const outdoorHumidity = outdoorData?.humidity?.list?.[timestamp] ? 
          parseFloat(outdoorData.humidity.list[timestamp]) : undefined;

        // Analyze transmission quality for this data point
        const transmissionQuality = analyzeDataPointTransmissionQuality(
          windSpeedData.wind_speed.list,
          outdoorData?.temperature?.list,
          outdoorData?.humidity?.list,
          indoorData?.temperature?.list,
          timestamp
        );
        
        return {
          time: timeString,
          timestamp: timestampMs,
          windSpeed: windSpeedMs,
          windSpeedMph,
          windGust: windGustMs,
          windGustMph,
          windDirection,
          temperature: outdoorTemp,
          humidity: outdoorHumidity,
          transmissionQuality
        };
      })
      .filter(point => {
        // Only filter out points that have NaN wind speed and are not indoor-only transmissions
        const hasValidWindData = !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0;
        const isIndoorOnlyTransmission = point.transmissionQuality && 
          !point.transmissionQuality.hasOutdoorSensors && 
          point.transmissionQuality.missingDataFields.includes('wind');
        
        // Keep the point if it has valid wind data OR if it's an indoor-only transmission (for gap detection)
        return hasValidWindData || isIndoorOnlyTransmission;
      })
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
 * Returns both wind data and transmission quality info to avoid multiple API calls
 */
export async function fetchEcowittRealTimeWindData(deviceName: string): Promise<{
  conditions: EcowittCurrentWindConditions | null;
  transmissionQuality?: { isFullTransmission: boolean; hasOutdoorSensors: boolean; missingDataFields: string[] };
}> {
  console.log(`⚡ Fetching real-time Ecowitt wind data for ${deviceName}...`);
  
  try {
    const config = await getAutoEcowittConfigForDevice(deviceName);
    
    const params = {
      application_key: config.applicationKey,
      api_key: config.apiKey,
      mac: config.macAddress,
      call_back: 'all', // Request all sensor data to analyze transmission quality in one call
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
      return { conditions: null };
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

    // Analyze transmission quality from the same API response
    const missingFields: string[] = [];
    
    // Check for wind data
    if (!windData?.wind_speed?.value) {
      missingFields.push('wind');
    }
    
    // Check for outdoor sensors
    if (!outdoorData?.temperature?.value && !outdoorData?.humidity?.value) {
      missingFields.push('outdoor');
    }
    
    const hasOutdoorSensors = !missingFields.includes('outdoor') || !missingFields.includes('wind');
    const isFullTransmission = missingFields.length === 0;
    
    const transmissionQuality = {
      isFullTransmission,
      hasOutdoorSensors,
      missingDataFields: missingFields
    };

    console.log(`✅ Retrieved real-time wind data for ${deviceName}:`, {
      windSpeed: currentConditions.windSpeedMph,
      direction: currentConditions.windDirection,
      timestamp: new Date(currentConditions.timestamp).toLocaleString(),
      transmissionStatus: isFullTransmission ? 'good' : hasOutdoorSensors ? 'partial' : 'poor'
    });

    return { conditions: currentConditions, transmissionQuality };

  } catch (error) {
    console.error(`❌ Error fetching real-time wind data for ${deviceName}:`, error);
    
    // Don't throw - allow fallback to historical data
    if (axios.isAxiosError(error)) {
      console.error('Real-time API request failed:', error.response?.data || error.message);
    }
    
    return { conditions: null };
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
        
        // Simple transmission quality fallback for legacy function
        realTimePoint.transmissionQuality = {
          isFullTransmission: false,
          hasOutdoorSensors: true,
          missingDataFields: []
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
  
  try {
    // Fetch historical data for the day
    const historicalData = await fetchEcowittWindDataForDevice(deviceName);
    
    // Fetch current real-time data (now includes transmission quality)
    const realTimeResult = await fetchEcowittRealTimeWindData(deviceName);
    const realTimeData = realTimeResult.conditions;
    const realTimeTransmissionQuality = realTimeResult.transmissionQuality;
    
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
          humidity: realTimeData.humidity,
          transmissionQuality: realTimeTransmissionQuality || {
            isFullTransmission: false,
            hasOutdoorSensors: true,
            missingDataFields: []
          }
        };
        
        combinedData.push(realTimePoint);
        console.log(`✅ Added real-time data point for ${deviceName} with transmission quality:`, {
          isFullTransmission: realTimeTransmissionQuality?.isFullTransmission,
          hasOutdoorSensors: realTimeTransmissionQuality?.hasOutdoorSensors,
          missingFields: realTimeTransmissionQuality?.missingDataFields
        });
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

/**
 * Analyze transmission quality for a single data point based on available sensor data
 * Detects antenna problems that cause only indoor data to be transmitted
 */
function analyzeDataPointTransmissionQuality(
  windData: { [timestamp: string]: string } | undefined,
  outdoorTemp: { [timestamp: string]: string } | undefined,
  outdoorHumidity: { [timestamp: string]: string } | undefined,
  indoorTemp: { [timestamp: string]: string } | undefined,
  timestamp: string
): { isFullTransmission: boolean; hasOutdoorSensors: boolean; missingDataFields: string[] } {
  const hasWind = !!(windData && windData[timestamp] && windData[timestamp] !== '-' && windData[timestamp] !== '');
  const hasOutdoorTemp = !!(outdoorTemp && outdoorTemp[timestamp] && outdoorTemp[timestamp] !== '-' && outdoorTemp[timestamp] !== '');
  const hasOutdoorHumidity = !!(outdoorHumidity && outdoorHumidity[timestamp] && outdoorHumidity[timestamp] !== '-' && outdoorHumidity[timestamp] !== '');
  const hasIndoor = !!(indoorTemp && indoorTemp[timestamp] && indoorTemp[timestamp] !== '-' && indoorTemp[timestamp] !== '');
  
  const missingFields: string[] = [];
  
  if (!hasWind) missingFields.push('wind');
  
  // Only check for outdoor sensors if the API response included outdoor data sections
  // If outdoor data sections are not present in the API response, assume they weren't requested
  // and don't mark them as missing (this is normal when only wind data is fetched)
  if (outdoorTemp !== undefined && !hasOutdoorTemp) missingFields.push('outdoor_temperature');
  if (outdoorHumidity !== undefined && !hasOutdoorHumidity) missingFields.push('outdoor_humidity');
  
  // Full transmission: has wind data and (if outdoor data was requested) outdoor sensors are working
  // If outdoor data wasn't included in API response, just having wind data means full transmission
  const isFullTransmission = hasWind && 
    (outdoorTemp === undefined || hasOutdoorTemp) && 
    (outdoorHumidity === undefined || hasOutdoorHumidity);
  
  // Has outdoor sensors: at least outdoor temp or humidity (only relevant if outdoor data was requested)
  const hasOutdoorSensors = outdoorTemp !== undefined || outdoorHumidity !== undefined ? 
    (hasOutdoorTemp || hasOutdoorHumidity) : true; // If no outdoor data requested, assume sensors are working
  
  return {
    isFullTransmission,
    hasOutdoorSensors,
    missingDataFields: missingFields
  };
}

/**
 * Analyze transmission gaps and quality issues over a time period
 */
export function analyzeOverallTransmissionQuality(windDataPoints: EcowittWindDataPoint[]): TransmissionQualityInfo {
  if (windDataPoints.length === 0) {
    return {
      isFullTransmission: false,
      hasOutdoorSensors: false,
      hasWindData: false,
      hasCompleteSensorData: false,
      transmissionGaps: [],
      lastGoodTransmissionTime: null,
      currentTransmissionStatus: 'offline'
    };
  }

  let lastGoodTransmissionTime: string | null = null;
  const transmissionGaps: TransmissionGap[] = [];
  let currentGap: TransmissionGap | null = null;
  const MIN_GAP_DURATION_MINUTES = 15; // Report gaps of 15+ minutes
  
  console.log(`🔍 Analyzing ${windDataPoints.length} data points for transmission gaps (min duration: ${MIN_GAP_DURATION_MINUTES} min)...`);
  
  // Analyze each data point for transmission quality
  for (let i = 0; i < windDataPoints.length; i++) {
    const point = windDataPoints[i];
    const quality = point.transmissionQuality;
    
    // Check for temporal gaps (missing data periods)
    if (i > 0) {
      const prevPoint = windDataPoints[i - 1];
      const timeDiff = (new Date(point.time).getTime() - new Date(prevPoint.time).getTime()) / 60000; // minutes
      
      // If there's a gap of 10+ minutes between data points, consider it a temporal gap
      if (timeDiff > 10 && timeDiff >= MIN_GAP_DURATION_MINUTES) {
        transmissionGaps.push({
          startTime: prevPoint.time,
          endTime: point.time,
          durationMinutes: Math.round(timeDiff),
          type: 'temporal',
          affectedSensors: ['all']
        });
      }
    }
    
    if (quality?.isFullTransmission) {
      lastGoodTransmissionTime = point.time;
      
      // End current gap if we had one and it meets minimum duration
      if (currentGap) {
        currentGap.endTime = point.time;
        currentGap.durationMinutes = Math.round((new Date(point.time).getTime() - new Date(currentGap.startTime).getTime()) / 60000);
        
        // Only report gaps that meet minimum duration threshold
        if (currentGap.durationMinutes >= MIN_GAP_DURATION_MINUTES) {
          transmissionGaps.push(currentGap);
        }
        currentGap = null;
      }
    } else {
      // Start a new gap or continue existing one
      if (!currentGap) {
        const gapType = quality?.hasOutdoorSensors ? 'partial' : 
                       quality?.missingDataFields.includes('wind') && 
                       quality?.missingDataFields.includes('outdoor_temperature') ? 'indoor-only' : 'offline';
        
        currentGap = {
          startTime: point.time,
          endTime: point.time, // Will be updated
          durationMinutes: 0,
          type: gapType,
          affectedSensors: quality?.missingDataFields || ['all']
        };
      } else {
        // Update gap type if it changes (e.g., from partial to indoor-only)
        const currentGapType = quality?.hasOutdoorSensors ? 'partial' : 
                              quality?.missingDataFields.includes('wind') && 
                              quality?.missingDataFields.includes('outdoor_temperature') ? 'indoor-only' : 'offline';
        
        // If gap type changes significantly, end current gap and start new one
        if ((currentGap.type === 'partial' && currentGapType === 'indoor-only') ||
            (currentGap.type === 'indoor-only' && currentGapType === 'offline') ||
            (currentGap.type === 'partial' && currentGapType === 'offline')) {
          
          // End current gap if it meets minimum duration
          currentGap.endTime = point.time;
          currentGap.durationMinutes = Math.round((new Date(point.time).getTime() - new Date(currentGap.startTime).getTime()) / 60000);
          
          if (currentGap.durationMinutes >= MIN_GAP_DURATION_MINUTES) {
            transmissionGaps.push(currentGap);
          }
          
          // Start new gap
          currentGap = {
            startTime: point.time,
            endTime: point.time,
            durationMinutes: 0,
            type: currentGapType,
            affectedSensors: quality?.missingDataFields || ['all']
          };
        }
      }
    }
  }
  
  // Close any remaining gap
  if (currentGap) {
    const lastPoint = windDataPoints[windDataPoints.length - 1];
    currentGap.endTime = lastPoint.time;
    currentGap.durationMinutes = Math.round((new Date(lastPoint.time).getTime() - new Date(currentGap.startTime).getTime()) / 60000);
    
    // Only add if it meets minimum duration threshold
    if (currentGap.durationMinutes >= MIN_GAP_DURATION_MINUTES) {
      transmissionGaps.push(currentGap);
    }
  }

  // Log detected gaps
  console.log(`📊 Gap detection complete: ${transmissionGaps.length} gaps found (≥${MIN_GAP_DURATION_MINUTES} min)`);
  transmissionGaps.forEach((gap, index) => {
    console.log(`  Gap ${index + 1}: ${gap.type} (${gap.durationMinutes} min) from ${new Date(gap.startTime).toLocaleTimeString()} to ${new Date(gap.endTime).toLocaleTimeString()}`);
  });

  // Determine current status based on the latest data point
  const latestPoint = windDataPoints[windDataPoints.length - 1];
  const latestQuality = latestPoint.transmissionQuality;
  
  let currentStatus: 'good' | 'partial' | 'indoor-only' | 'offline' = 'offline';
  if (latestQuality?.isFullTransmission) {
    currentStatus = 'good';
  } else if (latestQuality?.hasOutdoorSensors) {
    currentStatus = 'partial';
  } else if (latestQuality && latestQuality.missingDataFields.includes('outdoor') && latestQuality.missingDataFields.includes('wind') && !latestQuality.missingDataFields.includes('indoor')) {
    // Indoor data only - no outdoor or wind data
    currentStatus = 'indoor-only';
  }

  console.log('📊 Current transmission status analysis:', {
    hasLatestQuality: !!latestQuality,
    isFullTransmission: latestQuality?.isFullTransmission,
    hasOutdoorSensors: latestQuality?.hasOutdoorSensors,
    missingFields: latestQuality?.missingDataFields,
    determinedStatus: currentStatus
  });

  const hasWindData = windDataPoints.some(p => p.transmissionQuality?.missingDataFields && !p.transmissionQuality.missingDataFields.includes('wind')) || false;
  const hasOutdoorSensors = windDataPoints.some(p => p.transmissionQuality?.hasOutdoorSensors === true) || false;
  const isFullTransmission = windDataPoints.some(p => p.transmissionQuality?.isFullTransmission === true) || false;
  
  return {
    isFullTransmission,
    hasOutdoorSensors,
    hasWindData,
    hasCompleteSensorData: isFullTransmission,
    transmissionGaps,
    lastGoodTransmissionTime,
    currentTransmissionStatus: currentStatus
  };
}

// Helper function to determine if a date is during daylight saving time
// DST in US Mountain Time: Second Sunday in March to First Sunday in November
function isDaylightSavingTime(date: Date): boolean {
  const year = date.getFullYear();
  
  // Second Sunday in March
  const march = new Date(year, 2, 1); // March 1st
  const dstStart = new Date(year, 2, 14 - march.getDay()); // Second Sunday
  
  // First Sunday in November  
  const november = new Date(year, 10, 1); // November 1st
  const dstEnd = new Date(year, 10, 7 - november.getDay()); // First Sunday
  
  return date >= dstStart && date < dstEnd;
}