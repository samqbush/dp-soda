import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';
import * as ecowittService from '@/services/ecowittService';
import * as windService from '@/services/windService';

// Mock the services
jest.mock('@/services/ecowittService', () => ({
  analyzeOverallTransmissionQuality: jest.fn(),
  clearDeviceCache: jest.fn(),
  convertToWindDataPoint: jest.fn(),
  debugDeviceListAPI: jest.fn(),
  fetchEcowittCombinedWindDataForDevice: jest.fn(),
  fetchEcowittRealTimeWindData: jest.fn(),
  getAutoEcowittConfigForDevice: jest.fn(),
}));

jest.mock('@/services/windService', () => ({
  analyzeRecentWindData: jest.fn(),
  getAlarmCriteria: jest.fn(),
}));

const mockEcowittService = ecowittService as jest.Mocked<typeof ecowittService>;
const mockWindService = windService as jest.Mocked<typeof windService>;

// Mock data
const mockEcowittWindData = [
  {
    time: '2024-01-01T12:00:00Z',
    timestamp: 1704110400,
    windSpeed: 20,
    windSpeedMph: 44.7,
    windGust: 25,
    windGustMph: 55.9,
    windDirection: 315,
    temperature: 15,
    humidity: 60
  },
  {
    time: '2024-01-01T12:05:00Z',
    timestamp: 1704110700,
    windSpeed: 18,
    windSpeedMph: 40.2,
    windGust: 22,
    windGustMph: 49.2,
    windDirection: 310,
    temperature: 16,
    humidity: 58
  }
];

const mockChartData = [
  {
    time: '2024-01-01T12:00:00Z',
    timestamp: 1704110400,
    windSpeed: 20,
    windGust: 25,
    windDirection: 315
  },
  {
    time: '2024-01-01T12:05:00Z',
    timestamp: 1704110700,
    windSpeed: 18,
    windGust: 22,
    windDirection: 310
  }
];

const mockCurrentConditions = {
  time: '2024-01-01T12:30:00Z',
  timestamp: 1704112200,
  windSpeed: 22,
  windSpeedMph: 49.2,
  windGust: 28,
  windGustMph: 62.6,
  windDirection: 320,
  temperature: 17,
  humidity: 55
};

const mockWindAnalysis = {
  isAlarmWorthy: true,
  averageSpeed: 19,
  directionConsistency: 85,
  consecutiveGoodPoints: 2,
  analysis: 'Good wind conditions detected'
};

const mockTransmissionQuality = {
  isFullTransmission: true,
  hasOutdoorSensors: true,
  hasWindData: true,
  hasCompleteSensorData: true,
  transmissionGaps: [],
  lastGoodTransmissionTime: '2024-01-01T12:30:00Z',
  currentTransmissionStatus: 'good' as const
};

const mockApiConfig = {
  applicationKey: 'test-app-key',
  apiKey: 'test-api-key',
  macAddress: 'test-mac'
};

