import {
    analyzeOverallTransmissionQuality,
    clearDeviceCache,
    convertToWindDataPoint,
    debugDeviceListAPI,
    fetchEcowittCombinedWindDataForDevice,
    fetchEcowittRealTimeWindData,
    getAutoEcowittConfigForDevice,
    type EcowittCurrentWindConditions,
    type EcowittWindDataPoint,
    type TransmissionQualityInfo
} from '@/services/ecowittService';
import { analyzeRecentWindData, getAlarmCriteria, type AlarmCriteria, type WindAnalysis, type WindDataPoint } from '@/services/windService';
import { useCallback, useEffect, useState } from 'react';

export interface UseStandleyLakeWindReturn {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[]; // Converted for chart compatibility
  currentConditions: EcowittCurrentWindConditions | null; // Real-time current conditions
  analysis: WindAnalysis | null;
  transmissionQuality: TransmissionQualityInfo | null; // Transmission quality analysis
  
  // Loading and error states
  isLoading: boolean;
  isLoadingCurrent: boolean; // Separate loading state for real-time data
  error: string | null;
  lastUpdated: Date | null;
  currentConditionsUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshCurrentConditions: () => Promise<void>;
  loadCachedData: () => Promise<boolean>;
  clearCache: () => Promise<void>;
  debugAPI: () => Promise<void>;
}

export const useStandleyLakeWind = (): UseStandleyLakeWindReturn => {
  console.log('🏔️ useStandleyLakeWind hook initializing...');
  
  const [windData, setWindData] = useState<EcowittWindDataPoint[]>([]);
  const [currentConditions, setCurrentConditions] = useState<EcowittCurrentWindConditions | null>(null);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [transmissionQuality, setTransmissionQuality] = useState<TransmissionQualityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCurrent, setIsLoadingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentConditionsUpdated, setCurrentConditionsUpdated] = useState<Date | null>(null);
  const [userMinimumSpeed, setUserMinimumSpeed] = useState<number>(15); // Default fallback

  // Convert data for chart compatibility
  const chartData = convertToWindDataPoint(windData);

  // Load user's minimum speed setting from storage
  useEffect(() => {
    const loadUserCriteria = async () => {
      try {
        const criteria = await getAlarmCriteria();
        setUserMinimumSpeed(criteria.minimumAverageSpeed);
      } catch (error) {
        console.error('❌ Error loading user criteria:', error);
        // Keep default fallback value
      }
    };
    
    loadUserCriteria();
  }, []);

  /**
   * Load cached data from storage
   */
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📱 Loading cached Standley Lake wind data...');
      // For now, just return false as we're using combined data approach
      console.log('⚠️ No cached data available - using combined real-time + historical data');
      return false;
    } catch (error) {
      console.error('❌ Error loading cached Standley Lake data:', error);
      return false;
    }
  }, []);

  /**
   * Refresh current conditions (real-time data)
   */
  const refreshCurrentConditions = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingCurrent(true);
      console.log('🏔️ Refreshing Standley Lake current conditions...');
      
      const realTimeResult = await fetchEcowittRealTimeWindData('DP Standley West');
      const freshConditions = realTimeResult.conditions;
      setCurrentConditions(freshConditions);
      setCurrentConditionsUpdated(new Date());
      
      console.log('✅ Standley Lake current conditions refreshed');
    } catch (error) {
      console.error('❌ Error refreshing Standley Lake current conditions:', error);
      // Don't set error state for current conditions failures - just log it
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  /**
   * Refresh wind data from Ecowitt API
   */
  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Smart refreshing Standley Lake wind data...');
      
      // First test the auto-configuration
      try {
        await getAutoEcowittConfigForDevice('DP Standley West');
        console.log('✅ Auto-configuration successful for Standley Lake');
      } catch (configError) {
        console.error('❌ Auto-configuration failed for Standley Lake:', configError);
        setError(`Configuration failed: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
        return;
      }

      // Use combined data (historical + real-time) for complete coverage
      const freshData = await fetchEcowittCombinedWindDataForDevice('DP Standley West');
      
      setWindData(freshData);
      setLastUpdated(new Date());
      
      // Analyze transmission quality
      const qualityAnalysis = analyzeOverallTransmissionQuality(freshData);
      setTransmissionQuality(qualityAnalysis);
      
      // Handle empty data response
      if (freshData.length === 0) {
        console.warn('⚠️ No wind data received from DP Standley West station');
        setError('No data available from Standley Lake station. Station may be offline or not reporting data.');
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
        
        // Try to load cached data as fallback
        await loadCachedData();
        return;
      }
      
      // Analyze the fresh data
      if (freshData.length > 0) {
        const converted = convertToWindDataPoint(freshData);
        const defaultCriteria: AlarmCriteria = {
          minimumAverageSpeed: userMinimumSpeed, // Use user-configured minimum speed
          directionConsistencyThreshold: 70,
          minimumConsecutivePoints: 4,
          directionDeviationThreshold: 45,
          preferredDirection: 270, // West wind for Standley Lake
          preferredDirectionRange: 45,
          useWindDirection: true,
          alarmEnabled: false,
          alarmTime: "06:00"
        };
        
        const windAnalysis = analyzeRecentWindData(converted, defaultCriteria);
        setAnalysis(windAnalysis);
      }
      
      console.log('✅ Smart refreshed Standley Lake wind data:', freshData.length, 'points');
      
      // Also refresh current conditions from real-time API
      await refreshCurrentConditions();
      
    } catch (error) {
      console.error('❌ Error refreshing Standley Lake wind data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch wind data');
      
      // Try to load cached data as fallback
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData, userMinimumSpeed]);

  /**
   * Clear cached data
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await clearDeviceCache('DP Standley West');
      setWindData([]);
      setAnalysis(null);
      setLastUpdated(null);
      console.log('🗑️ Cleared Standley Lake wind data cache');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      setError('Failed to clear cache');
    }
  }, []);

  /**
   * Debug API call
   */
  const debugAPI = useCallback(async (): Promise<void> => {
    try {
      await debugDeviceListAPI();
    } catch (error) {
      console.error('❌ Debug API failed:', error);
    }
  }, []);

  /**
   * Load initial cached data
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load cached data
        await loadCachedData();
        
        console.log('🏔️ Standley Lake wind data initialized');
      } catch (error) {
        console.error('❌ Error initializing Standley Lake data:', error);
        setError('Failed to initialize data');
      }
    };

    initializeData();
  }, [loadCachedData]);

  return {
    // Data state
    windData,
    chartData,
    analysis,
    currentConditions,
    transmissionQuality,
    
    // Loading and error states
    isLoading,
    isLoadingCurrent,
    error,
    lastUpdated,
    currentConditionsUpdated,
    
    // Actions
    refreshData,
    refreshCurrentConditions,
    loadCachedData,
    clearCache,
    debugAPI
  };
};

// Default export for compatibility
export default useStandleyLakeWind;
