import {
    analyzeOverallTransmissionQuality,
    clearDeviceCache,
    convertToWindDataPoint,
    fetchEcowittCombinedWindDataForDevice,
    fetchEcowittRealTimeWindData,
    getAutoEcowittConfigForDevice,
    type EcowittCurrentWindConditions,
    type EcowittWindDataPoint,
    type TransmissionQualityInfo
} from '@/services/ecowittService';
import { analyzeRecentWindData, getAlarmCriteria, type AlarmCriteria, type WindAnalysis, type WindDataPoint } from '@/services/windService';
import { useCallback, useEffect, useState } from 'react';

export interface StationWindConfig {
  deviceName: string;
  preferredDirection: number;
  defaultAlarmTime: string;
}

export interface UseStationWindReturn {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[];
  currentConditions: EcowittCurrentWindConditions | null;
  analysis: WindAnalysis | null;
  transmissionQuality: TransmissionQualityInfo | null;
  
  // Loading and error states
  isLoading: boolean;
  isLoadingCurrent: boolean;
  error: string | null;
  lastUpdated: Date | null;
  currentConditionsUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshCurrentConditions: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useStationWind = (config: StationWindConfig): UseStationWindReturn => {
  const { deviceName, preferredDirection, defaultAlarmTime } = config;

  const [windData, setWindData] = useState<EcowittWindDataPoint[]>([]);
  const [currentConditions, setCurrentConditions] = useState<EcowittCurrentWindConditions | null>(null);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [transmissionQuality, setTransmissionQuality] = useState<TransmissionQualityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentConditionsUpdated, setCurrentConditionsUpdated] = useState<Date | null>(null);
  const [userMinimumSpeed, setUserMinimumSpeed] = useState<number>(15);

  const chartData = convertToWindDataPoint(windData);

  // Load user's minimum speed setting from storage
  useEffect(() => {
    const loadUserCriteria = async () => {
      try {
        const criteria = await getAlarmCriteria();
        setUserMinimumSpeed(criteria.minimumAverageSpeed);
      } catch (err) {
        console.error('❌ Error loading user criteria:', err);
      }
    };
    
    loadUserCriteria();
  }, []);

  const refreshCurrentConditions = useCallback(async (): Promise<void> => {
    setIsLoadingCurrent(true);

    try {
      const realTimeResult = await fetchEcowittRealTimeWindData(deviceName);
      const realTimeData = realTimeResult.conditions;
      
      if (realTimeData) {
        setCurrentConditions(realTimeData);
        setCurrentConditionsUpdated(new Date());
      }
    } catch (err) {
      console.error(`❌ Error refreshing current conditions for ${deviceName}:`, err);
    } finally {
      setIsLoadingCurrent(false);
    }
  }, [deviceName]);

  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      try {
        await getAutoEcowittConfigForDevice(deviceName);
      } catch (configError) {
        console.error(`❌ Auto-configuration failed for ${deviceName}:`, configError);
        setError(`Configuration failed: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
        return;
      }

      const freshData = await fetchEcowittCombinedWindDataForDevice(deviceName);
      
      setWindData(freshData);
      setLastUpdated(new Date());
      
      const qualityAnalysis = analyzeOverallTransmissionQuality(freshData);
      setTransmissionQuality(qualityAnalysis);
      
      if (freshData.length === 0) {
        setError(`No data available from ${deviceName} station. Station may be offline or not reporting data.`);
        setAnalysis(null);
        setTransmissionQuality({
          isFullTransmission: false,
          hasOutdoorSensors: false,
          hasWindData: false,
          hasCompleteSensorData: false,
          transmissionGaps: [],
          lastGoodTransmissionTime: null,
          currentTransmissionStatus: 'offline'
        });
        return;
      }
      
      if (freshData.length > 0) {
        const converted = convertToWindDataPoint(freshData);
        const defaultCriteria: AlarmCriteria = {
          minimumAverageSpeed: userMinimumSpeed,
          directionConsistencyThreshold: 70,
          minimumConsecutivePoints: 4,
          directionDeviationThreshold: 45,
          preferredDirection,
          preferredDirectionRange: 45,
          useWindDirection: true,
          alarmEnabled: false,
          alarmTime: defaultAlarmTime
        };
        
        const windAnalysis = analyzeRecentWindData(converted, defaultCriteria);
        setAnalysis(windAnalysis);
      }
      
      await refreshCurrentConditions();
      
    } catch (err) {
      console.error(`❌ Error refreshing ${deviceName} wind data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wind data');
    } finally {
      setIsLoading(false);
    }
  }, [deviceName, preferredDirection, defaultAlarmTime, refreshCurrentConditions, userMinimumSpeed]);

  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await clearDeviceCache(deviceName);
      setWindData([]);
      setAnalysis(null);
      setLastUpdated(null);
    } catch (err) {
      console.error('❌ Error clearing cache:', err);
      setError('Failed to clear cache');
    }
  }, [deviceName]);

  return {
    windData,
    chartData,
    currentConditions,
    analysis,
    transmissionQuality,
    isLoading,
    isLoadingCurrent,
    error,
    lastUpdated,
    currentConditionsUpdated,
    refreshData,
    refreshCurrentConditions,
    clearCache
  };
};

export default useStationWind;