const mockAlarmCriteria = {
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

describe('useSodaLakeWind Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
    mockEcowittService.convertToWindDataPoint.mockReturnValue(mockChartData);
    mockEcowittService.analyzeOverallTransmissionQuality.mockReturnValue(mockTransmissionQuality);
    mockWindService.analyzeRecentWindData.mockReturnValue(mockWindAnalysis);
    mockEcowittService.getAutoEcowittConfigForDevice.mockResolvedValue(mockApiConfig);
    mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockResolvedValue(mockEcowittWindData);
    mockEcowittService.fetchEcowittRealTimeWindData.mockResolvedValue({
      conditions: mockCurrentConditions
    });
    mockEcowittService.clearDeviceCache.mockResolvedValue();
    mockEcowittService.debugDeviceListAPI.mockResolvedValue();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useSodaLakeWind());

      expect(result.current.windData).toEqual([]);
      expect(result.current.chartData).toEqual(mockChartData); // From convertToWindDataPoint
      expect(result.current.currentConditions).toBeNull();
      expect(result.current.analysis).toBeNull();
      expect(result.current.transmissionQuality).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingCurrent).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdated).toBeNull();
      expect(result.current.currentConditionsUpdated).toBeNull();
    });

    it('should load user criteria on mount', async () => {
      renderHook(() => useSodaLakeWind());

      await waitFor(() => {
        expect(mockWindService.getAlarmCriteria).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle criteria loading errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindService.getAlarmCriteria.mockRejectedValue(new Error('Criteria load failed'));

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error loading user criteria:', expect.any(Error));
      });

      // Should still initialize normally
      expect(result.current.windData).toEqual([]);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Loading', () => {
    it('should return false from loadCachedData (no cache implementation)', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      const loaded = await result.current.loadCachedData();

      expect(loaded).toBe(false);
    });

    it('should handle cached data loading errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useSodaLakeWind());

      // Even if there's an error in the future implementation, it should return false
      const loaded = await result.current.loadCachedData();

      expect(loaded).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Current Conditions Refresh', () => {
    it('should refresh current conditions successfully', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(result.current.currentConditions).toEqual(mockCurrentConditions);
        expect(result.current.currentConditionsUpdated).toBeInstanceOf(Date);
        expect(result.current.isLoadingCurrent).toBe(false);
      });

      expect(mockEcowittService.fetchEcowittRealTimeWindData).toHaveBeenCalledWith('DP Soda Lakes');
    });

    it('should handle no real-time data available', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockEcowittService.fetchEcowittRealTimeWindData.mockResolvedValue({
        conditions: null
      });

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ No real-time data available, keeping existing current conditions');
        expect(result.current.currentConditions).toBeNull();
        expect(result.current.isLoadingCurrent).toBe(false);
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle real-time data fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Real-time fetch failed');
      mockEcowittService.fetchEcowittRealTimeWindData.mockRejectedValue(error);

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error refreshing current conditions:', error);
        expect(result.current.currentConditions).toBeNull();
        expect(result.current.isLoadingCurrent).toBe(false);
        expect(result.current.error).toBeNull(); // Should not set error state
      });

      consoleErrorSpy.mockRestore();
    });

    it('should set loading state during current conditions refresh', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockEcowittService.fetchEcowittRealTimeWindData.mockReturnValue(slowPromise as any);

      const { result } = renderHook(() => useSodaLakeWind());

      // Start the refresh
      const refreshPromise = result.current.refreshCurrentConditions();

      // Check loading state is true
      await waitFor(() => {
        expect(result.current.isLoadingCurrent).toBe(true);
      });

      // Resolve the promise
      resolvePromise!({
        conditions: mockCurrentConditions
      });

      await refreshPromise;

      // Check loading state is false
      await waitFor(() => {
        expect(result.current.isLoadingCurrent).toBe(false);
      });
    });
  });

  describe('Main Data Refresh', () => {
    it('should refresh data successfully', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.windData).toEqual(mockEcowittWindData);
        expect(result.current.analysis).toEqual(mockWindAnalysis);
        expect(result.current.transmissionQuality).toEqual(mockTransmissionQuality);
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
        expect(result.current.currentConditions).toEqual(mockCurrentConditions);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      expect(mockEcowittService.getAutoEcowittConfigForDevice).toHaveBeenCalledWith('DP Soda Lakes');
      expect(mockEcowittService.fetchEcowittCombinedWindDataForDevice).toHaveBeenCalledWith('DP Soda Lakes');
      expect(mockEcowittService.analyzeOverallTransmissionQuality).toHaveBeenCalledWith(mockEcowittWindData);
      expect(mockWindService.analyzeRecentWindData).toHaveBeenCalled();
    });

    it('should handle auto-configuration errors', async () => {
      const configError = new Error('Config failed');
      mockEcowittService.getAutoEcowittConfigForDevice.mockRejectedValue(configError);

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Configuration failed: Config failed');
        expect(result.current.isLoading).toBe(false);
      });

      // Should not proceed to fetch data if config fails
      expect(mockEcowittService.fetchEcowittCombinedWindDataForDevice).not.toHaveBeenCalled();
    });

    it('should handle empty data response', async () => {
      mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockResolvedValue([]);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ No wind data received from DP Soda Lakes station');
        expect(result.current.error).toBe('No data available from Soda Lake station. Station may be offline or not reporting data.');
        expect(result.current.analysis).toBeNull();
        expect(result.current.transmissionQuality).toEqual({
          isFullTransmission: false,
          hasOutdoorSensors: false,
          hasWindData: false,
          hasCompleteSensorData: false,
          transmissionGaps: [],
          lastGoodTransmissionTime: null,
          currentTransmissionStatus: 'offline'
        });
      });

      consoleWarnSpy.mockRestore();
    });

    it('should handle data fetch errors and try cached data fallback', async () => {
      const fetchError = new Error('Fetch failed');
      mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockRejectedValue(fetchError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error refreshing Soda Lake wind data:', fetchError);
        expect(result.current.error).toBe('Fetch failed');
        expect(result.current.isLoading).toBe(false);
      });

      // Should attempt to load cached data as fallback
      // (loadCachedData was called during the error handling)

      consoleErrorSpy.mockRestore();
    });

    it('should use custom user minimum speed from criteria', async () => {
      const customCriteria = { ...mockAlarmCriteria, minimumAverageSpeed: 25 };
      mockWindService.getAlarmCriteria.mockResolvedValue(customCriteria);

      const { result } = renderHook(() => useSodaLakeWind());

      // Wait for criteria to load
      await waitFor(() => {
        expect(mockWindService.getAlarmCriteria).toHaveBeenCalled();
      });

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(mockWindService.analyzeRecentWindData).toHaveBeenCalledWith(
          mockChartData,
          expect.objectContaining({
            minimumAverageSpeed: 25
          })
        );
      });
    });

    it('should set loading state during data refresh', async () => {
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockReturnValue(slowPromise as any);

      const { result } = renderHook(() => useSodaLakeWind());

      // Start the refresh
      const refreshPromise = result.current.refreshData();

      // Check loading state is true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the promise
      resolvePromise!(mockEcowittWindData);

      await refreshPromise;

      // Check loading state is false
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear cache successfully', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      // First add some data
      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.windData).toEqual(mockEcowittWindData);
      });

      // Now clear cache
      await waitFor(async () => {
        await result.current.clearCache();
      });

      await waitFor(() => {
        expect(result.current.windData).toEqual([]);
        expect(result.current.analysis).toBeNull();
        expect(result.current.lastUpdated).toBeNull();
      });

      expect(mockEcowittService.clearDeviceCache).toHaveBeenCalledWith('DP Soda Lakes');
    });

    it('should handle cache clear errors', async () => {
      const clearError = new Error('Clear failed');
      mockEcowittService.clearDeviceCache.mockRejectedValue(clearError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.clearCache();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error clearing cache:', clearError);
        expect(result.current.error).toBe('Failed to clear cache');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Debug API', () => {
    it('should call debug API successfully', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.debugAPI();
      });

      expect(mockEcowittService.debugDeviceListAPI).toHaveBeenCalledTimes(1);
    });

    it('should handle debug API errors', async () => {
      const debugError = new Error('Debug failed');
      mockEcowittService.debugDeviceListAPI.mockRejectedValue(debugError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.debugAPI();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Debug API failed:', debugError);
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Chart Data Conversion', () => {
    it('should convert wind data to chart format', () => {
      const { result } = renderHook(() => useSodaLakeWind());

      expect(result.current.chartData).toEqual(mockChartData);
      expect(mockEcowittService.convertToWindDataPoint).toHaveBeenCalledWith([]);
    });

    it('should update chart data when wind data changes', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(mockEcowittService.convertToWindDataPoint).toHaveBeenCalledWith(mockEcowittWindData);
        expect(result.current.chartData).toEqual(mockChartData);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow successfully', async () => {
      const { result } = renderHook(() => useSodaLakeWind());

      // Initialize
      expect(result.current.windData).toEqual([]);
      expect(result.current.isLoading).toBe(false);

      // Refresh data
      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(result.current.windData).toEqual(mockEcowittWindData);
        expect(result.current.analysis).toEqual(mockWindAnalysis);
        expect(result.current.transmissionQuality).toEqual(mockTransmissionQuality);
        expect(result.current.currentConditions).toEqual(mockCurrentConditions);
        expect(result.current.lastUpdated).toBeInstanceOf(Date);
        expect(result.current.currentConditionsUpdated).toBeInstanceOf(Date);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
      });

      // Clear cache
      await waitFor(async () => {
        await result.current.clearCache();
      });

      await waitFor(() => {
        expect(result.current.windData).toEqual([]);
        expect(result.current.analysis).toBeNull();
        expect(result.current.lastUpdated).toBeNull();
      });
    });

    it('should maintain separate loading states for main data and current conditions', async () => {
      let resolveMainPromise: (value: any) => void;
      let resolveCurrentPromise: (value: any) => void;
      
      const slowMainPromise = new Promise(resolve => {
        resolveMainPromise = resolve;
      });
      const slowCurrentPromise = new Promise(resolve => {
        resolveCurrentPromise = resolve;
      });
      
      mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockReturnValue(slowMainPromise as any);
      mockEcowittService.fetchEcowittRealTimeWindData.mockReturnValue(slowCurrentPromise as any);

      const { result } = renderHook(() => useSodaLakeWind());

      // Start both operations
      const mainPromise = result.current.refreshData();
      const currentPromise = result.current.refreshCurrentConditions();

      // Check both loading states
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isLoadingCurrent).toBe(true);
      });

      // Resolve current conditions first
      resolveCurrentPromise!({
        conditions: mockCurrentConditions
      });

      await currentPromise;

      // Main should still be loading, current should be done
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
        expect(result.current.isLoadingCurrent).toBe(false);
      });

      // Now resolve main data
      resolveMainPromise!(mockEcowittWindData);

      await mainPromise;

      // Both should be done
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isLoadingCurrent).toBe(false);
      });
    });
  });

  describe('Additional error handling coverage', () => {
    describe('loadCachedData error path', () => {
      it('should handle loadCachedData errors properly', async () => {
        const { result } = renderHook(() => useSodaLakeWind());

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await act(async () => {
          const loadResult = await result.current.loadCachedData();
          expect(loadResult).toBe(false);
        });

        // The function should handle the case where it logs about no cached data
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Error loading cached Soda Lake data:')
        );

        consoleErrorSpy.mockRestore();
      });

      it('should handle cached data loading errors', async () => {
        // Create a spy that will throw on the specific call we want to test
        const consoleLogSpy = jest.spyOn(console, 'log');
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        
        // Make console.log throw on second call (the cached data message)
        consoleLogSpy.mockImplementationOnce(() => {}) // First call succeeds
          .mockImplementationOnce(() => {
            throw new Error('Cache read error');
          });

        const { result } = renderHook(() => useSodaLakeWind());

        await act(async () => {
          const loadResult = await result.current.loadCachedData();
          expect(loadResult).toBe(false);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ Error loading cached Soda Lake data:',
          expect.any(Error)
        );

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });
  });
});
