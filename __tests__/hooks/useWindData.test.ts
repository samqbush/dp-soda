import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWindData, UseWindDataReturn } from '@/hooks/useWindData';
import {
  analyzeWindData,
  fetchRealWindData,
  fetchWindData,
  getAlarmCriteria,
  getCachedWindData,
  setAlarmCriteria,
  verifyWindConditions,
  type AlarmCriteria,
  type WindAnalysis,
  type WindDataPoint
} from '@/services/windService';
import { clearWindDataCache } from '@/services/storageService';

// Mock all the windService dependencies
jest.mock('@/services/windService', () => ({
  analyzeWindData: jest.fn(),
  fetchRealWindData: jest.fn(),
  fetchWindData: jest.fn(),
  getAlarmCriteria: jest.fn(),
  getCachedWindData: jest.fn(),
  setAlarmCriteria: jest.fn(),
  verifyWindConditions: jest.fn(),
}));

jest.mock('@/services/storageService', () => ({
  clearWindDataCache: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock global setTimeout/clearTimeout to prevent real timers
global.setTimeout = jest.fn().mockImplementation(() => 123) as any; // Return a fake timer ID
global.clearTimeout = jest.fn();

const mockWindService = {
  analyzeWindData: analyzeWindData as jest.MockedFunction<typeof analyzeWindData>,
  fetchRealWindData: fetchRealWindData as jest.MockedFunction<typeof fetchRealWindData>,
  fetchWindData: fetchWindData as jest.MockedFunction<typeof fetchWindData>,
  getAlarmCriteria: getAlarmCriteria as jest.MockedFunction<typeof getAlarmCriteria>,
  getCachedWindData: getCachedWindData as jest.MockedFunction<typeof getCachedWindData>,
  setAlarmCriteria: setAlarmCriteria as jest.MockedFunction<typeof setAlarmCriteria>,
  verifyWindConditions: verifyWindConditions as jest.MockedFunction<typeof verifyWindConditions>,
};

const mockStorageService = {
  clearWindDataCache: clearWindDataCache as jest.MockedFunction<typeof clearWindDataCache>,
};

describe('useWindData Hook Tests', () => {
  const mockAlarmCriteria: AlarmCriteria = {
    minimumAverageSpeed: 15,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    directionDeviationThreshold: 45,
    preferredDirection: 315,
    preferredDirectionRange: 45,
    useWindDirection: true,
    alarmEnabled: false,
    alarmTime: "05:00"
  };

  const mockWindData: WindDataPoint[] = [
    {
      time: "2025-07-04T05:00:00.000Z",
      windSpeed: "20.5",
      windDirection: "315",
      windGust: "25.0"
    },
    {
      time: "2025-07-04T05:15:00.000Z", 
      windSpeed: "22.0",
      windDirection: "320",
      windGust: "27.0"
    }
  ];

  const mockAnalysis: WindAnalysis = {
    isAlarmWorthy: true,
    averageSpeed: 21.25,
    directionConsistency: 85,
    consecutiveGoodPoints: 2,
    analysis: 'excellent'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    // Set up default mock implementations
    mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
    mockWindService.getCachedWindData.mockResolvedValue([]);
    mockWindService.fetchWindData.mockResolvedValue(mockWindData);
    mockWindService.fetchRealWindData.mockResolvedValue(mockWindData);
    mockWindService.analyzeWindData.mockReturnValue(mockAnalysis);
    mockWindService.verifyWindConditions.mockReturnValue(mockAnalysis);
    mockWindService.setAlarmCriteria.mockResolvedValue(undefined);
    mockStorageService.clearWindDataCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Clear all timers after each test to prevent leakage
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default values and start loading', () => {
      const { result } = renderHook(() => useWindData());

      expect(result.current.windData).toEqual([]);
      expect(result.current.analysis).toBeNull();
      expect(result.current.verification).toBeNull();
      expect(result.current.isLoading).toBe(true); // Hook starts loading immediately
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.criteria).toEqual(mockAlarmCriteria); // Default criteria structure
    });

    it('should load initial criteria on mount', async () => {
      renderHook(() => useWindData());

      await waitFor(() => {
        expect(mockWindService.getAlarmCriteria).toHaveBeenCalledTimes(1);
      });
    });

    it('should update criteria state when loaded', async () => {
      const customCriteria = { ...mockAlarmCriteria, minimumAverageSpeed: 20 };
      mockWindService.getAlarmCriteria.mockResolvedValue(customCriteria);

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria.minimumAverageSpeed).toBe(20);
      });
    });
  });

  describe('Data Loading', () => {
    it('should load cached data when loadCachedData is called', async () => {
      mockWindService.getCachedWindData.mockResolvedValue(mockWindData);

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      // Note: The hook auto-loads data on mount, so getCachedWindData may be called multiple times
      expect(mockWindService.getCachedWindData).toHaveBeenCalled();
      
      // Manually call loadCachedData to test the function specifically  
      let loadResult: boolean = false;
      await act(async () => {
        loadResult = await result.current.loadCachedData();
      });

      expect(loadResult).toBe(true);
      expect(result.current.windData).toEqual(mockWindData);
    });

    it('should return false when no cached data exists', async () => {
      // Set up mock to return empty data for the auto-loading, then empty for manual call
      mockWindService.getCachedWindData.mockResolvedValue([]);

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      // Manually call loadCachedData to test the function specifically
      let loadResult: boolean = true;
      await act(async () => {
        loadResult = await result.current.loadCachedData();
      });

      expect(loadResult).toBe(false);
      // Note: windData might still have data from the auto-refresh, so don't test that here
    });

    it('should fetch fresh data when refreshData is called', async () => {
      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      // Clear the calls from auto-loading
      mockWindService.fetchWindData.mockClear();

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockWindService.fetchWindData).toHaveBeenCalledTimes(1);
      expect(result.current.windData).toEqual(mockWindData);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });

    it('should fetch real data when fetchRealData is called', async () => {
      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      await act(async () => {
        await result.current.fetchRealData();
      });

      expect(mockWindService.fetchRealWindData).toHaveBeenCalledTimes(1);
      expect(result.current.windData).toEqual(mockWindData);
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Data Analysis', () => {
    it('should analyze wind data when data is loaded', async () => {
      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      await act(async () => {
        await result.current.refreshData();
      });

      expect(mockWindService.analyzeWindData).toHaveBeenCalledWith(mockWindData, mockAlarmCriteria);
      expect(mockWindService.verifyWindConditions).toHaveBeenCalledWith(mockWindData, mockAlarmCriteria);
      expect(result.current.analysis).toEqual(mockAnalysis);
      expect(result.current.verification).toEqual(mockAnalysis);
    });

    it('should re-analyze data when criteria changes', async () => {
      const { result } = renderHook(() => useWindData());

      // Wait for initial load and get some data
      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      await act(async () => {
        await result.current.refreshData();
      });

      // Change criteria
      const newCriteria = { minimumAverageSpeed: 25 };
      const updatedCriteria = { ...mockAlarmCriteria, ...newCriteria };
      mockWindService.getAlarmCriteria.mockResolvedValue(updatedCriteria);

      await act(async () => {
        await result.current.setCriteria(newCriteria);
      });

      expect(mockWindService.setAlarmCriteria).toHaveBeenCalledWith(newCriteria);
      expect(mockWindService.getAlarmCriteria).toHaveBeenCalledTimes(2); // Initial + after setCriteria
      // Should re-analyze with new criteria
      expect(mockWindService.analyzeWindData).toHaveBeenCalledWith(mockWindData, updatedCriteria);
    });
  });

  describe('Loading States', () => {
    it('should show loading state during data refresh', async () => {
      let resolveLoadData: () => void;
      mockWindService.fetchWindData.mockImplementation(() => {
        return new Promise<WindDataPoint[]>((resolve) => {
          resolveLoadData = () => resolve(mockWindData);
        });
      });

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      // Start loading
      act(() => {
        result.current.refreshData();
      });

      expect(result.current.isLoading).toBe(true);

      // Complete loading
      await act(async () => {
        resolveLoadData();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should show loading state during cached data load', async () => {
      let resolveLoadData: () => void;
      mockWindService.getCachedWindData.mockImplementation(() => {
        return new Promise<WindDataPoint[]>((resolve) => {
          resolveLoadData = () => resolve(mockWindData);
        });
      });

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      // Start loading
      act(() => {
        result.current.loadCachedData();
      });

      expect(result.current.isLoading).toBe(true);

      // Complete loading
      await act(async () => {
        resolveLoadData();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle criteria loading errors', async () => {
      mockWindService.getAlarmCriteria.mockRejectedValue(new Error('Criteria load failed'));

      const { result } = renderHook(() => useWindData());

      // Should still initialize with default criteria
      expect(result.current.criteria).toBeDefined();
      expect(result.current.criteria.minimumAverageSpeed).toBe(15); // Default value
    });

    it('should handle setCriteria errors', async () => {
      const mockError = new Error('Failed to set criteria');
      mockWindService.setAlarmCriteria.mockRejectedValue(mockError);

      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      await act(async () => {
        await result.current.setCriteria({ minimumAverageSpeed: 25 });
      });

      expect(result.current.error).toBe('Failed to update alarm criteria');
    });
  });

  describe('Hook Interface', () => {
    it('should return correct interface structure', async () => {
      const { result } = renderHook(() => useWindData());

      await waitFor(() => {
        expect(result.current.criteria).toBeDefined();
      });

      const hookResult = result.current;

      // Check all required properties exist
      expect(hookResult).toHaveProperty('windData');
      expect(hookResult).toHaveProperty('analysis');
      expect(hookResult).toHaveProperty('verification');
      expect(hookResult).toHaveProperty('isLoading');
      expect(hookResult).toHaveProperty('error');
      expect(hookResult).toHaveProperty('lastUpdated');
      expect(hookResult).toHaveProperty('criteria');
      expect(hookResult).toHaveProperty('setCriteria');
      expect(hookResult).toHaveProperty('refreshData');
      expect(hookResult).toHaveProperty('fetchRealData');
      expect(hookResult).toHaveProperty('loadCachedData');

      // Check types
      expect(Array.isArray(hookResult.windData)).toBe(true);
      expect(typeof hookResult.isLoading).toBe('boolean');
      expect(typeof hookResult.setCriteria).toBe('function');
      expect(typeof hookResult.refreshData).toBe('function');
      expect(typeof hookResult.fetchRealData).toBe('function');
      expect(typeof hookResult.loadCachedData).toBe('function');
    });
  });

  describe('Additional Error Path Coverage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
      mockWindService.getCachedWindData.mockResolvedValue([]);
      mockWindService.fetchWindData.mockResolvedValue(mockWindData);
      mockWindService.analyzeWindData.mockReturnValue(mockAnalysis);
      mockWindService.verifyWindConditions.mockReturnValue(mockAnalysis);
    });

    describe('loadCachedData error handling', () => {
      it('should handle errors when loading cached data', async () => {
        const cacheError = new Error('Cache loading failed');
        mockWindService.getCachedWindData.mockRejectedValue(cacheError);
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        // Wait for initial load
        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        // Call loadCachedData manually
        let loadResult: boolean;
        await act(async () => {
          loadResult = await result.current.loadCachedData();
        });

        await waitFor(() => {
          expect(loadResult!).toBe(false);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading cached data:', cacheError);
          expect(result.current.error).toBe('Failed to load cached wind data');
          expect(result.current.isLoading).toBe(false);
        });

        consoleErrorSpy.mockRestore();
      });
    });

    describe('refreshData error handling', () => {
      it('should handle cache clear failure when detecting corrupted cache', async () => {
        const parseError = new Error('parse error in cache');
        const clearCacheError = new Error('Failed to clear cache');
        
        mockWindService.fetchWindData.mockRejectedValue(parseError);
        mockStorageService.clearWindDataCache.mockRejectedValue(clearCacheError);
        mockWindService.getCachedWindData.mockResolvedValue([]);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        await act(async () => {
          await result.current.refreshData();
        });

        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Possible corrupted cache detected, clearing cache...');
          expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Failed to clear cache:', clearCacheError);
          expect(mockStorageService.clearWindDataCache).toHaveBeenCalled();
        });

        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });

    });

    describe('fetchRealData error handling', () => {
      it('should handle fetchRealWindData errors', async () => {
        const realDataError = new Error('Real data fetch failed');
        mockWindService.fetchRealWindData.mockRejectedValue(realDataError);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        await act(async () => {
          await result.current.fetchRealData();
        });

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching real wind data:', realDataError);
          expect(result.current.error).toBe('Real data fetch failed');
          expect(result.current.isLoading).toBe(false);
        });

        consoleErrorSpy.mockRestore();
      });

      it('should handle non-Error objects in fetchRealData', async () => {
        mockWindService.fetchRealWindData.mockRejectedValue('Non-error object');

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        await act(async () => {
          await result.current.fetchRealData();
        });

        await waitFor(() => {
          expect(result.current.error).toBe('Failed to fetch real wind data');
          expect(result.current.isLoading).toBe(false);
        });
      });
    });

    describe('Initialization timeout coverage', () => {
      it('should handle timeout scenario during initialization', async () => {
        // Mock a slow loadCachedData that will trigger timeout
        let resolveLoadCached: ((value: boolean) => void) | undefined;
        const slowLoadPromise = new Promise<boolean>(resolve => {
          resolveLoadCached = resolve;
        });
        
        mockWindService.getCachedWindData.mockImplementation(() => slowLoadPromise as any);
        
        // Mock a slow refreshData that will trigger timeout
        let resolveRefresh: (() => void) | undefined;
        const slowRefreshPromise = new Promise<void>(resolve => {
          resolveRefresh = resolve;
        });
        
        mockWindService.fetchWindData.mockImplementation(() => slowRefreshPromise as any);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        try {
          const { result } = renderHook(() => useWindData());

          await waitFor(() => {
            expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
          }, { timeout: 1000 });
        } finally {
          // Clean up spies
          consoleWarnSpy.mockRestore();
          
          // Ensure promises are resolved to prevent hanging
          if (resolveLoadCached) {
            resolveLoadCached(false);
          }
          if (resolveRefresh) {
            resolveRefresh();
          }
        }
      });
    });

    describe('Platform-specific behavior coverage', () => {
      it('should log platform information during refresh', async () => {
        const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        
        mockWindService.fetchWindData.mockResolvedValue(mockWindData);
        mockWindService.analyzeWindData.mockReturnValue(mockAnalysis);
        mockWindService.verifyWindConditions.mockReturnValue(mockAnalysis);

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        await act(async () => {
          await result.current.refreshData();
        });

        await waitFor(() => {
          expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('🔄 Refreshing data (Platform: ios')
          );
        });

        consoleLogSpy.mockRestore();
      });
    });

    describe('Initialization timeout and fatal error handling', () => {
      let originalSetTimeout: typeof global.setTimeout;
      let originalClearTimeout: typeof global.clearTimeout;
      let mockSetTimeoutSpy: jest.SpyInstance;
      let mockClearTimeoutSpy: jest.SpyInstance;
      
      beforeEach(() => {
        // Store originals
        originalSetTimeout = global.setTimeout;
        originalClearTimeout = global.clearTimeout;
        
        jest.useFakeTimers();
        
        // Create controlled spies
        mockSetTimeoutSpy = jest.spyOn(global, 'setTimeout');
        mockClearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      });

      afterEach(() => {
        // Clean up spies first
        mockSetTimeoutSpy.mockRestore();
        mockClearTimeoutSpy.mockRestore();
        
        // Restore real timers
        jest.useRealTimers();
        
        // Restore original functions
        global.setTimeout = originalSetTimeout;
        global.clearTimeout = originalClearTimeout;
        
        // Clear all timers to prevent leakage
        jest.clearAllTimers();
      });

      it('should handle initialization timeout on iOS', async () => {
        // Mock Platform.OS to be iOS
        const mockPlatform = require('react-native').Platform;
        const originalOS = mockPlatform.OS;
        mockPlatform.OS = 'ios';

        // Create a timeout callback that we can control
        let timeoutCallback: (() => void) | undefined;
        mockSetTimeoutSpy.mockImplementation((callback: () => void, delay: number) => {
          timeoutCallback = callback;
          return 123;
        });

        // Mock slow operations that won't resolve before timeout
        let resolveLoad: ((value: boolean) => void) | undefined;
        const slowLoadPromise = new Promise<boolean>(resolve => {
          resolveLoad = resolve;
        });
        
        mockWindService.getCachedWindData.mockImplementation(() => slowLoadPromise as any);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const { result } = renderHook(() => useWindData());

        // Manually trigger the timeout callback to simulate timeout
        if (timeoutCallback) {
          act(() => {
            timeoutCallback!();
          });
        }

        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Wind data initialization timeout - setting error state');
          expect(result.current.error).toBe('Unable to load wind data. Please check your connection and try refreshing.');
          expect(result.current.isLoading).toBe(false);
        });

        // Clean up - resolve promise to prevent hanging
        if (resolveLoad) {
          act(() => {
            resolveLoad!(false);
          });
        }
        
        // Restore platform
        mockPlatform.OS = originalOS;
        consoleWarnSpy.mockRestore();
      });

      it('should handle initialization timeout on Android', async () => {
        // Mock Platform.OS to be Android
        const mockPlatform = require('react-native').Platform;
        const originalOS = mockPlatform.OS;
        mockPlatform.OS = 'android';

        // Create a timeout callback that we can control
        let timeoutCallback: (() => void) | undefined;
        mockSetTimeoutSpy.mockImplementation((callback: () => void, delay: number) => {
          timeoutCallback = callback;
          return 123;
        });

        // Mock slow operations that won't resolve before timeout
        let resolveLoad: ((value: boolean) => void) | undefined;
        const slowLoadPromise = new Promise<boolean>(resolve => {
          resolveLoad = resolve;
        });
        
        mockWindService.getCachedWindData.mockImplementation(() => slowLoadPromise as any);

        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

        const { result } = renderHook(() => useWindData());

        // Manually trigger the timeout callback to simulate timeout
        if (timeoutCallback) {
          act(() => {
            timeoutCallback!();
          });
        }

        await waitFor(() => {
          expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Wind data initialization timeout - setting error state');
          expect(result.current.error).toBe('Unable to load wind data. Please check your connection and try refreshing.');
          expect(result.current.isLoading).toBe(false);
        });

        // Clean up - resolve promise to prevent hanging
        if (resolveLoad) {
          act(() => {
            resolveLoad!(false);
          });
        }
        
        // Restore platform
        mockPlatform.OS = originalOS;
        consoleWarnSpy.mockRestore();
      });

      it('should handle fatal error during initialization', async () => {
        // Mock getAlarmCriteria to succeed but then throw an error at the beginning of the outer try block
        mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
        
        // Mock setTimeout to throw an error to trigger the outer catch block
        mockSetTimeoutSpy.mockImplementation(() => {
          throw new Error('Fatal initialization error');
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('💥 Fatal error during data initialization:', expect.any(Error));
          expect(result.current.error).toBe('Fatal initialization error');
          expect(result.current.isLoading).toBe(false);
        });

        consoleErrorSpy.mockRestore();
      });

      it('should handle non-Error object during fatal initialization error', async () => {
        // Mock getAlarmCriteria to succeed but then throw a non-Error object
        mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
        
        // Mock setTimeout to throw a non-Error object to trigger the outer catch block
        mockSetTimeoutSpy.mockImplementation(() => {
          throw 'Non-error string';
        });

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(consoleErrorSpy).toHaveBeenCalledWith('💥 Fatal error during data initialization:', 'Non-error string');
          expect(result.current.error).toBe('Failed to initialize wind data');
          expect(result.current.isLoading).toBe(false);
        });

        consoleErrorSpy.mockRestore();
      });

      it('should clear timeout when data loads successfully before timeout', async () => {
        // Mock successful fast operations
        mockWindService.getCachedWindData.mockResolvedValue([]);
        mockWindService.fetchWindData.mockResolvedValue([]);

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // Verify timeout was cleared
        expect(mockClearTimeoutSpy).toHaveBeenCalled();
      });
    });

    describe('Cached data loaded but refresh fails scenario', () => {
      it('should handle case where cached data loads successfully but refresh fails', async () => {
        // Mock cached data loading successfully
        mockWindService.getCachedWindData.mockResolvedValue(mockWindData);
        
        // Mock refresh failing
        const refreshError = new Error('Refresh failed after cache loaded');
        mockWindService.fetchWindData.mockRejectedValue(refreshError);

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        const { result } = renderHook(() => useWindData());

        await waitFor(() => {
          expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
        });

        // Wait for the initialization to complete
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // The error should be logged but not set to state since cached data was loaded
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error refreshing wind data:', refreshError);
        
        // Since cached data was loaded successfully, there should be no error state
        expect(result.current.error).toBe(null);
        expect(result.current.windData).toEqual(mockWindData);

        consoleErrorSpy.mockRestore();
      });
    });

    describe('Fatal error handling', () => {
      it('should handle errors and set appropriate error state', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const fatalError = new Error('Fatal initialization error');
        
        // Mock all data sources to fail
        mockWindService.getCachedWindData.mockRejectedValue(fatalError);
        mockWindService.fetchWindData.mockRejectedValue(fatalError);
        mockWindService.fetchRealWindData.mockRejectedValue(fatalError);
        mockWindService.getAlarmCriteria.mockRejectedValue(fatalError);
        
        const { result } = renderHook(() => useWindData());
        
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
        
        // Should have some error set
        expect(result.current.error).toBeTruthy();
        expect(consoleErrorSpy).toHaveBeenCalled();
        
        consoleErrorSpy.mockRestore();
      });

      it('should clear timeout when data loading encounters errors', async () => {
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        
        // Mock some services to fail
        mockWindService.getCachedWindData.mockRejectedValue(new Error('Cache error'));
        
        const { result } = renderHook(() => useWindData());
        
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
        
        // Timeout should be cleared when data loading completes
        expect(clearTimeoutSpy).toHaveBeenCalled();
        
        clearTimeoutSpy.mockRestore();
      });
    });
  });
});
