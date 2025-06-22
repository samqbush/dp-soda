import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

// WindAlert API constants
const BASE_URL = 'https://windalert.com';
const SPOT_ID = '149264'; // (Soda Lake Dam 1)

export interface WindDataPoint {
  time: string;
  timestamp?: string | number; // Optional timestamp field for compatibility
  windSpeed: string | number; // Allow either string or number
  windSpeedMph?: number;      // Optional convenience field for mph value
  windGust: string | number;  // Allow either string or number
  windDirection: string | number; // Allow either string or number
}

export interface WindAnalysis {
  isAlarmWorthy: boolean;
  averageSpeed: number;
  directionConsistency: number;
  consecutiveGoodPoints: number;
  analysis: string;
}

export interface AlarmCriteria {
  minimumAverageSpeed: number; // mph
  directionConsistencyThreshold: number; // percentage
  minimumConsecutivePoints: number;
  directionDeviationThreshold: number; // degrees
  preferredDirection: number; // degrees - the preferred wind direction
  preferredDirectionRange: number; // degrees - the acceptable range around preferred direction
  useWindDirection: boolean; // Whether to include wind direction in alarm calculations
  alarmEnabled: boolean; // Whether or not the alarm is enabled
  alarmTime: string; // Time in 24-hour format (e.g., "05:00")
  // Last check information for user visibility
  lastCheckTime?: string | null; // ISO string
  lastCheckResult?: 'triggered' | 'conditions-not-met' | 'error' | null;
  lastCheckWindSpeed?: number | null;
}

// Simplified criteria for the new DP Alarm system
export interface SimplifiedAlarmCriteria {
  minimumAverageSpeed: number;
  alarmEnabled: boolean;
  alarmTime: string;
}

const DEFAULT_CRITERIA: AlarmCriteria = {
  minimumAverageSpeed: 15,
  directionConsistencyThreshold: 70,
  minimumConsecutivePoints: 4,
  directionDeviationThreshold: 45,
  preferredDirection: 315, // Northwest
  preferredDirectionRange: 45, // +/- 45 degrees from preferred direction
  useWindDirection: true, // By default, use wind direction in calculations
  alarmEnabled: false,
  alarmTime: "05:00" // Default to 5:00 AM
};

/**
 * Fetches wind data directly from WindAlert API
 * This uses the same endpoint that the website calls internally
 */
