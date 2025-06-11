import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { unifiedAlarmManager, type AlarmState, type AlarmTestOptions } from '@/services/unifiedAlarmManager';
import type { WindAnalysis } from '@/services/windService';

/**
 * React hook for unified alarm management
 * 
 * Provides a clean interface to the unified alarm manager with automatic state updates
 */
export function useUnifiedAlarm() {
  const [alarmState, setAlarmState] = useState<AlarmState>(() => unifiedAlarmManager.getState());
  const [isInitialized, setIsInitialized] = useState(false);

  // Subscribe to alarm state changes
  useEffect(() => {
    const unsubscribe = unifiedAlarmManager.onStateChange(setAlarmState);
    return unsubscribe;
  }, []);

  // Initialize the alarm manager
  useEffect(() => {
    const initialize = async () => {
      try {
        await unifiedAlarmManager.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize alarm manager:', error);
      }
    };

    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized]);

  // Update app foreground state
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      unifiedAlarmManager.setAppForegroundState(nextAppState === 'active');
    };

    // Set initial state
    unifiedAlarmManager.setAppForegroundState(AppState.currentState === 'active');

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  // Enable/disable alarm
  const setEnabled = useCallback(async (enabled: boolean) => {
    try {
      await unifiedAlarmManager.setEnabled(enabled);
    } catch (error) {
      console.error('Failed to set alarm enabled state:', error);
      throw error;
    }
  }, []);

  // Set alarm time
  const setAlarmTime = useCallback(async (time: string) => {
    try {
      await unifiedAlarmManager.setAlarmTime(time);
    } catch (error) {
      console.error('Failed to set alarm time:', error);
      throw error;
    }
  }, []);

  // Test alarm with current conditions
  const testWithCurrentConditions = useCallback(async (): Promise<{ triggered: boolean; analysis: WindAnalysis }> => {
    try {
      return await unifiedAlarmManager.testAlarmWithCurrentConditions();
    } catch (error) {
      console.error('Failed to test alarm with current conditions:', error);
      throw error;
    }
  }, []);

  // Test alarm with ideal conditions
  const testWithIdealConditions = useCallback(async (): Promise<{ triggered: boolean; analysis: WindAnalysis }> => {
    try {
      return await unifiedAlarmManager.testAlarmWithIdealConditions();
    } catch (error) {
      console.error('Failed to test alarm with ideal conditions:', error);
      throw error;
    }
  }, []);

  // Test alarm with delay (for background testing)
  const testWithDelay = useCallback(async (delaySeconds: number): Promise<{ scheduled: boolean; triggerTime: Date }> => {
    try {
      return await unifiedAlarmManager.testAlarmWithDelay(delaySeconds);
    } catch (error) {
      console.error('Failed to schedule delayed test alarm:', error);
      throw error;
    }
  }, []);

  // Test alarm with delayed ideal conditions (for background testing)
  const testWithDelayedIdealConditions = useCallback(async (delaySeconds: number): Promise<{ scheduled: boolean; triggerTime: Date }> => {
    try {
      return await unifiedAlarmManager.testAlarmWithDelayedIdealConditions(delaySeconds);
    } catch (error) {
      console.error('Failed to schedule delayed ideal conditions test alarm:', error);
      throw error;
    }
  }, []);

  // Stop currently playing alarm
  const stopAlarm = useCallback(async () => {
    try {
      await unifiedAlarmManager.stopAlarm();
    } catch (error) {
      console.error('Failed to stop alarm:', error);
      throw error;
    }
  }, []);

  // Emergency stop all alarm functions
  const emergencyStop = useCallback(async () => {
    try {
      await unifiedAlarmManager.emergencyStop();
    } catch (error) {
      console.error('Failed to emergency stop alarm:', error);
      throw error;
    }
  }, []);

  return {
    // State
    alarmState,
    isInitialized,
    
    // Actions
    setEnabled,
    setAlarmTime,
    testWithCurrentConditions,
    testWithIdealConditions,
    testWithDelay,
    testWithDelayedIdealConditions,
    stopAlarm,
    emergencyStop,
    
    // Computed values for convenience
    isEnabled: alarmState.isEnabled,
    isActive: alarmState.isActive,
    isPlaying: alarmState.isPlaying,
    alarmTime: alarmState.alarmTime,
    nextCheckTime: alarmState.nextCheckTime,
    hasBackgroundSupport: alarmState.hasBackgroundSupport,
  };
}

export type UseUnifiedAlarmReturn = ReturnType<typeof useUnifiedAlarm>;
