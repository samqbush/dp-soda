import { useCallback, useEffect, useState } from 'react';
import { useSodaLakeWind } from './useSodaLakeWind';
import { getAlarmCriteria, setAlarmCriteria } from '@/services/windService';
import { unifiedAlarmManager } from '@/services/unifiedAlarmManager';

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
  
  // Use Soda Lake wind data (Ecowitt source) - matches actual alarm system
  const {
    windData,
    analysis,
    isLoading,
    error: windError,
    lastUpdated,
    refreshData: refreshWindData
  } = useSodaLakeWind();

  // Subscribe to unified alarm manager and load initial state from it
  useEffect(() => {
    let isSubscribed = true;

    const initializeFromUnifiedManager = async () => {
      try {
        console.log('📱 useDPAlarm initializing from unified alarm manager...');
        
        // Wait a brief moment to ensure unified alarm manager has initialized
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get current state from unified alarm manager (which loads from storage)
        const alarmState = unifiedAlarmManager.getState();
        console.log('📱 useDPAlarm got unified alarm manager state:', alarmState);
        
        // Load minimum speed from storage (this is not in unified alarm manager yet)
        const stored = await getAlarmCriteria();
        
        if (isSubscribed) {
          setCriteriaState({
            minimumAverageSpeed: stored.minimumAverageSpeed,
            alarmEnabled: alarmState.isEnabled,
            alarmTime: alarmState.alarmTime,
          });
          console.log('📱 useDPAlarm initial state set:', {
            minimumAverageSpeed: stored.minimumAverageSpeed,
            alarmEnabled: alarmState.isEnabled,
            alarmTime: alarmState.alarmTime,
          });
        }
      } catch (err) {
        console.error('Failed to initialize from unified alarm manager:', err);
        setError('Failed to load alarm settings');
      }
    };
    
    initializeFromUnifiedManager();

    // Subscribe to unified alarm manager state changes to keep criteria in sync
    const unsubscribe = unifiedAlarmManager.onStateChange((alarmState) => {
      if (!isSubscribed) return;
      
      setCriteriaState(prev => {
        // Only update if values have actually changed to avoid unnecessary re-renders
        if (prev.alarmEnabled !== alarmState.isEnabled || prev.alarmTime !== alarmState.alarmTime) {
          console.log('📱 useDPAlarm syncing with unified alarm manager:', {
            enabled: `${prev.alarmEnabled} → ${alarmState.isEnabled}`,
            time: `${prev.alarmTime} → ${alarmState.alarmTime}`,
            source: 'unified_alarm_manager'
          });
          return {
            ...prev,
            alarmEnabled: alarmState.isEnabled,
            alarmTime: alarmState.alarmTime,
          };
        }
        return prev;
      });
    });

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  /**
   * Calculate alarm status based on alarm time conditions (not current conditions)
   * This shows what the conditions were at the time the alarm was set to trigger
   */
  const calculateAlarmTimeStatus = useCallback((): DPAlarmStatus => {
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

    // Parse alarm time (e.g., "05:00")
    const [alarmHour, alarmMinute] = criteria.alarmTime.split(':').map(Number);
    
    // Create alarm time for today
    const now = new Date();
    const alarmTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHour, alarmMinute);
    
    // If alarm time hasn't happened yet today, use yesterday's data
    const targetTime = alarmTimeToday > now 
      ? new Date(alarmTimeToday.getTime() - 24 * 60 * 60 * 1000) // Yesterday
      : alarmTimeToday; // Today
    
    // Find wind data closest to the alarm time
    // Look for data within 5 minutes of alarm time
    const targetTimeMs = targetTime.getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    
    const alarmTimeData = windData.filter((point) => {
      const pointTime = new Date(point.timestamp).getTime();
      return Math.abs(pointTime - targetTimeMs) <= fiveMinutesMs;
    });

    if (alarmTimeData.length === 0) {
      return {
        ...defaultStatus,
        reason: `No wind data available around ${criteria.alarmTime} alarm time`
      };
    }

    // Calculate average of data points around alarm time
    const averageSpeed = alarmTimeData.reduce((sum, point) => sum + point.windSpeedMph, 0) / alarmTimeData.length;
    const currentSpeed = alarmTimeData[alarmTimeData.length - 1]?.windSpeedMph || null;

    // Determine confidence based on data availability
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (alarmTimeData.length >= 3) { // 3+ data points around alarm time
      confidence = 'high';
    } else if (alarmTimeData.length >= 2) { // 2+ data points
      confidence = 'medium';
    }

    // Simple alarm logic: average speed must meet threshold
    const shouldWakeUp = averageSpeed >= criteria.minimumAverageSpeed;
    
    // Generate reason text with alarm time context
    const timeDisplay = targetTime.toLocaleDateString() === now.toLocaleDateString() ? 'today' : 'yesterday';
    let reason = '';
    if (shouldWakeUp) {
      reason = `At ${criteria.alarmTime} ${timeDisplay}: Average wind speed (${averageSpeed.toFixed(1)} mph) met threshold (${criteria.minimumAverageSpeed} mph) - Alarm would have triggered`;
    } else {
      reason = `At ${criteria.alarmTime} ${timeDisplay}: Average wind speed (${averageSpeed.toFixed(1)} mph) below threshold (${criteria.minimumAverageSpeed} mph) - Alarm would not trigger`;
    }

    return {
      shouldWakeUp,
      currentSpeed,
      averageSpeed,
      threshold: criteria.minimumAverageSpeed,
      lastUpdated: targetTime,
      confidence,
      reason
    };
  }, [windData, criteria.minimumAverageSpeed, criteria.alarmTime, lastUpdated]);

  // Calculate alarm time status (not current conditions)
  const alarmStatus = calculateAlarmTimeStatus();

  /**
   * Update alarm criteria and persist to storage
   */
  const setCriteria = useCallback(async (newCriteria: Partial<SimplifiedAlarmCriteria>) => {
    try {
      const updated = { ...criteria, ...newCriteria };
      console.log('📱 useDPAlarm setCriteria called:', {
        current: criteria,
        newCriteria,
        updated,
        source: 'user_interface'
      });
      
      // Update local state immediately for responsive UI
      setCriteriaState(updated);
      
      // Convert to full criteria format for storage compatibility
      await setAlarmCriteria({
        minimumAverageSpeed: updated.minimumAverageSpeed,
        alarmEnabled: updated.alarmEnabled,
        alarmTime: updated.alarmTime,
      });

      // Update the unified alarm manager to keep everything in sync
      // Only update if the values actually changed to avoid unnecessary calls
      const currentUnifiedState = unifiedAlarmManager.getState();
      
      if (newCriteria.alarmEnabled !== undefined && currentUnifiedState.isEnabled !== updated.alarmEnabled) {
        console.log('📱 useDPAlarm updating unified alarm manager enabled:', `${currentUnifiedState.isEnabled} → ${updated.alarmEnabled}`);
        await unifiedAlarmManager.setEnabled(updated.alarmEnabled);
      }
      
      if (newCriteria.alarmTime !== undefined && currentUnifiedState.alarmTime !== updated.alarmTime) {
        console.log('📱 useDPAlarm updating unified alarm manager time:', `${currentUnifiedState.alarmTime} → ${updated.alarmTime}`);
        await unifiedAlarmManager.setAlarmTime(updated.alarmTime);
      }
      
      console.log('✅ Alarm criteria updated successfully:', updated);
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
   * Test alarm with alarm time conditions
   */
  const testAlarm = useCallback(async (): Promise<{ triggered: boolean; reason: string }> => {
    const status = calculateAlarmTimeStatus();
    return {
      triggered: status.shouldWakeUp,
      reason: status.reason
    };
  }, [calculateAlarmTimeStatus]);

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