export const fetchWindData = async (): Promise<WindDataPoint[]> => {
  try {
    console.log('🌊 Starting wind data fetch...');
    
    // Check if we're in a web environment (CORS issues expected)
    // Use React Native Platform detection as primary method
    const isWeb = Platform.OS === 'web' || (
      typeof window !== 'undefined' && 
      typeof window.location !== 'undefined' && 
      typeof document !== 'undefined' &&
      window.location.href &&
      window.location.href.startsWith('http')
    );
    
    console.log(`📱 Platform detected: ${Platform.OS}, isWeb: ${isWeb}`);
    
    // Try real API call for both web and mobile environments
    console.log('🌐 Attempting real API call...');
    const now = Date.now();
    const params = {
      callback: `jQuery17206585233276552562_${now}`,
      units_wind: 'kph',
      units_temp: 'c',
      units_distance: 'km',
      units_precip: 'mm',
      fields: 'wind',
      format: 'json',
      null_ob_min_from_now: 30,
      show_virtual_obs: 'true',
      spot_id: SPOT_ID,
      time_start_offset_hours: -25,
      time_end_offset_hours: 0,
      type: 'dataonly',
      model_ids: -101,
      wf_token: 'f546a4d1e7115896684766407a63e45c',
      _: now
    };

    console.log('📡 Making API request with params:', { spot_id: SPOT_ID });

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': `${BASE_URL}/spot/${SPOT_ID}`,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Use the API endpoint as seen in the working script
    const apiUrl = 'https://api.weatherflow.com/wxengine/rest/graph/getGraph';
    
    try {
      const response = await axios.get(apiUrl, {
        params,
        headers,
        timeout: 15000 // 15 second timeout
      });

      console.log('✅ API response received:', {
        status: response.status,
        hasData: !!response.data,
        dataType: typeof response.data
      });
      
      // The API returns JSONP, so we need to extract the JSON
      const text = response.data;
      const match = text.match(/^[^(]+\((.*)\)$/s);
      
      if (!match) {
        throw new Error('Failed to parse JSONP response');
      }
      
      const json = JSON.parse(match[1]);
      
      // Process data similar to the original script
      const processedData = processWindData(json);
      
      console.log('📊 Processed wind data:', {
        totalPoints: processedData.length,
        firstPoint: processedData[0],
        lastPoint: processedData[processedData.length - 1]
      });
      
      // Cache the data for offline access
      await cacheWindData(processedData);
      
      return processedData;
      
    } catch (apiError) {
      console.warn(`⚠️ API call failed (${isWeb ? 'web' : 'mobile'} environment):`, apiError);
      
      // For web environment, CORS is expected - try cache first
      if (isWeb) {
        console.log('🌐 Web environment - trying cached data due to expected CORS issues');
        const cachedData = await getCachedWindData();
        if (cachedData && cachedData.length > 0) {
          console.log('💾 Using cached wind data in web environment');
          return cachedData;
        }
        console.warn('❌ No cached data available in web environment');
      }
      
      // Re-throw the error to be handled by outer catch block
      throw apiError;
    }
  } catch (error: any) {
    console.error('❌ Error fetching wind data:', error);
    
    // Try to return cached data if available
    const cachedData = await getCachedWindData();
    if (cachedData && cachedData.length > 0) {
      console.log('💾 Returning cached wind data due to fetch error');
      return cachedData;
    }
    
    // NO SAMPLE DATA FALLBACK - Force user to fix connection or get real data
    console.error('🚫 NO SAMPLE DATA FALLBACK - Real data required');
    console.error('❌ Cannot fetch wind data and no cached data available');
    console.error('💡 Check internet connection or try again later');
    
    // Return empty data set instead of fake data
    return [];
  }
};

/**
 * Processes the raw wind data response
 */
const processWindData = (graphData: any): WindDataPoint[] => {
  console.log('Processing graph data:', Object.keys(graphData));
  
  const avgArr = graphData.wind_avg_data || [];
  const gustArr = graphData.wind_gust_data || [];
  let dirArr = graphData.wind_dir_data || graphData.wind_direction_data || [];
  
  if (!dirArr.length && graphData.wind_dir_text_data) {
    dirArr = graphData.wind_dir_text_data;
  }
  
  if (!avgArr.length || !gustArr.length) {
    throw new Error('Missing wind data in response');
  }
  
  // Convert kph to mph
  const convertWindValue = (value: any): string => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '';
    const mphValue = numValue * 0.621371;
    return mphValue.toFixed(2);
  };
  
  // Create processed data array
  const now = new Date(avgArr[avgArr.length - 1][0]);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  return avgArr.map((avg: any, i: number) => {
    const timestamp = avg[0];
    return {
      time: new Date(timestamp).toISOString(),
      windSpeed: convertWindValue(avg[1]),
      windGust: gustArr[i] ? convertWindValue(gustArr[i][1]) : '',
      windDirection: dirArr[i] ? dirArr[i][1] : ''
    };
  }).filter((row: WindDataPoint) => new Date(row.time) >= twentyFourHoursAgo);
};

/**
 * Analyzes wind data for alarm worthiness
 * Focuses on the 3am-5am window for alarm decisions
 */
