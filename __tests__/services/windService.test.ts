import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WindDataPoint,
  WindAnalysis,
  AlarmCriteria,
  analyzeWindData,
  getAlarmCriteria,
  setAlarmCriteria,
  checkSimplifiedAlarmConditions,
  analyzeRecentWindData
} from '@/services/windService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios'
  }
}));

// Mock the Ecowitt service for checkSimplifiedAlarmConditions
const mockFetchEcowittRealTimeWindData = jest.fn();
jest.mock('@/services/ecowittService', () => ({
  fetchEcowittRealTimeWindData: mockFetchEcowittRealTimeWindData
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('WindService Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    
    mockFetchEcowittRealTimeWindData.mockReset();
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

    it('should analyze wind data and return correct analysis', () => {
      const result = analyzeWindData(mockWindData, undefined, undefined, true);

      expect(result).toHaveProperty('averageSpeed');
      expect(result).toHaveProperty('isAlarmWorthy');
      expect(result).toHaveProperty('directionConsistency');
      expect(result).toHaveProperty('consecutiveGoodPoints');
      expect(result).toHaveProperty('analysis');
    });

    it('should handle empty wind data', () => {
      const result = analyzeWindData([]);

      expect(result.averageSpeed).toBe(0);
      expect(result.isAlarmWorthy).toBe(false);
      expect(result.directionConsistency).toBe(0);
      expect(result.consecutiveGoodPoints).toBe(0);
      expect(result.analysis).toContain('No wind data');
    });

    it('should handle good wind conditions', () => {
      const result = analyzeWindData(mockWindData, undefined, undefined, true);

      expect(result.averageSpeed).toBeGreaterThan(0);
      expect(typeof result.isAlarmWorthy).toBe('boolean');
      expect(result.directionConsistency).toBeGreaterThan(0);
    });

    it('should handle poor wind conditions', () => {
      const lowWindData: WindDataPoint[] = [
        { time: '2025-07-04T06:00:00.000Z', windSpeed: 2, windGust: 3, windDirection: 45 },
        { time: '2025-07-04T06:15:00.000Z', windSpeed: 3, windGust: 4, windDirection: 180 }
      ];
      const result = analyzeWindData(lowWindData, undefined, undefined, true);

      expect(result.isAlarmWorthy).toBe(false);
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

  describe('analyzeRecentWindData', () => {
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
      const now = new Date();
      const recentData = [
        { 
          time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
          windSpeed: 10, 
          windGust: 12, 
          windDirection: 270 
        },
        { 
          time: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
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

  describe('checkSimplifiedAlarmConditions', () => {
    const mockSimplifiedCriteria = {
      minimumAverageSpeed: 15,
      alarmEnabled: true,
      alarmTime: '05:00'
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T05:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle Ecowitt service errors gracefully', async () => {
      const mockCriteria = JSON.stringify(mockSimplifiedCriteria);
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'alarmCriteria') return Promise.resolve(mockCriteria);
        return Promise.resolve(null);
      });

      mockFetchEcowittRealTimeWindData.mockRejectedValue(
        new Error('Ecowitt API error')
      );

      const result = await checkSimplifiedAlarmConditions();

      expect(result.shouldTrigger).toBe(false);
      expect(result.currentSpeed).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('Error checking current conditions');
    });

    it('should handle missing alarm criteria gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await checkSimplifiedAlarmConditions();

      expect(result.shouldTrigger).toBe(false);
      expect(result.currentSpeed).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('Error checking current conditions');
    });

    it('should handle storage errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await checkSimplifiedAlarmConditions();

      expect(result.shouldTrigger).toBe(false);
      expect(result.currentSpeed).toBeNull();
      expect(result.confidence).toBe('low');
      expect(result.reason).toContain('Error checking current conditions');
    });

    it('should return default threshold when criteria missing', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await checkSimplifiedAlarmConditions();

      expect(result.threshold).toBe(10);
    });
  });
});
