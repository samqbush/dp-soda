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
});
