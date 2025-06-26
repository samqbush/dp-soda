import { useState, useEffect } from 'react';
import { windThresholdService } from '@/services/windThresholdService';

export interface UseWindThresholdReturn {
  windThreshold: number;
  setWindThreshold: (threshold: number) => Promise<void>;
  isLoading: boolean;
}

export const useWindThreshold = (): UseWindThresholdReturn => {
  const [windThreshold, setWindThresholdState] = useState(15); // Default value
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize the service and subscribe to changes
    const initialize = async () => {
      await windThresholdService.initialize();
      setWindThresholdState(windThresholdService.getThreshold());
      setIsLoading(false);
    };

    initialize();

    // Subscribe to threshold changes
    const unsubscribe = windThresholdService.onThresholdChange((threshold) => {
      setWindThresholdState(threshold);
    });

    return unsubscribe;
  }, []);

  const setWindThreshold = async (threshold: number): Promise<void> => {
    await windThresholdService.setThreshold(threshold);
  };

  return {
    windThreshold,
    setWindThreshold,
    isLoading
  };
};
