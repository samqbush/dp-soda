import {
    clearEnhancedDeviceCache,
    convertToWindDataPoint,
    debugDeviceListAPI,
    fetchEcowittWindDataForDevice,
    getAutoEcowittConfigForDevice,
    getEnhancedCachedData,
    smartRefreshEcowittData,
    type EcowittWindDataPoint
} from '@/services/ecowittService';
import { analyzeRecentWindData, type AlarmCriteria, type WindAnalysis, type WindDataPoint } from '@/services/windService';
import { useCallback, useEffect, useState } from 'react';

export interface UseSodaLakeWindReturn {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[]; // Converted for chart compatibility
  analysis: WindAnalysis | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  loadCachedData: () => Promise<boolean>;
  clearCache: () => Promise<void>;
  debugAPI: () => Promise<void>;
}

export const useSodaLakeWind = (): UseSodaLakeWindReturn => {
  // console.log('🏔️ useSodaLakeWind hook initializing...'); // Commented out - too noisy
  
  const [windData, setWindData] = useState<EcowittWindDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Convert data for chart compatibility
  const chartData = convertToWindDataPoint(windData);

  /**
   * Load cached data from storage
   */
  const loadCachedData = useCallback(async (): Promise<boolean> => {
    try {
      console.log('📱 Loading cached Soda Lake wind data...');
      const cachedData = await getEnhancedCachedData('DP Soda Lakes');
      
      if (cachedData && cachedData.data.length > 0) {
        setWindData(cachedData.data);
        setLastUpdated(new Date(cachedData.metadata.lastUpdated));
        
        // Analyze the cached data
        const converted = convertToWindDataPoint(cachedData.data);
        if (converted.length > 0) {
          // Use Soda Lake specific criteria for analysis
          const defaultCriteria: AlarmCriteria = {
            minimumAverageSpeed: 10, // Soda Lake typically needs 10+ mph
            directionConsistencyThreshold: 70,
            minimumConsecutivePoints: 4,
            directionDeviationThreshold: 45,
            preferredDirection: 315, // Northwest wind for Soda Lake (matching original WindAlert setup)
            preferredDirectionRange: 45,
            useWindDirection: true,
            alarmEnabled: false,
            alarmTime: "05:00" // Earlier start time for Soda Lake dawn patrol
          };
          
          const windAnalysis = analyzeRecentWindData(converted, defaultCriteria);
          setAnalysis(windAnalysis);
        }
        
        console.log('✅ Loaded cached Soda Lake data:', cachedData.data.length, 'points');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error loading cached Soda Lake data:', error);
      setError('Failed to load cached data');
      return false;
    }
  }, []);

  /**
   * Refresh wind data from Ecowitt API for Soda Lake device using smart refresh
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

      // Use smart refresh (incremental or full based on cache state)
      const freshData = await smartRefreshEcowittData('DP Soda Lakes');
      
      setWindData(freshData);
      setLastUpdated(new Date());
      
      // Handle empty data response
      if (freshData.length === 0) {
        console.warn('⚠️ No wind data received from DP Soda Lakes station');
        setError('No data available from Soda Lake station. Station may be offline or not reporting data.');
        setAnalysis(null);
        
        // Try to load cached data as fallback
        await loadCachedData();
        return;
      }
      
      // Analyze the fresh data with Soda Lake specific criteria
      if (freshData.length > 0) {
        const converted = convertToWindDataPoint(freshData);
        const defaultCriteria: AlarmCriteria = {
          minimumAverageSpeed: 10,
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
      
    } catch (error) {
      console.error('❌ Error refreshing Soda Lake wind data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch wind data');
      
      // Try to load cached data as fallback
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData]);

  /**
   * Clear cached data
   */
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await clearEnhancedDeviceCache('DP Soda Lakes');
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
   * Load initial cached data
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load cached data
        await loadCachedData();
        
        console.log('🏔️ Soda Lake wind data initialized');
      } catch (error) {
        console.error('❌ Error initializing Soda Lake data:', error);
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
    
    // Loading and error states
    isLoading,
    error,
    lastUpdated,
    
    // Actions
    refreshData,
    loadCachedData,
    clearCache,
    debugAPI
  };
};

// Default export for compatibility
export default useSodaLakeWind;
