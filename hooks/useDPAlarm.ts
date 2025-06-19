import { useCallback, useEffect, useState } from 'react';
import { useSodaLakeWind } from './useSodaLakeWind';
import { getAlarmCriteria, setAlarmCriteria, checkSimplifiedAlarmConditions } from '@/services/windService';
import { unifiedAlarmManager } from '@/services/unifiedAlarmManager';

// Simple event emitter for cross-hook synchronization
class CriteriaSyncManager {
  private listeners: ((criteria: SimplifiedAlarmCriteria) => void)[] = [];

  subscribe(callback: (criteria: SimplifiedAlarmCriteria) => void) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyChange(criteria: SimplifiedAlarmCriteria) {
    this.listeners.forEach(callback => callback(criteria));
  }
}

const criteriaSyncManager = new CriteriaSyncManager();

export interface SimplifiedAlarmCriteria {
  minimumAverageSpeed: number;
  alarmEnabled: boolean;
  alarmTime: string;
}

export interface DPAlarmStatus {
  shouldWakeUp: boolean;
  currentSpeed: number | null;
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
  minimumAverageSpeed: 15,
  alarmEnabled: false,
  alarmTime: "05:00"
};

/**
 * Simplified DP Alarm hook that uses current Ecowitt conditions
 */
export const useDPAlarm = (): UseDPAlarmReturn => {
  console.log('⏰ useDPAlarm hook initializing...');
  
  const [criteria, setCriteriaState] = useState<SimplifiedAlarmCriteria>(DEFAULT_SIMPLIFIED_CRITERIA);
  const [error, setError] = useState<string | null>(null);
  
  // Use Soda Lake current conditions for immediate alarm decisions
  const {
    currentConditions,
    currentConditionsUpdated,
    error: windError,
    refreshCurrentConditions
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

    // Subscribe to criteria changes from other hook instances
    const unsubscribeCriteriaSync = criteriaSyncManager.subscribe((updatedCriteria) => {
      if (!isSubscribed) return;
      
      setCriteriaState(prev => {
        // Only update if minimumAverageSpeed actually changed to avoid unnecessary re-renders
        if (prev.minimumAverageSpeed !== updatedCriteria.minimumAverageSpeed) {
          console.log('📱 useDPAlarm syncing criteria across instances:', {
            speed: `${prev.minimumAverageSpeed} → ${updatedCriteria.minimumAverageSpeed}`,
            source: 'criteria_sync_manager'
          });
          return {
            ...prev,
            minimumAverageSpeed: updatedCriteria.minimumAverageSpeed,
          };
        }
        return prev;
      });
    });

    // Cleanup subscription on unmount
    return () => {
      isSubscribed = false;
      unsubscribe();
      unsubscribeCriteriaSync();
    };
  }, []);

  /**
   * Calculate alarm status based on current wind conditions
   * This shows what the current conditions are for immediate decisions
   */
  const calculateCurrentAlarmStatus = useCallback((): DPAlarmStatus => {
    // Default status
    const defaultStatus: DPAlarmStatus = {
      shouldWakeUp: false,
      currentSpeed: null,
      threshold: criteria.minimumAverageSpeed,
      lastUpdated: currentConditionsUpdated,
      confidence: 'low',
      reason: 'No current wind data available'
    };

    // Check if we have current conditions
    if (!currentConditions) {
      return {
        ...defaultStatus,
        reason: 'No current wind data from Soda Lake station'
      };
    }

    const currentSpeed = currentConditions.windSpeedMph;
    
    if (currentSpeed === null || currentSpeed === undefined) {
      return {
        ...defaultStatus,
        reason: 'Wind speed data not available from station'
      };
    }

    // High confidence for real-time data
    const confidence: 'high' | 'medium' | 'low' = 'high';

    // Simple alarm logic: current speed must meet threshold
    const shouldWakeUp = currentSpeed >= criteria.minimumAverageSpeed;
    
    // Generate reason text for current conditions
    let reason = '';
    if (shouldWakeUp) {
      reason = `Current wind speed (${currentSpeed.toFixed(1)} mph) meets your threshold (${criteria.minimumAverageSpeed} mph) - Time to go!`;
    } else {
      reason = `Current wind speed (${currentSpeed.toFixed(1)} mph) below your threshold (${criteria.minimumAverageSpeed} mph) - Not quite yet`;
    }

    return {
      shouldWakeUp,
      currentSpeed,
      threshold: criteria.minimumAverageSpeed,
      lastUpdated: currentConditionsUpdated,
      confidence,
      reason
    };
  }, [currentConditions, criteria.minimumAverageSpeed, currentConditionsUpdated]);

  // Calculate current alarm status (not historical conditions)
  const alarmStatus = calculateCurrentAlarmStatus();

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
      
      // Notify other hook instances of criteria changes (especially minimumAverageSpeed)
      if (newCriteria.minimumAverageSpeed !== undefined) {
        console.log('📱 useDPAlarm notifying other instances of criteria change');
        criteriaSyncManager.notifyChange(updated);
      }
      
      console.log('✅ Alarm criteria updated successfully:', updated);
    } catch (err) {
      console.error('❌ Failed to update alarm criteria:', err);
      setError('Failed to save alarm settings');
      throw err;
    }
  }, [criteria]);

  /**
   * Refresh current wind conditions
   */
  const refreshData = useCallback(async () => {
    try {
      setError(null);
      await refreshCurrentConditions();
    } catch (err) {
      console.error('❌ Failed to refresh current conditions:', err);
      setError('Failed to refresh current wind conditions');
    }
  }, [refreshCurrentConditions]);

  /**
   * Test alarm with current conditions
   */
  const testAlarm = useCallback(async (): Promise<{ triggered: boolean; reason: string }> => {
    try {
      const result = await checkSimplifiedAlarmConditions();
      return {
        triggered: result.shouldTrigger,
        reason: result.reason
      };
    } catch (err) {
      console.error('❌ Failed to test alarm:', err);
      return {
        triggered: false,
        reason: 'Failed to check current conditions'
      };
    }
  }, []);

  // Combine wind error with local error
  const combinedError = error || windError;

  return {
    alarmStatus,
    criteria,
    setCriteria,
    isLoading: false, // No loading state needed for current conditions display
    error: combinedError,
    refreshData,
    testAlarm,
  };
};
