import { useCallback, useEffect, useState } from 'react';
import { useStandleyLakeWind } from './useStandleyLakeWind';
import { getAlarmCriteria, setAlarmCriteria } from '@/services/windService';

export interface SimplifiedAlarmCriteria {
  minimumAverageSpeed: number;
  alarmEnabled: boolean;
  alarmTime: string;
}

export interface DPAlarmStatus {
  shouldWakeUp: boolean;
  currentSpeed: number | null;
  averageSpeed: number | null;
  threshold: number;
  lastUpdated: Date | null;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface UseDPAlarmReturn {
  // Alarm status
  alarmStatus: DPAlarmStatus;
  
  // Settings
  criteria: SimplifiedAlarmCriteria;
  setCriteria: (criteria: Partial<SimplifiedAlarmCriteria>) => Promise<void>;
  
  // Data state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  testAlarm: () => Promise<{ triggered: boolean; reason: string }>;
}

const DEFAULT_SIMPLIFIED_CRITERIA: SimplifiedAlarmCriteria = {
  minimumAverageSpeed: 10,
  alarmEnabled: false,
  alarmTime: "05:00"
};

/**
 * Simplified DP Alarm hook that uses Ecowitt data for basic wind speed checking
 */
export const useDPAlarm = (): UseDPAlarmReturn => {
  console.log('⏰ useDPAlarm hook initializing...');
  
  const [criteria, setCriteriaState] = useState<SimplifiedAlarmCriteria>(DEFAULT_SIMPLIFIED_CRITERIA);
  const [error, setError] = useState<string | null>(null);
  
  // Use Standley Lake wind data (Ecowitt source)
  const {
    windData,
    analysis,
    isLoading,
    error: windError,
    lastUpdated,
    refreshData: refreshWindData
  } = useStandleyLakeWind();

  // Load stored criteria on mount
  useEffect(() => {
    const loadCriteria = async () => {
      try {
        const stored = await getAlarmCriteria();
        setCriteriaState({
          minimumAverageSpeed: stored.minimumAverageSpeed,
          alarmEnabled: stored.alarmEnabled,
          alarmTime: stored.alarmTime,
        });
      } catch (err) {
        console.error('Failed to load alarm criteria:', err);
        setError('Failed to load alarm settings');
      }
    };
    
    loadCriteria();
  }, []);

  /**
   * Calculate alarm status based on current wind conditions
   */
  const calculateAlarmStatus = useCallback((): DPAlarmStatus => {
    // Default status
    const defaultStatus: DPAlarmStatus = {
      shouldWakeUp: false,
      currentSpeed: null,
      averageSpeed: null,
      threshold: criteria.minimumAverageSpeed,
      lastUpdated,
      confidence: 'low',
      reason: 'No data available'
    };

    // Check if we have wind data
    if (!windData || windData.length === 0) {
      return {
        ...defaultStatus,
        reason: 'No wind data available'
      };
    }

    // Get current wind speed (most recent reading)
    const currentSpeed = windData[windData.length - 1]?.windSpeedMph || null;
    
    // Calculate average speed over recent readings (last 6 hours or available data)
    const recentData = windData.slice(-36); // Assuming 10-min intervals, 6 hours = 36 points
    const averageSpeed = recentData.length > 0 
      ? recentData.reduce((sum, point) => sum + point.windSpeedMph, 0) / recentData.length 
      : null;

    // Determine confidence based on data availability
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (recentData.length >= 12) { // 2+ hours of data
      confidence = 'high';
    } else if (recentData.length >= 6) { // 1+ hour of data
      confidence = 'medium';
    }

    // Simple alarm logic: average speed must meet threshold
    const shouldWakeUp = averageSpeed !== null && averageSpeed >= criteria.minimumAverageSpeed;
    
    // Generate reason text
    let reason = '';
    if (averageSpeed === null) {
      reason = 'Insufficient wind data for analysis';
    } else if (shouldWakeUp) {
      reason = `Average wind speed (${averageSpeed.toFixed(1)} mph) meets threshold (${criteria.minimumAverageSpeed} mph)`;
    } else {
      reason = `Average wind speed (${averageSpeed.toFixed(1)} mph) below threshold (${criteria.minimumAverageSpeed} mph)`;
    }

    return {
      shouldWakeUp,
      currentSpeed,
      averageSpeed,
      threshold: criteria.minimumAverageSpeed,
      lastUpdated,
      confidence,
      reason
    };
  }, [windData, criteria.minimumAverageSpeed, lastUpdated]);

  // Calculate current alarm status
  const alarmStatus = calculateAlarmStatus();

  /**
   * Update alarm criteria and persist to storage
   */
  const setCriteria = useCallback(async (newCriteria: Partial<SimplifiedAlarmCriteria>) => {
    try {
      const updated = { ...criteria, ...newCriteria };
      setCriteriaState(updated);
      
      // Convert to full criteria format for storage compatibility
      await setAlarmCriteria({
        minimumAverageSpeed: updated.minimumAverageSpeed,
        alarmEnabled: updated.alarmEnabled,
        alarmTime: updated.alarmTime,
      });
      
      console.log('✅ Alarm criteria updated:', updated);
    } catch (err) {
      console.error('❌ Failed to update alarm criteria:', err);
      setError('Failed to save alarm settings');
      throw err;
    }
  }, [criteria]);

  /**
   * Refresh wind data
   */
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await refreshWindData();
    } catch (err) {
      console.error('❌ Failed to refresh wind data:', err);
      setError('Failed to refresh wind data');
    }
  }, [refreshWindData]);

  /**
   * Test alarm with current conditions
   */
  const testAlarm = useCallback(async (): Promise<{ triggered: boolean; reason: string }> => {
    const status = calculateAlarmStatus();
    return {
      triggered: status.shouldWakeUp,
      reason: status.reason
    };
  }, [calculateAlarmStatus]);

  // Combine wind error with local error
  const combinedError = error || windError;

  return {
    alarmStatus,
    criteria,
    setCriteria,
    isLoading,
    error: combinedError,
    refreshData,
    testAlarm,
  };
};