export const analyzeWindData = (
  data: WindDataPoint[], 
  criteria: AlarmCriteria = DEFAULT_CRITERIA,
  targetTime?: Date
): WindAnalysis => {
  if (!data.length) {
    return {
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: 'No wind data available'
    };
  }

  // Filter data for the alarm window (3am-5am)
  const now = targetTime || new Date();
  const alarmStart = new Date(now);
  alarmStart.setHours(3, 0, 0, 0);
  const alarmEnd = new Date(now);
  alarmEnd.setHours(5, 0, 0, 0);

  // Use hour-based filtering for simulated test data
  const alarmWindowData = data.filter(point => {
    const pointTime = new Date(point.time);
    // For test scenarios, we'll use hours rather than full date comparison
    const hour = pointTime.getHours();
    return hour >= 3 && hour <= 5;
  });

  if (alarmWindowData.length === 0) {
    return {
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: 'No data available for alarm window (3am-5am)'
    };
  }

  // Calculate average wind speed
  const speeds = alarmWindowData
    .map(point => {
      // Handle both string and number types for windSpeed
      return typeof point.windSpeed === 'string' 
        ? parseFloat(point.windSpeed) 
        : point.windSpeed;
    })
    .filter(speed => !isNaN(speed));
  
  const averageSpeed = speeds.length > 0 
    ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
    : 0;

  // Calculate direction consistency
  const directions = alarmWindowData
    .map(point => {
      const dir = typeof point.windDirection === 'string' 
        ? parseFloat(point.windDirection) 
        : point.windDirection;
      return isNaN(dir) ? NaN : dir;
    })
    .filter(dir => !isNaN(dir));

  const directionConsistency = calculateDirectionConsistency(directions);

  // Count consecutive good data points
  const consecutiveGoodPoints = countConsecutiveGoodPoints(
    alarmWindowData, 
    criteria
  );

  // Calculate how many directions are in the preferred range
  const avgDirection = calculateAverageDirection(directions);
  const isPreferredDirection = isDirectionInPreferredRange(
    avgDirection, 
    criteria.preferredDirection, 
    criteria.preferredDirectionRange
  );

  // Determine if alarm worthy
  const isAlarmWorthy = 
    averageSpeed >= criteria.minimumAverageSpeed &&
    directionConsistency >= criteria.directionConsistencyThreshold &&
    consecutiveGoodPoints >= criteria.minimumConsecutivePoints &&
    isPreferredDirection;

  const analysis = `Avg Speed: ${averageSpeed.toFixed(1)}mph, ` +
    `Direction: ${avgDirection.toFixed(0)}° (${getDirectionName(avgDirection)}), ` +
    `Direction Consistency: ${directionConsistency.toFixed(1)}%, ` +
    `Consecutive Good Points: ${consecutiveGoodPoints}`;

  return {
    isAlarmWorthy,
    averageSpeed,
    directionConsistency,
    consecutiveGoodPoints,
    analysis
  };
};

/**
 * Calculates direction consistency as a percentage
 */
const calculateDirectionConsistency = (directions: number[]): number => {
  if (directions.length < 2) return 0;

  // Calculate circular mean and variance for wind directions
  let sumSin = 0;
  let sumCos = 0;
  
  directions.forEach(dir => {
    const radians = (dir * Math.PI) / 180;
    sumSin += Math.sin(radians);
    sumCos += Math.cos(radians);
  });
  
  const meanSin = sumSin / directions.length;
  const meanCos = sumCos / directions.length;
  const resultantLength = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
  
  // Convert resultant length to consistency percentage
  return resultantLength * 100;
};

/**
 * Calculate the average wind direction (circular mean)
 */
const calculateAverageDirection = (directions: number[]): number => {
  if (directions.length === 0) return 0;
  
  let sumSin = 0;
  let sumCos = 0;
  
  directions.forEach(dir => {
    const radians = (dir * Math.PI) / 180;
    sumSin += Math.sin(radians);
    sumCos += Math.cos(radians);
  });
  
  // Calculate angle in radians and convert to degrees
  const radians = Math.atan2(sumSin, sumCos);
  let degrees = (radians * 180) / Math.PI;
  
  // Ensure result is in 0-360 range
  if (degrees < 0) {
    degrees += 360;
  }
  
  return degrees;
};

