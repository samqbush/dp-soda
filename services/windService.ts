import AsyncStorage from '@react-native-async-storage/async-storage';

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
  directionCoverage?: number; // Optional: percentage of data points with valid direction readings
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
 * Analyzes wind data for alarm worthiness
 * Focuses on the 3am-5am window for alarm decisions
 */
export const analyzeWindData = (
  data: WindDataPoint[], 
  criteria: AlarmCriteria = DEFAULT_CRITERIA,
  _targetTime?: Date,
  skipTimeFilter: boolean = false
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

  let alarmWindowData: WindDataPoint[];

  if (skipTimeFilter) {
    // Data is already filtered by the caller (e.g., verifyWindConditions)
    alarmWindowData = data;
  } else {
    // Filter data for the alarm window (3am-5am)
    alarmWindowData = data.filter(point => {
      const pointTime = new Date(point.time);
      const hour = pointTime.getHours();
      return hour >= 3 && hour < 5;
    });
  }

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

  if (__DEV__) console.log(`Counting consecutive good points with minimum speed: ${criteria.minimumAverageSpeed}mph`);
  if (__DEV__) console.log(`Data points to analyze: ${data.length}`);
  
  for (const point of data) {
    // Handle both string and number types for windSpeed
    const speed = typeof point.windSpeed === 'string'
      ? parseFloat(point.windSpeed)
      : point.windSpeed;
    const isGoodPoint = !isNaN(speed) && speed >= criteria.minimumAverageSpeed;
    const pointTime = new Date(point.time);

    if (__DEV__) console.log(`Point at ${pointTime.toISOString()} - Speed: ${speed}mph, IsGood: ${isGoodPoint}`);
    
    if (isGoodPoint) {
      currentConsecutive++;
      if (__DEV__) console.log(`  ✓ Good point - current streak: ${currentConsecutive}`);
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else {
      if (__DEV__) console.log(`  ✗ Not a good point - resetting streak`);
      currentConsecutive = 0;
    }
  }

  if (__DEV__) console.log(`Maximum consecutive good points found: ${maxConsecutive}`);
  return maxConsecutive;
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

  // Calculate direction coverage (percentage of data points with valid direction readings)
  const directions = recentData
    .map(point => {
      const dir = typeof point.windDirection === 'string' 
        ? parseFloat(point.windDirection) 
        : point.windDirection;
      return isNaN(dir) ? NaN : dir;
    })
    .filter(dir => !isNaN(dir));

  const totalDataPoints = recentData.length;
  const validDirectionCount = directions.length;
  const directionCoverage = totalDataPoints > 0 ? (validDirectionCount / totalDataPoints) * 100 : 0;
  
  // Calculate direction consistency for the valid directions
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
    `Direction Coverage: ${directionCoverage.toFixed(1)}%, ` +
    `Consecutive Good Points: ${consecutiveGoodPoints}`;

  return {
    isAlarmWorthy: isCurrentlyFavorable, // Renamed for clarity - this indicates if current conditions are favorable
    averageSpeed,
    directionConsistency,
    directionCoverage,
    consecutiveGoodPoints,
    analysis
  };
};
