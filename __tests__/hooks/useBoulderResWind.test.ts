import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useBoulderResWind } from '@/hooks/useBoulderResWind';
import * as ecowittService from '@/services/ecowittService';
import * as windService from '@/services/windService';

jest.mock('@/services/ecowittService', () => ({
  analyzeOverallTransmissionQuality: jest.fn(),
  clearDeviceCache: jest.fn(),
  convertToWindDataPoint: jest.fn(),
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

const mockAlarmCriteria = {
  minimumAverageSpeed: 15,
  directionConsistencyThreshold: 70,
  minimumConsecutivePoints: 4,
  directionDeviationThreshold: 45,
  preferredDirection: 270,
  preferredDirectionRange: 45,
  useWindDirection: true,
  alarmEnabled: false,
  alarmTime: "06:00"
};

describe('useBoulderResWind Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWindService.getAlarmCriteria.mockResolvedValue(mockAlarmCriteria);
    mockEcowittService.getAutoEcowittConfigForDevice.mockResolvedValue({
      applicationKey: 'test-app-key',
      apiKey: 'test-api-key',
      macAddress: 'test-mac'
    });
    mockEcowittService.convertToWindDataPoint.mockReturnValue([]);
    mockEcowittService.analyzeOverallTransmissionQuality.mockReturnValue({
      isFullTransmission: true,
      hasOutdoorSensors: true,
      hasWindData: true,
      hasCompleteSensorData: true,
      transmissionGaps: [],
      lastGoodTransmissionTime: '',
      currentTransmissionStatus: 'good' as const
    });
    mockWindService.analyzeRecentWindData.mockReturnValue({
      isAlarmWorthy: false,
      averageSpeed: 0,
      directionConsistency: 0,
      consecutiveGoodPoints: 0,
      analysis: ''
    });
    mockEcowittService.clearDeviceCache.mockResolvedValue();
  });

  it('uses DP Boulder Res device name when refreshed', async () => {
    mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockResolvedValue([]);
    mockEcowittService.fetchEcowittRealTimeWindData.mockResolvedValue({
      conditions: null
    });

    const { result } = renderHook(() => useBoulderResWind());

    await waitFor(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(mockEcowittService.fetchEcowittCombinedWindDataForDevice).toHaveBeenCalledWith(
        'DP Boulder Res'
      );
    });
  });

  it('initializes without auto-loading', () => {
    const { result } = renderHook(() => useBoulderResWind());
    expect(result.current.isLoading).toBe(false);
    expect(result.current.windData).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('provides a loadCachedData function that returns false', async () => {
    const { result } = renderHook(() => useBoulderResWind());
    const cached = await result.current.loadCachedData();
    expect(cached).toBe(false);
  });

  it('handles errors gracefully on refresh', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockEcowittService.fetchEcowittCombinedWindDataForDevice.mockRejectedValue(
      new Error('Network error')
    );
    mockEcowittService.fetchEcowittRealTimeWindData.mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useBoulderResWind());

    await waitFor(async () => {
      await result.current.refreshData();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    consoleErrorSpy.mockRestore();
  });

  it('loads user criteria on mount', async () => {
    renderHook(() => useBoulderResWind());

    await waitFor(() => {
      expect(mockWindService.getAlarmCriteria).toHaveBeenCalledTimes(1);
    });
  });
});