/**
 * Check if a direction is within the preferred range
 */
const isDirectionInPreferredRange = (
  direction: number,
  preferredDirection: number, 
  range: number
): boolean => {
  // No direction or no preferred direction means we don't check
  if (isNaN(direction) || !preferredDirection) return true;
  
  // Calculate the minimum and maximum acceptable directions
  let minDirection = (preferredDirection - range) % 360;
  let maxDirection = (preferredDirection + range) % 360;
  
  // Handle cases where range crosses 0/360 boundary
  if (minDirection < 0) minDirection += 360;
  
  // Special case for ranges that cross 0/360 boundary
  if (minDirection > maxDirection) {
    return direction >= minDirection || direction <= maxDirection;
  }
  
  // Normal case
  return direction >= minDirection && direction <= maxDirection;
};

/**
 * Get cardinal direction name from degrees
 */
const getDirectionName = (degrees: number): string => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                      'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((degrees % 360) / 22.5) % 16;
  return directions[index];
};

/**
 * Counts consecutive data points that meet the criteria
 */
const countConsecutiveGoodPoints = (
  data: WindDataPoint[], 
  criteria: AlarmCriteria
): number => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  console.log(`Counting consecutive good points with minimum speed: ${criteria.minimumAverageSpeed}mph`);
  console.log(`Data points to analyze: ${data.length}`);
  
  for (const point of data) {
    // Handle both string and number types for windSpeed
    const speed = typeof point.windSpeed === 'string'
      ? parseFloat(point.windSpeed)
      : point.windSpeed;
    const isGoodPoint = !isNaN(speed) && speed >= criteria.minimumAverageSpeed;
    const pointTime = new Date(point.time);

    console.log(`Point at ${pointTime.toISOString()} - Speed: ${speed}mph, IsGood: ${isGoodPoint}`);
    
    if (isGoodPoint) {
      currentConsecutive++;
      console.log(`  ✓ Good point - current streak: ${currentConsecutive}`);
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      console.log(`  ✗ Not a good point - resetting streak`);
      currentConsecutive = 0;
    }
  }

  console.log(`Maximum consecutive good points found: ${maxConsecutive}`);
  return maxConsecutive;
};

/**
 * Cache wind data for offline access
 */
const cacheWindData = async (data: WindDataPoint[]): Promise<void> => {
  try {
    // Basic data validation before caching
    if (!data || !Array.isArray(data)) {
      console.warn('⚠️ Invalid data format for caching, skipping cache');
      return;
    }
    
    const cacheData = {
      data,
      timestamp: new Date().toISOString()
    };
    
    console.log(`📦 Caching ${data.length} wind data points`);
    await AsyncStorage.setItem('windData', JSON.stringify(cacheData));
    console.log('✅ Wind data cached successfully');
  } catch (error) {
    console.error('❌ Error caching wind data:', error);
    // Don't throw - this is a non-critical operation
  }
};

/**
 * Get cached wind data with improved error handling
 */
export const getCachedWindData = async (): Promise<WindDataPoint[] | null> => {
  try {
    console.log('🔍 Attempting to load cached wind data');
    
    // First check if AsyncStorage is available
    if (!AsyncStorage) {
      console.error('❌ AsyncStorage is not available');
      return null;
    }
    
    const cached = await AsyncStorage.getItem('windData');
    if (!cached) {
      console.log('ℹ️ No cached wind data found');
      return null;
    }
    
    try {
      const cacheData = JSON.parse(cached);
      
      // Validate the structure of the cache data
      if (!cacheData || !cacheData.data || !Array.isArray(cacheData.data) || !cacheData.timestamp) {
        console.warn('⚠️ Invalid cached data format, ignoring cache');
        return null;
      }
      
      const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
      
      // Return cached data if less than 2 hours old
      if (cacheAge < 2 * 60 * 60 * 1000) {
        console.log(`✅ Found valid cached data (${cacheData.data.length} points)`);
        return cacheData.data;
      }
      
      console.log('⚠️ Cached data is too old, not using');
      return null;
    } catch (parseError) {
      console.error('❌ Error parsing cached data:', parseError);
      return null;
    }
  } catch (error) {
    console.error('❌ Error retrieving cached wind data:', error);
    return null;
  }
};

