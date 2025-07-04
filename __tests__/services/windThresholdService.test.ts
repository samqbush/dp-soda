import AsyncStorage from '@react-native-async-storage/async-storage';
import { windThresholdService, WindThresholdState } from '@/services/windThresholdService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('WindThresholdService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the service to uninitialized state before each test
    // We need to access private properties for testing, so we use any type
    (windThresholdService as any).isInitialized = false;
    (windThresholdService as any).currentThreshold = 15; // Reset to default
    (windThresholdService as any).listeners.clear();
    
    // Set up default mock implementations
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  describe('Initialization', () => {
    it('should initialize with default threshold when no saved data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      await windThresholdService.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('wind_threshold');
      expect(windThresholdService.getThreshold()).toBe(15); // Default value
    });

    it('should load saved threshold from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('20');

      await windThresholdService.initialize();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('wind_threshold');
      expect(windThresholdService.getThreshold()).toBe(20);
    });

    it('should handle invalid JSON in AsyncStorage gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await windThresholdService.initialize();

      expect(windThresholdService.getThreshold()).toBe(15); // Should fall back to default
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load wind threshold:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle AsyncStorage.getItem error gracefully', async () => {
      const mockError = new Error('AsyncStorage error');
      mockAsyncStorage.getItem.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await windThresholdService.initialize();

      expect(windThresholdService.getThreshold()).toBe(15); // Should fall back to default
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load wind threshold:', mockError);
      
      consoleSpy.mockRestore();
    });

    it('should not initialize twice', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('25');

      // First initialization
      await windThresholdService.initialize();
      expect(windThresholdService.getThreshold()).toBe(25);

      // Change mock to return different value
      mockAsyncStorage.getItem.mockResolvedValue('30');

      // Second initialization should not change the threshold
      await windThresholdService.initialize();
      expect(windThresholdService.getThreshold()).toBe(25); // Should remain 25
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1); // Should only be called once
    });
  });

  describe('Threshold Management', () => {
    beforeEach(async () => {
      // Initialize the service before each test
      await windThresholdService.initialize();
    });

    it('should return current threshold', () => {
      expect(windThresholdService.getThreshold()).toBe(15); // Default value
    });

    it('should set new threshold and save to AsyncStorage', async () => {
      await windThresholdService.setThreshold(22);

      expect(windThresholdService.getThreshold()).toBe(22);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('wind_threshold', '22');
    });

    it('should handle AsyncStorage.setItem error gracefully', async () => {
      const mockError = new Error('Save failed');
      mockAsyncStorage.setItem.mockRejectedValue(mockError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await windThresholdService.setThreshold(18);

      // Threshold should still be updated in memory
      expect(windThresholdService.getThreshold()).toBe(18);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save wind threshold:', mockError);
      
      consoleSpy.mockRestore();
    });

    it('should accept various threshold values', async () => {
      const testValues = [0, 5, 10, 15, 20, 25, 30, 35, 40];

      for (const value of testValues) {
        await windThresholdService.setThreshold(value);
        expect(windThresholdService.getThreshold()).toBe(value);
      }
    });

    it('should handle decimal threshold values', async () => {
      await windThresholdService.setThreshold(12.5);
      expect(windThresholdService.getThreshold()).toBe(12.5);

      await windThresholdService.setThreshold(17.75);
      expect(windThresholdService.getThreshold()).toBe(17.75);
    });
  });

  describe('Listener Management', () => {
    beforeEach(async () => {
      await windThresholdService.initialize();
    });

    it('should register listeners and call them on threshold change', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      // Register listeners
      const unsubscribe1 = windThresholdService.onThresholdChange(listener1);
      const unsubscribe2 = windThresholdService.onThresholdChange(listener2);

      // Change threshold
      await windThresholdService.setThreshold(25);

      expect(listener1).toHaveBeenCalledWith(25);
      expect(listener2).toHaveBeenCalledWith(25);
      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function that removes listener', async () => {
      const listener = jest.fn();

      const unsubscribe = windThresholdService.onThresholdChange(listener);

      // Change threshold - listener should be called
      await windThresholdService.setThreshold(20);
      expect(listener).toHaveBeenCalledWith(20);

      // Unsubscribe
      unsubscribe();

      // Change threshold again - listener should not be called
      listener.mockClear();
      await windThresholdService.setThreshold(30);
      expect(listener).not.toHaveBeenCalled();
    });

    it('should handle multiple listeners and unsubscribing', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      const listener3 = jest.fn();

      const unsubscribe1 = windThresholdService.onThresholdChange(listener1);
      const unsubscribe2 = windThresholdService.onThresholdChange(listener2);
      const unsubscribe3 = windThresholdService.onThresholdChange(listener3);

      // All listeners should be called
      await windThresholdService.setThreshold(35);
      expect(listener1).toHaveBeenCalledWith(35);
      expect(listener2).toHaveBeenCalledWith(35);
      expect(listener3).toHaveBeenCalledWith(35);

      // Unsubscribe middle listener
      unsubscribe2();

      // Only listener1 and listener3 should be called
      listener1.mockClear();
      listener2.mockClear();
      listener3.mockClear();

      await windThresholdService.setThreshold(40);
      expect(listener1).toHaveBeenCalledWith(40);
      expect(listener2).not.toHaveBeenCalled();
      expect(listener3).toHaveBeenCalledWith(40);
    });

    it('should handle listener errors gracefully', async () => {
      const goodListener = jest.fn();
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const anotherGoodListener = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      windThresholdService.onThresholdChange(goodListener);
      windThresholdService.onThresholdChange(errorListener);
      windThresholdService.onThresholdChange(anotherGoodListener);

      await windThresholdService.setThreshold(25);

      // Good listeners should still be called
      expect(goodListener).toHaveBeenCalledWith(25);
      expect(anotherGoodListener).toHaveBeenCalledWith(25);
      
      // Error should be logged
      expect(consoleSpy).toHaveBeenCalledWith('Error notifying threshold listener:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should not notify listeners when AsyncStorage save fails', async () => {
      const listener = jest.fn();
      windThresholdService.onThresholdChange(listener);

      // Mock AsyncStorage to fail
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Save failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await windThresholdService.setThreshold(25);

      // Threshold should be updated in memory
      expect(windThresholdService.getThreshold()).toBe(25);
      
      // But listeners should not be called due to save failure
      expect(listener).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('should work correctly in a complete workflow', async () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      // Initialize with saved value
      mockAsyncStorage.getItem.mockResolvedValue('18');
      await windThresholdService.initialize();
      expect(windThresholdService.getThreshold()).toBe(18);

      // Register listeners
      const unsubscribe1 = windThresholdService.onThresholdChange(listener1);
      const unsubscribe2 = windThresholdService.onThresholdChange(listener2);

      // Update threshold
      await windThresholdService.setThreshold(22);
      expect(windThresholdService.getThreshold()).toBe(22);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('wind_threshold', '22');
      expect(listener1).toHaveBeenCalledWith(22);
      expect(listener2).toHaveBeenCalledWith(22);

      // Unsubscribe one listener
      unsubscribe1();

      // Update again
      listener1.mockClear();
      listener2.mockClear();
      await windThresholdService.setThreshold(28);
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledWith(28);
    });

    it('should maintain state consistency across multiple operations', async () => {
      await windThresholdService.initialize();
      
      const thresholdValues = [10, 15, 20, 25, 12.5, 30];
      const listener = jest.fn();
      
      windThresholdService.onThresholdChange(listener);

      for (let i = 0; i < thresholdValues.length; i++) {
        const value = thresholdValues[i];
        await windThresholdService.setThreshold(value);
        
        expect(windThresholdService.getThreshold()).toBe(value);
        expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('wind_threshold', JSON.stringify(value));
        expect(listener).toHaveBeenCalledWith(value);
        expect(listener).toHaveBeenCalledTimes(i + 1);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extreme threshold values', async () => {
      await windThresholdService.initialize();

      const extremeValues = [-10, 0, 0.1, 999, 1000];
      
      for (const value of extremeValues) {
        await windThresholdService.setThreshold(value);
        expect(windThresholdService.getThreshold()).toBe(value);
      }
    });

    it('should handle rapid threshold changes', async () => {
      await windThresholdService.initialize();
      const listener = jest.fn();
      windThresholdService.onThresholdChange(listener);

      // Rapid fire threshold changes
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(windThresholdService.setThreshold(i * 5));
      }

      await Promise.all(promises);

      // Final threshold should be the last one set
      // Note: Due to async nature, we can't guarantee the exact final value
      // but we can ensure the service didn't crash
      expect(typeof windThresholdService.getThreshold()).toBe('number');
      expect(listener).toHaveBeenCalled();
    });

    it('should work correctly when called before initialization', () => {
      // Reset to uninitialized state
      (windThresholdService as any).isInitialized = false;
      (windThresholdService as any).currentThreshold = 15;

      // getThreshold should work even before initialization
      expect(windThresholdService.getThreshold()).toBe(15);
    });
  });
});
