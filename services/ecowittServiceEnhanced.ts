/**
 * Enhanced Ecowitt API Service with Pagination and Smart Caching
 * Fixes:
 * 1. Pagination handling to get ALL data points
 * 2. Optimized time windows (dawn patrol hours only)
 * 3. Intelligent caching to avoid repeated full-day requests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';
import type { EcowittWindDataPoint, EcowittHistoricResponse, EcowittApiConfig } from './ecowittService';

// Enhanced interface to handle pagination
interface EcowittPaginatedResponse extends EcowittHistoricResponse {
  data: EcowittHistoricResponse['data'] & {
    pageNum?: number;
    totalPage?: number;
    total?: number;
  };
}

/**
 * Fetch ALL historic wind data with pagination support
 */
export async function fetchAllEcowittWindDataWithPagination(
  config: EcowittApiConfig,
  startDate: Date,
  endDate: Date,
  deviceName: string = 'unknown'
): Promise<EcowittWindDataPoint[]> {
  console.log(`🔄 Fetching paginated Ecowitt data for ${deviceName}...`);
  
  const BASE_URL = 'https://api.ecowitt.net/api/v3';
  const allDataPoints: EcowittWindDataPoint[] = [];
  let currentPage = 1;
  let totalPages = 1;
  
  // Format dates for API
  const formatEcowittDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  try {
    // Loop through all pages
    while (currentPage <= totalPages) {
      console.log(`📄 Fetching page ${currentPage}/${totalPages} for ${deviceName}`);
      
      const params = {
        application_key: config.applicationKey,
        api_key: config.apiKey,
        mac: config.macAddress,
        start_date: formatEcowittDate(startDate),
        end_date: formatEcowittDate(endDate),
        cycle_type: '5min',
        call_back: 'wind',
        page: currentPage.toString(), // Add pagination parameter
        pageSize: '200' // Request larger page size if API supports it
      };

      const response = await axios.get<EcowittPaginatedResponse>(`${BASE_URL}/device/history`, {
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
        throw new Error(`Ecowitt API error on page ${currentPage}: ${response.data.msg}`);
      }

      // Update pagination info from first response
      if (currentPage === 1) {
        totalPages = response.data.data?.totalPage || 1;
        const totalRecords = response.data.data?.total || 0;
        console.log(`📊 Found ${totalRecords} total records across ${totalPages} pages for ${deviceName}`);
      }

      // Process this page's data
      if (response.data.data?.wind) {
        const windData = response.data.data.wind;
        
        if (windData.wind_speed?.list) {
          const timestamps = Object.keys(windData.wind_speed.list);
          console.log(`📄 Page ${currentPage}: ${timestamps.length} data points`);
          
          const pageDataPoints: EcowittWindDataPoint[] = timestamps
            .map(timestamp => {
              const timestampMs = parseInt(timestamp) * 1000;
              const date = new Date(timestampMs);
              const timeString = date.toISOString();
              
              const windSpeedMph = parseFloat(windData.wind_speed.list[timestamp] || '0');
              const windGustMph = parseFloat(windData.wind_gust?.list?.[timestamp] || windSpeedMph.toString());
              const windDirection = parseFloat(windData.wind_direction?.list?.[timestamp] || '0');
              
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
            .filter(point => !isNaN(point.windSpeedMph) && point.windSpeedMph >= 0);
          
          allDataPoints.push(...pageDataPoints);
        }
      }

      currentPage++;
      
      // Safety break to prevent infinite loops
      if (currentPage > 20) {
        console.warn(`⚠️ Stopping pagination after 20 pages for safety`);
        break;
      }
    }

    // Sort all data by timestamp
    allDataPoints.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`✅ Successfully fetched ${allDataPoints.length} total data points across ${currentPage - 1} pages for ${deviceName}`);
    
    return allDataPoints;
    
  } catch (error) {
    console.error(`❌ Error fetching paginated data for ${deviceName}:`, error);
    throw error;
  }
}

/**
 * Smart fetch for dawn patrol hours only (3am-5pm) with caching
 */
export async function fetchDawnPatrolWindData(
  config: EcowittApiConfig,
  deviceName: string = 'unknown'
): Promise<EcowittWindDataPoint[]> {
  const today = new Date();
  const cacheKey = `dawn_patrol_${deviceName}_${today.toDateString()}`;
  
  try {
    // Check cache first
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const cacheAge = Date.now() - parsed.timestamp;
      
      // Use cache if less than 30 minutes old
      if (cacheAge < 30 * 60 * 1000) {
        console.log(`📱 Using cached dawn patrol data for ${deviceName} (${Math.floor(cacheAge / 60000)}min old)`);
        return parsed.data;
      }
    }
    
    // Define dawn patrol window (3am-6pm for safety)
    const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 3, 0, 0);
    const endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
    
    console.log(`🌅 Fetching dawn patrol data (${startTime.toLocaleTimeString()}-${endTime.toLocaleTimeString()}) for ${deviceName}`);
    
    // Fetch with pagination
    const allData = await fetchAllEcowittWindDataWithPagination(config, startTime, endTime, deviceName);
    
    // Filter to dawn patrol hours (extra safety)
    const dawnPatrolData = allData.filter(point => {
      const pointTime = new Date(point.time);
      const hour = pointTime.getHours();
      return hour >= 3 && hour <= 17;
    });
    
    // Cache the result
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      data: dawnPatrolData,
      timestamp: Date.now()
    }));
    
    console.log(`✅ Fetched and cached ${dawnPatrolData.length} dawn patrol data points for ${deviceName}`);
    
    return dawnPatrolData;
    
  } catch (error) {
    console.error(`❌ Error fetching dawn patrol data for ${deviceName}:`, error);
    
    // Try to return cached data even if stale
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log(`🔄 Returning stale cached data for ${deviceName} due to API error`);
        return parsed.data;
      }
    } catch (cacheError) {
      console.error('Failed to read cache:', cacheError);
    }
    
    throw error;
  }
}

/**
 * Force refresh dawn patrol data (bypass cache)
 */
export async function refreshDawnPatrolWindData(
  config: EcowittApiConfig,
  deviceName: string = 'unknown'
): Promise<EcowittWindDataPoint[]> {
  const today = new Date();
  const cacheKey = `dawn_patrol_${deviceName}_${today.toDateString()}`;
  
  // Clear cache
  await AsyncStorage.removeItem(cacheKey);
  
  // Fetch fresh data
  return fetchDawnPatrolWindData(config, deviceName);
}

/**
 * Fetch enhanced wind data for specific device using pagination
 */
export async function fetchEcowittEnhancedWindDataForDevice(deviceName: string): Promise<EcowittWindDataPoint[]> {
  console.log(`🌬️ Fetching enhanced paginated wind data for ${deviceName}...`);
  
  // Import the function we need from the main service
  const ecowittService = require('./ecowittService');
  const config = await ecowittService.getAutoEcowittConfigForDevice(deviceName);
  
  return fetchDawnPatrolWindData(config, deviceName);
}
