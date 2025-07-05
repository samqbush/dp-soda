import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useStandleyLakeWind } from '@/hooks/useStandleyLakeWind';
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
    windSpeed: 22,
    windSpeedMph: 49.2,
    windGust: 28,
    windGustMph: 62.6,
    windDirection: 280,
    temperature: 18,
    humidity: 65
  },
  {
    time: '2024-01-01T12:05:00Z',
    timestamp: 1704110700,
    windSpeed: 20,
    windSpeedMph: 44.7,
    windGust: 24,
    windGustMph: 53.6,
    windDirection: 285,
    temperature: 19,
    humidity: 62
  }
];

const mockChartData = [
  {
    time: '2024-01-01T12:00:00Z',
    timestamp: 1704110400,
    windSpeed: 22,
    windGust: 28,
    windDirection: 280
  },
  {
    time: '2024-01-01T12:05:00Z',
    timestamp: 1704110700,
    windSpeed: 20,
    windGust: 24,
    windDirection: 285
  }
];

const mockCurrentConditions = {
  time: '2024-01-01T12:30:00Z',
  timestamp: 1704112200,
  windSpeed: 24,
  windSpeedMph: 53.6,
  windGust: 30,
  windGustMph: 67.1,
  windDirection: 275,
  temperature: 20,
  humidity: 60
};

const mockWindAnalysis = {
  isAlarmWorthy: true,
  averageSpeed: 21,
  directionConsistency: 80,
  consecutiveGoodPoints: 2,
  analysis: 'Good wind conditions detected at Standley Lake'
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
  preferredDirection: 270, // West wind for Standley Lake
  preferredDirectionRange: 45,
  useWindDirection: true,
  alarmEnabled: false,
  alarmTime: "05:00"
};