/**
 * Get or set alarm criteria
 */
export const getAlarmCriteria = async (): Promise<AlarmCriteria> => {
  try {
    const stored = await AsyncStorage.getItem('alarmCriteria');
    if (stored) {
      return { ...DEFAULT_CRITERIA, ...JSON.parse(stored) };
    }
    return DEFAULT_CRITERIA;
  } catch (error) {
    console.error('Error getting alarm criteria:', error);
    return DEFAULT_CRITERIA;
  }
};

export const setAlarmCriteria = async (criteria: Partial<AlarmCriteria>): Promise<void> => {
  try {
    const current = await getAlarmCriteria();
    const updated = { ...current, ...criteria };
    await AsyncStorage.setItem('alarmCriteria', JSON.stringify(updated));
  } catch (error) {
    console.error('Error setting alarm criteria:', error);
  }
};

/**
 * Verify wind conditions in the 6am-8am window
 */
export const verifyWindConditions = (
  data: WindDataPoint[],
  criteria: AlarmCriteria = DEFAULT_CRITERIA,
  targetDate?: Date
): WindAnalysis => {
  const now = targetDate || new Date();
  const verifyStart = new Date(now);
  verifyStart.setHours(6, 0, 0, 0);
  const verifyEnd = new Date(now);
  verifyEnd.setHours(8, 0, 0, 0);

  // Use hour-based filtering for simulated test data
  const verifyWindowData = data.filter(point => {
    const pointTime = new Date(point.time);
    // For test scenarios, we'll use hours rather than full date comparison
    const hour = pointTime.getHours();
    return hour >= 6 && hour <= 8;
  });

  return analyzeWindData(verifyWindowData, criteria);
};

/**
 * SAMPLE DATA GENERATION DISABLED
 * 
 * Sample data generation has been disabled to force use of real data only.
 * The app should never use fake/mock data for wind measurements.
 * 
 * If you need test data, use cached real data or fix the API connection.
 */
// const generateSampleData = (): WindDataPoint[] => {
//   console.error('🚫 Sample data generation is disabled - use real data only');
//   return [];
// };

/**
 * Manually load real wind data from a preload file for testing
 * This allows us to test with real data in web environment
 */
export const loadPreloadedData = async (): Promise<WindDataPoint[]> => {
  try {
    console.log('🔄 Loading preloaded wind data...');
    
    // Try to load from a preload file or use the real data we fetched
    const realWindData: WindDataPoint[] = [
      // This would normally be loaded from the preload file
      // For now, we'll use a subset of the real data for testing
    ];
    
    if (realWindData.length === 0) {
      console.log('📝 No preloaded data available, returning empty array');
      return [];
    }
    
    console.log(`📊 Loaded ${realWindData.length} preloaded data points`);
    await cacheWindData(realWindData);
    return realWindData;
  } catch (error) {
    console.error('❌ Error loading preloaded data:', error);
    return [];
  }
};

/**
 * Forces a fetch of real wind data, bypassing web environment detection
 * This allows testing real API calls even in web environment
 */
