import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { unifiedAlarmManager, type AlarmState } from '@/services/unifiedAlarmManager';

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
    stopAlarm,
    emergencyStop,
    
    // Computed values for convenience
    isEnabled: alarmState.isEnabled,
    isActive: alarmState.isActive,
    isPlaying: alarmState.isPlaying,
    alarmTime: alarmState.alarmTime,
    nextCheckTime: alarmState.nextCheckTime,
  };
}

export type UseUnifiedAlarmReturn = ReturnType<typeof useUnifiedAlarm>;
