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
import { fetchSunriseData, type SunriseData } from '@/services/sunriseService';
import { useCallback, useEffect, useState } from 'react';

export interface UseSodaLakeWindReturn {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[]; // Converted for chart compatibility
  currentConditions: EcowittCurrentWindConditions | null; // Real-time current conditions
  analysis: WindAnalysis | null;
  transmissionQuality: TransmissionQualityInfo | null; // Transmission quality analysis
  sunriseData: SunriseData | null; // Sunrise/sunset data for Morrison, CO
  
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

export const useSodaLakeWind = (): UseSodaLakeWindReturn => {
  // console.log('🏔️ useSodaLakeWind hook initializing...'); // Commented out - too noisy
  
  const [windData, setWindData] = useState<EcowittWindDataPoint[]>([]);
  const [currentConditions, setCurrentConditions] = useState<EcowittCurrentWindConditions | null>(null);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [transmissionQuality, setTransmissionQuality] = useState<TransmissionQualityInfo | null>(null);
  const [sunriseData, setSunriseData] = useState<SunriseData | null>(null);
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
      console.log('📱 Loading cached Soda Lake wind data...');
      // For now, just return false as we're using combined data approach
      console.log('⚠️ No cached data available - using combined real-time + historical data');
      return false;
    } catch (error) {
      console.error('❌ Error loading cached Soda Lake data:', error);
      return false;
    }
  }, []);

  /**
   * Refresh sunrise data for Morrison, CO
   */
  const refreshSunriseData = useCallback(async (): Promise<void> => {
    try {
      console.log('🌅 Refreshing sunrise data for Morrison, CO...');
      const sunrise = await fetchSunriseData();
      setSunriseData(sunrise);
      
      if (sunrise) {
        console.log('✅ Updated sunrise data:', sunrise.formatted);
      } else {
        console.warn('⚠️ Failed to fetch sunrise data');
      }
    } catch (error) {
      console.error('❌ Error refreshing sunrise data:', error);
      // Don't set error state - this is supplementary data
    }
  }, []);

  /**
   * Refresh current conditions using real-time API
   */
  const refreshCurrentConditions = useCallback(async (): Promise<void> => {
    setIsLoadingCurrent(true);

    try {
      console.log('⚡ Refreshing current conditions for Soda Lake...');
      
      const realTimeResult = await fetchEcowittRealTimeWindData('DP Soda Lakes');
      const realTimeData = realTimeResult.conditions;
      
      if (realTimeData) {
        setCurrentConditions(realTimeData);
        setCurrentConditionsUpdated(new Date());
        console.log('✅ Updated current conditions for Soda Lake');
      } else {
        console.warn('⚠️ No real-time data available, keeping existing current conditions');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing current conditions:', error);
      // Don't set error state - this is a secondary feature
    } finally {
      setIsLoadingCurrent(false);
    }
  }, []);

  /**
   * Refresh wind data from Ecowitt API for Soda Lake device using smart refresh
   * Also refreshes current conditions from real-time API
   */
  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Smart refreshing Soda Lake wind data...');
      
      // First test the auto-configuration for Soda Lake device
      try {
        await getAutoEcowittConfigForDevice('DP Soda Lakes');
        console.log('✅ Auto-configuration successful for Soda Lake');
      } catch (configError) {
        console.error('❌ Auto-configuration failed for Soda Lake:', configError);
        setError(`Configuration failed: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
        return;
      }

      // Use combined data (historical + real-time) for complete coverage
      const freshData = await fetchEcowittCombinedWindDataForDevice('DP Soda Lakes');
      
      setWindData(freshData);
      setLastUpdated(new Date());
      
      // Analyze transmission quality
      const qualityAnalysis = analyzeOverallTransmissionQuality(freshData);
      setTransmissionQuality(qualityAnalysis);
      
      // Handle empty data response
      if (freshData.length === 0) {
        console.warn('⚠️ No wind data received from DP Soda Lakes station');
        setError('No data available from Soda Lake station. Station may be offline or not reporting data.');
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
      
      // Analyze the fresh data with Soda Lake specific criteria
      if (freshData.length > 0) {
        const converted = convertToWindDataPoint(freshData);
        const defaultCriteria: AlarmCriteria = {
          minimumAverageSpeed: userMinimumSpeed, // Use user-configured minimum speed
          directionConsistencyThreshold: 70,
          minimumConsecutivePoints: 4,
          directionDeviationThreshold: 45,
          preferredDirection: 315, // Northwest wind for Soda Lake
          preferredDirectionRange: 45,
          useWindDirection: true,
          alarmEnabled: false,
          alarmTime: "05:00"
        };
        
        const windAnalysis = analyzeRecentWindData(converted, defaultCriteria);
        setAnalysis(windAnalysis);
      }
      
      console.log('✅ Smart refreshed Soda Lake wind data:', freshData.length, 'points');
      
      // Also refresh sunrise data
      await refreshSunriseData();
      
      // Also refresh current conditions from real-time API
      await refreshCurrentConditions();
      
    } catch (error) {
      console.error('❌ Error refreshing Soda Lake wind data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch wind data');
      
      // Try to load cached data as fallback
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData, refreshCurrentConditions, refreshSunriseData, userMinimumSpeed]);

  /**
   * Clear cached data
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await clearDeviceCache('DP Soda Lakes');
      setWindData([]);
      setAnalysis(null);
      setLastUpdated(null);
      console.log('🗑️ Cleared Soda Lake wind data cache');
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
   * Initialize hook - load user preferences but don't auto-fetch data
   * Let the component control when to fetch data based on focus/navigation
   */
  useEffect(() => {
    const initializeHook = async () => {
      try {
        console.log('🏔️ Soda Lake wind data hook initializing...');
        
        // Load sunrise data immediately since it doesn't depend on wind data
        await refreshSunriseData();
        
        // Only load user preferences, don't auto-fetch data
        // The WindStationTab component will control when to actually fetch data
        console.log('✅ Soda Lake wind data hook initialization complete (waiting for component to trigger data fetch)');
      } catch (error) {
        console.error('❌ Error initializing Soda Lake hook:', error);
        setError(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    initializeHook();
  }, [refreshSunriseData]); // Include refreshSunriseData in dependency array

  return {
    // Data state
    windData,
    chartData,
    currentConditions,
    analysis,
    transmissionQuality,
    sunriseData,
    
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
export default useSodaLakeWind;