export const fetchRealWindData = async (): Promise<WindDataPoint[]> => {
  try {
    console.log('🌊 Force fetching REAL wind data...');
    
    // Always make real API call regardless of environment
    const now = Date.now();
    const params = {
      callback: `jQuery17206585233276552562_${now}`,
      units_wind: 'kph',
      units_temp: 'c',
      units_distance: 'km',
      units_precip: 'mm',
      fields: 'wind',
      format: 'json',
      null_ob_min_from_now: 30,
      show_virtual_obs: 'true',
      spot_id: SPOT_ID,
      time_start_offset_hours: -25,
      time_end_offset_hours: 0,
      type: 'dataonly',
      model_ids: -101,
      wf_token: 'f546a4d1e7115896684766407a63e45c',
      _: now
    };

    console.log('📡 Making FORCED API request with params:', { spot_id: SPOT_ID });

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': `${BASE_URL}/spot/${SPOT_ID}`,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Use the API endpoint as seen in the working script
    const apiUrl = 'https://api.weatherflow.com/wxengine/rest/graph/getGraph';
    const response = await axios.get(apiUrl, {
      params,
      headers,
      timeout: 15000 // 15 second timeout
    });

    console.log('✅ REAL API response received:', {
      status: response.status,
      hasData: !!response.data,
      dataType: typeof response.data
    });
    
    // The API returns JSONP, so we need to extract the JSON
    const text = response.data;
    const match = text.match(/^[^(]+\((.*)\)$/s);
    
    if (!match) {
      throw new Error('Failed to parse JSONP response');
    }
    
    const json = JSON.parse(match[1]);
    
    // Process data similar to the original script
    const processedData = processWindData(json);
    
    console.log('📊 Processed REAL wind data:', {
      totalPoints: processedData.length,
      firstPoint: processedData[0],
      lastPoint: processedData[processedData.length - 1]
    });
    
    // Cache the real data
    await cacheWindData(processedData);
    
    return processedData;
  } catch (error: any) {
    console.error('❌ Error fetching REAL wind data:', error);
    throw new Error(`Failed to fetch real wind data: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Simplified alarm checking using current Ecowitt conditions
 * This function uses real-time current conditions for immediate alarm decisions
 */
export const checkSimplifiedAlarmConditions = async (): Promise<{
  shouldTrigger: boolean;
  currentSpeed: number | null;
  averageSpeed: number | null;
  threshold: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}> => {
  try {
    // Import Ecowitt service functions
    const { fetchEcowittRealTimeWindData } = await import('./ecowittService');
    
    // Get alarm criteria
    const criteria = await getAlarmCriteria();
    const threshold = criteria.minimumAverageSpeed;
    
    // Use the DP Soda Lakes device for Dawn Patrol alarm
    const deviceName = 'DP Soda Lakes';
    
    // Fetch current real-time wind data (not historical)
    const currentResult = await fetchEcowittRealTimeWindData(deviceName);
    const currentConditions = currentResult.conditions;
    
    if (!currentConditions) {
      return {
        shouldTrigger: false,
        currentSpeed: null,
        averageSpeed: null,
        threshold,
        confidence: 'low',
        reason: 'No current wind data available from DP Soda Lakes station'
      };
    }
    
    const currentSpeed = currentConditions.windSpeedMph;
    
    if (currentSpeed === null || currentSpeed === undefined) {
      return {
        shouldTrigger: false,
        currentSpeed: null,
        averageSpeed: null,
        threshold,
        confidence: 'low',
        reason: 'Wind speed data not available from station'
      };
    }
    
    // For current conditions, we use the current speed as both current and average
    // since we're making an immediate decision based on current conditions
    const averageSpeed = currentSpeed;
    
    // Confidence is always high for real-time data if we have it
    const confidence: 'high' | 'medium' | 'low' = 'high';
    
    // Simple threshold check using current conditions
    const shouldTrigger = currentSpeed >= threshold;
    
    const reason = shouldTrigger 
      ? `Current wind speed (${currentSpeed.toFixed(1)} mph) meets your threshold (${threshold} mph) - Time to go!`
      : `Current wind speed (${currentSpeed.toFixed(1)} mph) below your threshold (${threshold} mph) - Not quite yet`;
    
    return {
      shouldTrigger,
      currentSpeed,
      averageSpeed,
      threshold,
      confidence,
      reason
    };
    
  } catch (error) {
    console.error('Error checking current alarm conditions:', error);
    return {
      shouldTrigger: false,
      currentSpeed: null,
      averageSpeed: null,
      threshold: 10,
      confidence: 'low',
      reason: `Error checking current conditions: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Analyzes recent wind data for current conditions monitoring
 * Focuses on the last hour for real-time analysis
 */
export const analyzeRecentWindData = (
  data: WindDataPoint[], 
  criteria: AlarmCriteria = DEFAULT_CRITERIA,
  targetTime?: Date
): WindAnalysis => {
  if (!data.length) {
    return {
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: 'No wind data available'
    };
  }

  // Filter data for the last hour
  const now = targetTime || new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  let recentData = data.filter(point => {
    const pointTime = new Date(point.time);
    return pointTime >= oneHourAgo;
  });

  // If no data in the last hour, fall back to the most recent data available
  let analysisTimeframe = 'last hour';
  if (recentData.length === 0) {
    // Use the last 10 data points if available, or all data if less than 10 points
    recentData = data.slice(-10);
    analysisTimeframe = `last ${recentData.length} data points`;
    
    if (recentData.length === 0) {
      return {
        isAlarmWorthy: false,
        averageSpeed: 0,
        directionConsistency: 0,
        consecutiveGoodPoints: 0,
        analysis: 'No wind data available'
      };
    }
  }

  // Calculate average wind speed
  const speeds = recentData
    .map(point => {
      // Handle both string and number types for windSpeed
      return typeof point.windSpeed === 'string' 
        ? parseFloat(point.windSpeed) 
        : point.windSpeed;
    })
    .filter(speed => !isNaN(speed));
  
  const averageSpeed = speeds.length > 0 
    ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
    : 0;

  // Calculate direction consistency
  const directions = recentData
    .map(point => {
      const dir = typeof point.windDirection === 'string' 
        ? parseFloat(point.windDirection) 
        : point.windDirection;
      return isNaN(dir) ? NaN : dir;
    })
    .filter(dir => !isNaN(dir));

  const directionConsistency = calculateDirectionConsistency(directions);

  // Count consecutive good data points
  const consecutiveGoodPoints = countConsecutiveGoodPoints(
    recentData, 
    criteria
  );

  // Calculate how many directions are in the preferred range
  const avgDirection = calculateAverageDirection(directions);
  const isPreferredDirection = isDirectionInPreferredRange(
    avgDirection, 
    criteria.preferredDirection, 
    criteria.preferredDirectionRange
  );

  // For recent data analysis, we focus on current conditions rather than alarm worthiness
  // But we can still evaluate if current conditions would meet criteria
  const meetsSpeedCriteria = averageSpeed >= criteria.minimumAverageSpeed;
  const meetsDirectionCriteria = directionConsistency >= criteria.directionConsistencyThreshold;
  const meetsConsistencyCriteria = consecutiveGoodPoints >= criteria.minimumConsecutivePoints;
  const isCurrentlyFavorable = meetsSpeedCriteria && meetsDirectionCriteria && meetsConsistencyCriteria && isPreferredDirection;

  const dataPointsCount = recentData.length;
  const timeRange = dataPointsCount > 0 ? `${dataPointsCount} data points in ${analysisTimeframe}` : 'No recent data';
  
  const analysis = `Recent Conditions (${timeRange}): ` +
    `Avg Speed: ${averageSpeed.toFixed(1)}mph, ` +
    `Direction: ${avgDirection.toFixed(0)}° (${getDirectionName(avgDirection)}), ` +
    `Direction Consistency: ${directionConsistency.toFixed(1)}%, ` +
    `Consecutive Good Points: ${consecutiveGoodPoints}`;

  return {
    isAlarmWorthy: isCurrentlyFavorable, // Renamed for clarity - this indicates if current conditions are favorable
    averageSpeed,
    directionConsistency,
    consecutiveGoodPoints,
    analysis
  };
};
