import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// WindAlert API constants
const BASE_URL = 'https://windalert.com';
const SPOT_ID = '149264'; // Bear Creek Lake (Soda Lake Dam 1)

export interface WindDataPoint {
  time: string;
  windSpeed: string;
  windGust: string;
  windDirection: string;
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
  speedDeviationThreshold: number; // mph
  directionDeviationThreshold: number; // degrees
}

const DEFAULT_CRITERIA: AlarmCriteria = {
  minimumAverageSpeed: 10,
  directionConsistencyThreshold: 70,
  minimumConsecutivePoints: 4,
  speedDeviationThreshold: 3,
  directionDeviationThreshold: 45
};

/**
 * Fetches wind data directly from WindAlert API
 * This uses the same endpoint that the website calls internally
 */
export const fetchWindData = async (): Promise<WindDataPoint[]> => {
  try {
    // Try to replicate the exact API call from the original script
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

    const headers = {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Referer': `${BASE_URL}/spot/${SPOT_ID}`,
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'X-Requested-With': 'XMLHttpRequest'
    };

    // Use the API endpoint as seen in the original script
    const apiUrl = 'https://api.weatherflow.com/wxengine/rest/graph/getGraph';
    const response = await axios.get(apiUrl, {
      params,
      headers,
      timeout: 10000 // 10 second timeout
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
    
    // Cache the data for offline access
    await cacheWindData(processedData);
    
    return processedData;
  } catch (error) {
    console.error('Error fetching wind data:', error);
    
    // Try to return cached data if available
    const cachedData = await getCachedWindData();
    if (cachedData) {
      console.log('Returning cached wind data due to fetch error');
      return cachedData;
    }
    
    throw error;
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

  const alarmWindowData = data.filter(point => {
    const pointTime = new Date(point.time);
    return pointTime >= alarmStart && pointTime <= alarmEnd;
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
    .map(point => parseFloat(point.windSpeed))
    .filter(speed => !isNaN(speed));
  
  const averageSpeed = speeds.length > 0 
    ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length 
    : 0;

  // Calculate direction consistency
  const directions = alarmWindowData
    .map(point => {
      if (typeof point.windDirection === 'string') {
        return parseFloat(point.windDirection);
      }
      return NaN;
    })
    .filter(dir => !isNaN(dir));

  const directionConsistency = calculateDirectionConsistency(directions);

  // Count consecutive good data points
  const consecutiveGoodPoints = countConsecutiveGoodPoints(
    alarmWindowData, 
    criteria
  );

  // Determine if alarm worthy
  const isAlarmWorthy = 
    averageSpeed >= criteria.minimumAverageSpeed &&
    directionConsistency >= criteria.directionConsistencyThreshold &&
    consecutiveGoodPoints >= criteria.minimumConsecutivePoints;

  const analysis = `Avg Speed: ${averageSpeed.toFixed(1)}mph, ` +
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
 * Counts consecutive data points that meet the criteria
 */
const countConsecutiveGoodPoints = (
  data: WindDataPoint[], 
  criteria: AlarmCriteria
): number => {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  for (const point of data) {
    const speed = parseFloat(point.windSpeed);
    const isGoodPoint = !isNaN(speed) && speed >= criteria.minimumAverageSpeed;

    if (isGoodPoint) {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      currentConsecutive = 0;
    }
  }

  return maxConsecutive;
};

/**
 * Cache wind data for offline access
 */
const cacheWindData = async (data: WindDataPoint[]): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: new Date().toISOString()
    };
    await AsyncStorage.setItem('windData', JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error caching wind data:', error);
  }
};

/**
 * Get cached wind data
 */
export const getCachedWindData = async (): Promise<WindDataPoint[] | null> => {
  try {
    const cached = await AsyncStorage.getItem('windData');
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    const cacheAge = Date.now() - new Date(cacheData.timestamp).getTime();
    
    // Return cached data if less than 2 hours old
    if (cacheAge < 2 * 60 * 60 * 1000) {
      return cacheData.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving cached wind data:', error);
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

  const verifyWindowData = data.filter(point => {
    const pointTime = new Date(point.time);
    return pointTime >= verifyStart && pointTime <= verifyEnd;
  });

  return analyzeWindData(verifyWindowData, criteria);
};
