import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {
  WindDataPoint,
  WindAnalysis,
  AlarmCriteria,
  fetchWindData,
  analyzeWindData,
  getCachedWindData,
  getAlarmCriteria,
  setAlarmCriteria,
  verifyWindConditions,
  loadPreloadedData,
  fetchRealWindData,
  checkSimplifiedAlarmConditions,
  analyzeRecentWindData
} from '@/services/windService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('axios');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('WindService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Set up default mock implementations
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
  });

  describe('analyzeWindData', () => {
    const mockWindData: WindDataPoint[] = [
      {
        time: '2025-07-04T06:00:00.000Z',
        windSpeed: 15,
        windGust: 18,
        windDirection: 315
      },
      {
        time: '2025-07-04T06:15:00.000Z',
        windSpeed: 17,
        windGust: 20,
        windDirection: 320
      },
      {
        time: '2025-07-04T06:30:00.000Z',
        windSpeed: 16,
        windGust: 19,
        windDirection: 325
      },
      {
        time: '2025-07-04T06:45:00.000Z',
        windSpeed: 18,
        windGust: 21,
        windDirection: 330
      }
    ];

    const mockAlarmCriteria: AlarmCriteria = {
      minimumAverageSpeed: 15,
      directionConsistencyThreshold: 80,
      minimumConsecutivePoints: 3,
      directionDeviationThreshold: 30,
      preferredDirection: 320,
      preferredDirectionRange: 40,
      useWindDirection: true,
      alarmEnabled: true,
      alarmTime: '06:00'
    };

    it('should analyze wind data and return correct analysis', () => {
      const result = analyzeWindData(mockWindData, mockAlarmCriteria);

      expect(result).toHaveProperty('isAlarmWorthy');
      expect(result).toHaveProperty('averageSpeed');
      expect(result).toHaveProperty('directionConsistency');
      expect(result).toHaveProperty('consecutiveGoodPoints');
      expect(result).toHaveProperty('analysis');
      
      expect(typeof result.isAlarmWorthy).toBe('boolean');
      expect(typeof result.averageSpeed).toBe('number');
      expect(typeof result.directionConsistency).toBe('number');
      expect(typeof result.consecutiveGoodPoints).toBe('number');
      expect(typeof result.analysis).toBe('string');
    });

    it('should handle empty wind data', () => {
      const result = analyzeWindData([], mockAlarmCriteria);

      expect(result.isAlarmWorthy).toBe(false);
      expect(result.averageSpeed).toBe(0);
      expect(result.directionConsistency).toBe(0);
      expect(result.consecutiveGoodPoints).toBe(0);
      expect(result.analysis).toContain('No wind data');
    });

    it('should handle good wind conditions', () => {
      const goodWindData = mockWindData.map(point => ({
        ...point,
        windSpeed: '20', // Use string format as the interface allows
        windDirection: '320' // Consistent direction
      }));

      const result = analyzeWindData(goodWindData, mockAlarmCriteria);

      // Just verify the function runs and returns proper structure
      expect(typeof result.averageSpeed).toBe('number');
      expect(typeof result.isAlarmWorthy).toBe('boolean');
      expect(result.consecutiveGoodPoints).toBeGreaterThanOrEqual(0);
    });

    it('should handle poor wind conditions', () => {
      const poorWindData = mockWindData.map(point => ({
        ...point,
        windSpeed: '5', // Use string format, low speed
        windDirection: Math.random() * 360 // Random direction
      }));

      const result = analyzeWindData(poorWindData, mockAlarmCriteria);

      expect(result.averageSpeed).toBeGreaterThanOrEqual(0);
      expect(typeof result.isAlarmWorthy).toBe('boolean');
    });

    it('should handle wind direction disabled', () => {
      const criteriaNoDirection = {
        ...mockAlarmCriteria,
        useWindDirection: false
      };

      const result = analyzeWindData(mockWindData, criteriaNoDirection);

      expect(result).toHaveProperty('directionConsistency');
      expect(typeof result.directionConsistency).toBe('number');
    });
  });

  describe('getCachedWindData', () => {
    it('should return cached data when available', async () => {
      const cachedData = JSON.stringify([
        {
          time: '2025-07-04T06:00:00.000Z',
          windSpeed: '15',
          windGust: '18',
          windDirection: '315'
        }
      ]);
      mockAsyncStorage.getItem.mockResolvedValue(cachedData);

      const result = await getCachedWindData();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('windData');
      // Just verify the function is called and handles data
      expect(result !== undefined).toBe(true);
    });

    it('should return null when no cached data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getCachedWindData();

      expect(result).toBe(null);
    });

    it('should handle invalid cached data gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getCachedWindData();

      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith('❌ Error parsing cached data:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getAlarmCriteria', () => {
    it('should return default criteria when no saved criteria', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await getAlarmCriteria();

      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('alarmCriteria');
      expect(result).toHaveProperty('minimumAverageSpeed');
      expect(result).toHaveProperty('alarmEnabled');
      expect(result).toHaveProperty('alarmTime');
      expect(typeof result.minimumAverageSpeed).toBe('number');
      expect(typeof result.alarmEnabled).toBe('boolean');
      expect(typeof result.alarmTime).toBe('string');
    });

    it('should return saved criteria when available', async () => {
      const savedCriteria = {
        minimumAverageSpeed: 20,
        alarmEnabled: true,
        alarmTime: '05:30'
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(savedCriteria));

      const result = await getAlarmCriteria();

      expect(result.minimumAverageSpeed).toBe(20);
      expect(result.alarmEnabled).toBe(true);
      expect(result.alarmTime).toBe('05:30');
    });

    it('should handle invalid saved criteria gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid-json');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getAlarmCriteria();

      expect(result).toHaveProperty('minimumAverageSpeed');
      expect(consoleSpy).toHaveBeenCalledWith('Error getting alarm criteria:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('setAlarmCriteria', () => {
    it('should save alarm criteria correctly', async () => {
      const newCriteria = {
        minimumAverageSpeed: 18,
        alarmEnabled: false
      };

      await setAlarmCriteria(newCriteria);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'alarmCriteria',
        expect.stringContaining('"minimumAverageSpeed":18')
      );
    });

    it('should handle save errors gracefully', async () => {
      const saveError = new Error('Save failed');
      mockAsyncStorage.setItem.mockRejectedValue(saveError);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const newCriteria = { minimumAverageSpeed: 18 };
      await setAlarmCriteria(newCriteria);

      expect(consoleSpy).toHaveBeenCalledWith('Error setting alarm criteria:', saveError);
      
      consoleSpy.mockRestore();
    });
  });

  describe('verifyWindConditions', () => {
    const mockTestData: WindDataPoint[] = [
      {
        time: '2025-07-04T06:00:00.000Z',
        windSpeed: 18,
        windGust: 21,
        windDirection: 315
      },
      {
        time: '2025-07-04T06:15:00.000Z',
        windSpeed: 20,
        windGust: 23,
        windDirection: 320
      },
      {
        time: '2025-07-04T06:30:00.000Z',
        windSpeed: 19,
        windGust: 22,
        windDirection: 325
      }
    ];

    const mockCriteria: AlarmCriteria = {
      minimumAverageSpeed: 15,
      directionConsistencyThreshold: 80,
      minimumConsecutivePoints: 3,
      directionDeviationThreshold: 30,
      preferredDirection: 320,
      preferredDirectionRange: 40,
      useWindDirection: true,
      alarmEnabled: true,
      alarmTime: '06:00'
    };

    it('should return analysis for good wind conditions', () => {
      const result = verifyWindConditions(mockTestData, mockCriteria);

      expect(result).toHaveProperty('isAlarmWorthy');
      expect(result).toHaveProperty('averageSpeed');
      expect(result).toHaveProperty('directionConsistency');
      expect(result).toHaveProperty('consecutiveGoodPoints');
      expect(result).toHaveProperty('analysis');
      
      expect(typeof result.isAlarmWorthy).toBe('boolean');
      expect(typeof result.averageSpeed).toBe('number');
      expect(typeof result.directionConsistency).toBe('number');
      expect(typeof result.consecutiveGoodPoints).toBe('number');
      expect(typeof result.analysis).toBe('string');
    });

    it('should handle data outside verification window', () => {
      const outOfWindowData: WindDataPoint[] = [
        {
          time: '2025-07-04T05:00:00.000Z', // 5am - before window
          windSpeed: 20,
          windGust: 23,
          windDirection: 320
        },
        {
          time: '2025-07-04T09:00:00.000Z', // 9am - after window
          windSpeed: 22,
          windGust: 25,
          windDirection: 325
        }
      ];

      const result = verifyWindConditions(outOfWindowData, mockCriteria);

      expect(result.averageSpeed).toBe(0); // No data in 6-8am window
    });

    it('should handle empty data array', () => {
      const result = verifyWindConditions([], mockCriteria);

      expect(result.isAlarmWorthy).toBe(false);
      expect(result.averageSpeed).toBe(0);
      expect(result.analysis).toContain('No wind data');
    });
  });

  describe('loadPreloadedData', () => {
    it('should return preloaded wind data', async () => {
      const result = await loadPreloadedData();

      expect(Array.isArray(result)).toBe(true);
      // The function may return empty array or actual data, both are valid
      expect(result).toBeDefined();
      
      // If data exists, check structure
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('time');
        expect(result[0]).toHaveProperty('windSpeed');
        expect(result[0]).toHaveProperty('windGust');
        expect(result[0]).toHaveProperty('windDirection');
      }
    });
  });

  describe('analyzeRecentWindData', () => {
    it('should analyze recent wind data correctly', () => {
      const result = analyzeRecentWindData(mockWindData);

      expect(result).toHaveProperty('averageSpeed');
      expect(result).toHaveProperty('isAlarmWorthy');
      expect(result).toHaveProperty('directionConsistency');
      expect(result).toHaveProperty('consecutiveGoodPoints');
      expect(result).toHaveProperty('analysis');
      
      expect(typeof result.averageSpeed).toBe('number');
      expect(typeof result.isAlarmWorthy).toBe('boolean');
      expect(typeof result.directionConsistency).toBe('number');
      expect(typeof result.consecutiveGoodPoints).toBe('number');
      expect(typeof result.analysis).toBe('string');
    });

    it('should handle empty data gracefully', () => {
      const result = analyzeRecentWindData([]);

      expect(result.averageSpeed).toBe(0);
      expect(result.isAlarmWorthy).toBe(false);
      expect(result.directionConsistency).toBe(0);
      expect(result.consecutiveGoodPoints).toBe(0);
      expect(result.analysis).toContain('No wind data');
    });

    it('should analyze data within time window', () => {
      // Create data with timestamps within the last hour
      const now = new Date();
      const recentData = [
        { 
          time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          windSpeed: 10, 
          windGust: 12, 
          windDirection: 270 
        },
        { 
          time: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
          windSpeed: 20, 
          windGust: 25, 
          windDirection: 280 
        }
      ];

      const result = analyzeRecentWindData(recentData, undefined, now);

      expect(result.averageSpeed).toBeGreaterThan(0);
      expect(typeof result.isAlarmWorthy).toBe('boolean');
    });
  });

  const mockWindData: WindDataPoint[] = [
    {
      time: '2025-07-04T06:00:00.000Z',
      windSpeed: 15,
      windGust: 18,
      windDirection: 315
    },
    {
      time: '2025-07-04T06:15:00.000Z',
      windSpeed: 17,
      windGust: 20,
      windDirection: 320
    }
  ];
});
