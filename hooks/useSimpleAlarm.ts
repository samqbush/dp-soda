import { useState, useEffect } from 'react';
import { simpleAlarmService, type SimpleAlarmState, type AlarmCheckResult } from '@/services/simpleAlarmService';

/**
 * Hook return interface
 */
export interface UseSimpleAlarmReturn {
  // State
  state: SimpleAlarmState;
  isLoading: boolean;
  isReady: boolean;
  
  // Actions
  setAlarm: (time: string) => Promise<void>;
  disable: () => Promise<void>;
  setWindThreshold: (mph: number) => Promise<void>;
  checkWindConditions: () => Promise<AlarmCheckResult>;
  testAlarm: () => Promise<AlarmCheckResult>;
  testNotifications: () => Promise<{
    hasPermission: boolean;
    canSchedule: boolean;
    error?: string;
  }>;
  reset: () => Promise<void>;
  
  // Convenience getters
  enabled: boolean;
  alarmTime: string;
  windThreshold: number;
  lastCheck: Date | null;
  lastWindSpeed: number | null;
}

/**
 * Simple Alarm Hook
 * 
 * Clean React hook interface for the simple alarm service.
 * Provides reactive state and easy-to-use methods.
 */
export const useSimpleAlarm = (): UseSimpleAlarmReturn => {
  const [state, setState] = useState<SimpleAlarmState>(simpleAlarmService.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(simpleAlarmService.isReady());

  // Subscribe to service state changes
  useEffect(() => {
    console.log('🪝 useSimpleAlarm: Subscribing to service changes');
    
    const unsubscribe = simpleAlarmService.subscribe((newState) => {
      console.log('🪝 useSimpleAlarm: State updated:', newState);
      setState(newState);
      setIsReady(true);
    });

    // Set initial ready state
    setIsReady(simpleAlarmService.isReady());

    return () => {
      console.log('🪝 useSimpleAlarm: Unsubscribing from service changes');
      unsubscribe();
    };
  }, []);

  // Wrapper function for service calls with loading state
  const withLoading = async <T,>(operation: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await operation();
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  // Action methods
  const setAlarm = async (time: string): Promise<void> => {
    console.log(`🪝 useSimpleAlarm: Setting alarm for ${time}`);
    await withLoading(() => simpleAlarmService.setAlarm(time));
  };

  const disable = async (): Promise<void> => {
    console.log('🪝 useSimpleAlarm: Disabling alarm');
    await withLoading(() => simpleAlarmService.disable());
  };

  const setWindThreshold = async (mph: number): Promise<void> => {
    console.log(`🪝 useSimpleAlarm: Setting wind threshold to ${mph} mph`);
    await withLoading(() => simpleAlarmService.setWindThreshold(mph));
  };

  const checkWindConditions = async (): Promise<AlarmCheckResult> => {
    console.log('🪝 useSimpleAlarm: Checking wind conditions');
    return await withLoading(() => simpleAlarmService.checkWindConditions());
  };

  const testAlarm = async (): Promise<AlarmCheckResult> => {
    console.log('🪝 useSimpleAlarm: Testing alarm');
    return await withLoading(() => simpleAlarmService.testAlarm());
  };

  const testNotifications = async () => {
    console.log('🪝 useSimpleAlarm: Testing notifications');
    return await withLoading(() => simpleAlarmService.testNotifications());
  };

  const reset = async (): Promise<void> => {
    console.log('🪝 useSimpleAlarm: Resetting alarm service');
    await withLoading(() => simpleAlarmService.reset());
  };

  return {
    // State
    state,
    isLoading,
    isReady,
    
    // Actions
    setAlarm,
    disable,
    setWindThreshold,
    checkWindConditions,
    testAlarm,
    testNotifications,
    reset,
    
    // Convenience getters
    enabled: state.enabled,
    alarmTime: state.alarmTime,
    windThreshold: state.windThreshold,
    lastCheck: state.lastCheck,
    lastWindSpeed: state.lastWindSpeed,
  };
};
