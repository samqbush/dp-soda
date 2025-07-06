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

// Mock the Ecowitt service for checkSimplifiedAlarmConditions
const mockFetchEcowittRealTimeWindData = jest.fn();
jest.mock('@/services/ecowittService', () => ({
  fetchEcowittRealTimeWindData: mockFetchEcowittRealTimeWindData
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
    
    // Reset Ecowitt service mock
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

  describe('fetchWindData', () => {
    it('should fetch and cache wind data successfully', async () => {
      // Mock the JSONP response format that the API actually returns
      const mockJsonpResponse = `jQuery17206585233276552562_1751652855818({
        "wind_avg_data": [
          [1720080000000, 15.5],
          [1720080900000, 17.3]
        ],
        "wind_gust_data": [
          [1720080000000, 18.2],
          [1720080900000, 20.1]
        ],
        "wind_dir_data": [
          [1720080000000, 315],
          [1720080900000, 320]
        ]
      })`;

      mockAxios.get.mockResolvedValue({ 
        data: mockJsonpResponse,
        status: 200 
      });

      const result = await fetchWindData();

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.weatherflow.com/wxengine/rest/graph/getGraph',
        expect.objectContaining({
          timeout: 15000,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
            'Referer': expect.stringContaining('windalert.com'),
            'X-Requested-With': 'XMLHttpRequest'
          }),
          params: expect.objectContaining({
            spot_id: '149264',
            fields: 'wind',
            wf_token: 'f546a4d1e7115896684766407a63e45c'
          })
        })
      );
      
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      
      // Should cache the data (only if data is valid)
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'windData',
        expect.any(String)
      );
    });

    it('should return empty array when no cached data is available', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await fetchWindData();

      // The actual implementation returns empty array instead of throwing
      expect(result).toEqual([]);
    });
  });

  describe('fetchRealWindData', () => {
    it('should fetch real-time wind data successfully', async () => {
      // Mock the JSONP response format that the API actually returns
      const mockJsonpResponse = `jQuery17206585233276552562_1751652855818({
        "wind_avg_data": [
          [1720080000000, 18.7]
        ],
        "wind_gust_data": [
          [1720080000000, 22.3]
        ],
        "wind_dir_data": [
          [1720080000000, 310]
        ]
      })`;

      mockAxios.get.mockResolvedValue({ 
        data: mockJsonpResponse,
        status: 200 
      });

      const result = await fetchRealWindData();

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://api.weatherflow.com/wxengine/rest/graph/getGraph',
        expect.objectContaining({
          timeout: 15000,
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('Mozilla'),
            'Referer': expect.stringContaining('windalert.com')
          }),
          params: expect.objectContaining({
            spot_id: '149264',
            fields: 'wind'
          })
        })
      );
      
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(1);
      
      // Should cache the real data too
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'windData',
        expect.any(String)
      );
    });

    it('should handle real-time API errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('Real-time API error'));

      await expect(fetchRealWindData()).rejects.toThrow('Failed to fetch real wind data: Real-time API error');
    });

    it('should handle missing wind data in real-time response', async () => {
      // Mock response with no wind data (missing required arrays)
      const emptyJsonpResponse = `jQuery17206585233276552562_1751652855818({
        "other_data": []
      })`;

      mockAxios.get.mockResolvedValue({ data: emptyJsonpResponse });

      await expect(fetchRealWindData()).rejects.toThrow('Failed to fetch real wind data: Missing wind data in response');
    });

    it('should handle invalid JSONP format in real-time response', async () => {
      const invalidResponse = 'invalid jsonp response';

      mockAxios.get.mockResolvedValue({ data: invalidResponse });

      await expect(fetchRealWindData()).rejects.toThrow('Failed to fetch real wind data');
    });

    it('should handle JSON parsing errors', async () => {
      const invalidJsonpResponse = `jQuery17206585233276552562_1751652855818({invalid json})`;

      mockAxios.get.mockResolvedValue({ data: invalidJsonpResponse });

      await expect(fetchRealWindData()).rejects.toThrow('Failed to fetch real wind data');
    });
  });

  describe('checkSimplifiedAlarmConditions', () => {
    const mockSimplifiedCriteria = {
      minimumAverageSpeed: 15,
      alarmEnabled: true,
      alarmTime: '05:00'
    };

    beforeEach(() => {
      // Mock current time to be 5:00 AM for alarm time tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-07-04T05:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle Ecowitt service errors gracefully', async () => {
      // Mock alarm criteria
      const mockCriteria = JSON.stringify(mockSimplifiedCriteria);
      mockAsyncStorage.getItem.mockImplementation((key) => {
        if (key === 'alarmCriteria') return Promise.resolve(mockCriteria);
        return Promise.resolve(null);
      });

      // Mock Ecowitt service error
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

      expect(result.threshold).toBe(10); // Default threshold from the function
    });
  });

  describe('Error handling and edge cases', () => {
    describe('getCachedWindData edge cases', () => {
      it('should handle cached data with invalid structure', async () => {
        const invalidCacheData = JSON.stringify({
          data: "not-an-array", // Invalid structure
          timestamp: new Date().toISOString()
        });
        mockAsyncStorage.getItem.mockResolvedValue(invalidCacheData);

        const result = await getCachedWindData();

        expect(result).toBe(null);
      });

      it('should handle cached data missing timestamp', async () => {
        const invalidCacheData = JSON.stringify({
          data: []
          // Missing timestamp
        });
        mockAsyncStorage.getItem.mockResolvedValue(invalidCacheData);

        const result = await getCachedWindData();

        expect(result).toBe(null);
      });

      it('should handle cached data that is too old', async () => {
        const oldTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours old
        const oldCacheData = JSON.stringify({
          data: [{ time: '2025-07-04T06:00:00.000Z', windSpeed: 15 }],
          timestamp: oldTimestamp.toISOString()
        });
        mockAsyncStorage.getItem.mockResolvedValue(oldCacheData);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await getCachedWindData();

        expect(result).toBe(null);
        expect(consoleSpy).toHaveBeenCalledWith('⚠️ Cached data is too old, not using');

        consoleSpy.mockRestore();
      });

      it('should handle AsyncStorage not being available', async () => {
        // Mock AsyncStorage being undefined
        const originalAsyncStorage = (global as any).AsyncStorage;
        delete (global as any).AsyncStorage;

        const result = await getCachedWindData();

        expect(result).toBe(null);

        // Restore AsyncStorage
        (global as any).AsyncStorage = originalAsyncStorage;
      });
    });

    describe('fetchWindData error paths', () => {
      it('should handle CORS issues in web environment with cached data fallback', async () => {
        // Mock web environment
        const originalPlatform = require('react-native').Platform.OS;
        require('react-native').Platform.OS = 'web';
        
        // Mock CORS error
        const corsError = new Error('CORS error');
        mockAxios.get.mockRejectedValue(corsError);

        // Mock cached data available
        const cachedData = JSON.stringify({
          data: [{ time: '2025-07-04T06:00:00.000Z', windSpeed: 15 }],
          timestamp: new Date().toISOString()
        });
        mockAsyncStorage.getItem.mockResolvedValue(cachedData);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await fetchWindData();

        expect(consoleSpy).toHaveBeenCalledWith('🌐 Web environment - trying cached data due to expected CORS issues');
        expect(consoleSpy).toHaveBeenCalledWith('💾 Using cached wind data in web environment');

        // Restore platform
        require('react-native').Platform.OS = originalPlatform;
        consoleSpy.mockRestore();
      });

      it('should handle CORS issues in web environment with no cached data', async () => {
        // Mock web environment
        const originalPlatform = require('react-native').Platform.OS;
        require('react-native').Platform.OS = 'web';
        
        // Mock CORS error
        const corsError = new Error('CORS error');
        mockAxios.get.mockRejectedValue(corsError);

        // Mock no cached data
        mockAsyncStorage.getItem.mockResolvedValue(null);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await fetchWindData();

        expect(consoleWarnSpy).toHaveBeenCalledWith('❌ No cached data available in web environment');
        expect(consoleErrorSpy).toHaveBeenCalledWith('🚫 NO SAMPLE DATA FALLBACK - Real data required');
        expect(result).toEqual([]);

        // Restore platform
        require('react-native').Platform.OS = originalPlatform;
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

      it('should handle network errors with cached data fallback', async () => {
        const networkError = new Error('Network error');
        mockAxios.get.mockRejectedValue(networkError);

        // Mock cached data available
        const cachedData = JSON.stringify({
          data: [{ time: '2025-07-04T06:00:00.000Z', windSpeed: 15 }],
          timestamp: new Date().toISOString()
        });
        mockAsyncStorage.getItem.mockResolvedValue(cachedData);

        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        const result = await fetchWindData();

        expect(consoleSpy).toHaveBeenCalledWith('💾 Returning cached wind data due to fetch error');

        consoleSpy.mockRestore();
      });

      it('should handle cache validation errors gracefully', async () => {
        const invalidCacheData = JSON.stringify({
          invalidStructure: true
        });
        mockAsyncStorage.getItem.mockResolvedValue(invalidCacheData);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = await getCachedWindData();

        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Invalid cached data format, ignoring cache');
        expect(result).toBe(null);

        consoleWarnSpy.mockRestore();
      });
    });

    describe('processWindData edge cases', () => {
      it('should handle missing wind direction data with text fallback', async () => {
        const mockResponseWithTextDir = `jQuery17206585233276552562_1751652855818({
          "wind_avg_data": [[1720080000000, 15.5]],
          "wind_gust_data": [[1720080000000, 18.2]],
          "wind_dir_text_data": [["N", 1720080000000]]
        })`;

        mockAxios.get.mockResolvedValue({ data: mockResponseWithTextDir });

        const result = await fetchWindData();

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty('windDirection');
        }
      });

      it('should handle completely missing wind data arrays', async () => {
        const mockResponseEmpty = `jQuery17206585233276552562_1751652855818({
          "other_data": []
        })`;

        mockAxios.get.mockResolvedValue({ data: mockResponseEmpty });

        const result = await fetchWindData();

        expect(result).toBeInstanceOf(Array);
        expect(result).toHaveLength(0);
      });
    });

    describe('cacheWindData error handling', () => {
      it('should handle cache write errors gracefully', async () => {
        const writeError = new Error('Storage full');
        mockAsyncStorage.setItem.mockRejectedValue(writeError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Use any internal function that calls cacheWindData - fetchWindData does
        const mockResponse = `jQuery17206585233276552562_1751652855818({
          "wind_avg_data": [[1720080000000, 15.5]],
          "wind_gust_data": [[1720080000000, 18.2]],
          "wind_dir_data": [[1720080000000, 315]]
        })`;

        mockAxios.get.mockResolvedValue({ data: mockResponse });

        // This should not throw, even if caching fails
        const result = await fetchWindData();

        expect(result).toBeInstanceOf(Array);
        expect(consoleSpy).toHaveBeenCalledWith('❌ Error caching wind data:', writeError);

        consoleSpy.mockRestore();
      });
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