describe('useStandleyLakeWind Hook Tests', () => {
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
      const { result } = renderHook(() => useStandleyLakeWind());

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
      renderHook(() => useStandleyLakeWind());

      await waitFor(() => {
        expect(mockWindService.getAlarmCriteria).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle criteria loading errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindService.getAlarmCriteria.mockRejectedValue(new Error('Criteria load failed'));

      const { result } = renderHook(() => useStandleyLakeWind());

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
      const { result } = renderHook(() => useStandleyLakeWind());

      const loaded = await result.current.loadCachedData();

      expect(loaded).toBe(false);
    });

    it('should handle cached data loading errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useStandleyLakeWind());

      // Even if there's an error in the future implementation, it should return false
      const loaded = await result.current.loadCachedData();

      expect(loaded).toBe(false);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Current Conditions Refresh', () => {
    it('should refresh current conditions successfully', async () => {
      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(result.current.currentConditions).toEqual(mockCurrentConditions);
        expect(result.current.currentConditionsUpdated).toBeInstanceOf(Date);
        expect(result.current.isLoadingCurrent).toBe(false);
      });

      expect(mockEcowittService.fetchEcowittRealTimeWindData).toHaveBeenCalledWith('DP Standley West');
    });

    it('should handle no real-time data available', async () => {
      mockEcowittService.fetchEcowittRealTimeWindData.mockResolvedValue({
        conditions: null
      });

      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(result.current.currentConditions).toBeNull();
        expect(result.current.isLoadingCurrent).toBe(false);
      });
    });

    it('should handle real-time data fetch errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Real-time fetch failed');
      mockEcowittService.fetchEcowittRealTimeWindData.mockRejectedValue(error);

      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshCurrentConditions();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error refreshing Standley Lake current conditions:', error);
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

      const { result } = renderHook(() => useStandleyLakeWind());

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
      const { result } = renderHook(() => useStandleyLakeWind());

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

      expect(mockEcowittService.getAutoEcowittConfigForDevice).toHaveBeenCalledWith('DP Standley West');
      expect(mockEcowittService.fetchEcowittCombinedWindDataForDevice).toHaveBeenCalledWith('DP Standley West');
      expect(mockEcowittService.analyzeOverallTransmissionQuality).toHaveBeenCalledWith(mockEcowittWindData);
      expect(mockWindService.analyzeRecentWindData).toHaveBeenCalled();
    });

    it('should handle auto-configuration errors', async () => {
      const configError = new Error('Config failed');
      mockEcowittService.getAutoEcowittConfigForDevice.mockRejectedValue(configError);

      const { result } = renderHook(() => useStandleyLakeWind());

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

      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ No wind data received from DP Standley West station');
        expect(result.current.error).toBe('No data available from Standley Lake station. Station may be offline or not reporting data.');
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

      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Error refreshing Standley Lake wind data:', fetchError);
        expect(result.current.error).toBe('Fetch failed');
        expect(result.current.isLoading).toBe(false);
      });

      consoleErrorSpy.mockRestore();
    });

    it('should use custom user minimum speed from criteria', async () => {
      const customCriteria = { ...mockAlarmCriteria, minimumAverageSpeed: 25 };
      mockWindService.getAlarmCriteria.mockResolvedValue(customCriteria);

      const { result } = renderHook(() => useStandleyLakeWind());

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
            minimumAverageSpeed: 25,
            preferredDirection: 270 // West wind specific to Standley Lake
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

      const { result } = renderHook(() => useStandleyLakeWind());

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
      const { result } = renderHook(() => useStandleyLakeWind());

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

      expect(mockEcowittService.clearDeviceCache).toHaveBeenCalledWith('DP Standley West');
    });

    it('should handle cache clear errors', async () => {
      const clearError = new Error('Clear failed');
      mockEcowittService.clearDeviceCache.mockRejectedValue(clearError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useStandleyLakeWind());

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
      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.debugAPI();
      });

      expect(mockEcowittService.debugDeviceListAPI).toHaveBeenCalledTimes(1);
    });

    it('should handle debug API errors', async () => {
      const debugError = new Error('Debug failed');
      mockEcowittService.debugDeviceListAPI.mockRejectedValue(debugError);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useStandleyLakeWind());

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
      const { result } = renderHook(() => useStandleyLakeWind());

      expect(result.current.chartData).toEqual(mockChartData);
      expect(mockEcowittService.convertToWindDataPoint).toHaveBeenCalledWith([]);
    });

    it('should update chart data when wind data changes', async () => {
      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(mockEcowittService.convertToWindDataPoint).toHaveBeenCalledWith(mockEcowittWindData);
        expect(result.current.chartData).toEqual(mockChartData);
      });
    });
  });

  describe('Standley Lake Specific Tests', () => {
    it('should use Standley Lake specific device name', async () => {
      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      expect(mockEcowittService.getAutoEcowittConfigForDevice).toHaveBeenCalledWith('DP Standley West');
      expect(mockEcowittService.fetchEcowittCombinedWindDataForDevice).toHaveBeenCalledWith('DP Standley West');
    });

    it('should use west wind preferred direction for Standley Lake', async () => {
      const { result } = renderHook(() => useStandleyLakeWind());

      await waitFor(async () => {
        await result.current.refreshData();
      });

      await waitFor(() => {
        expect(mockWindService.analyzeRecentWindData).toHaveBeenCalledWith(
          mockChartData,
          expect.objectContaining({
            preferredDirection: 270 // West wind
          })
        );
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow successfully', async () => {
      const { result } = renderHook(() => useStandleyLakeWind());

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

      const { result } = renderHook(() => useStandleyLakeWind());

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
        const { result } = renderHook(() => useStandleyLakeWind());

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        await act(async () => {
          const loadResult = await result.current.loadCachedData();
          expect(loadResult).toBe(false);
        });

        // The function should handle the case where it logs about no cached data
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Error loading cached Standley Lake data:')
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

        const { result } = renderHook(() => useStandleyLakeWind());

        await act(async () => {
          const loadResult = await result.current.loadCachedData();
          expect(loadResult).toBe(false);
        });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '❌ Error loading cached Standley Lake data:',
          expect.any(Error)
        );

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
      });
    });
  });
});
