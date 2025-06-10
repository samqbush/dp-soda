import {
    clearEcowittDataCache,
    convertToWindDataPoint,
    debugDeviceListAPI,
    fetchEcowittWindDataForDevice,
    getAutoEcowittConfigForDevice,
    getCachedEcowittData,
    type EcowittWindDataPoint
} from '@/services/ecowittService';
import { analyzeWindData, type AlarmCriteria, type WindAnalysis, type WindDataPoint } from '@/services/windService';
import { useCallback, useEffect, useState } from 'react';

export interface UseStandleyLakeWindReturn {
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

export const useStandleyLakeWind = (): UseStandleyLakeWindReturn => {
  console.log('🏔️ useStandleyLakeWind hook initializing...');
  
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
      console.log('📱 Loading cached Standley Lake wind data...');
      const cached = await getCachedEcowittData();
      
      if (cached.length > 0) {
        setWindData(cached);
        setLastUpdated(new Date());
        
        // Analyze the cached data
        const converted = convertToWindDataPoint(cached);
        if (converted.length > 0) {
          // Use default criteria for analysis - these could be made configurable later
          const defaultCriteria: AlarmCriteria = {
            minimumAverageSpeed: 12, // Standley Lake might need different thresholds
            directionConsistencyThreshold: 70,
            minimumConsecutivePoints: 4,
            directionDeviationThreshold: 45,
            preferredDirection: 270, // West wind for Standley Lake
            preferredDirectionRange: 45,
            useWindDirection: true,
            alarmEnabled: false,
            alarmTime: "06:00" // Later start time for Standley Lake
          };
          
          const windAnalysis = analyzeWindData(converted, defaultCriteria);
          setAnalysis(windAnalysis);
        }
        
        console.log('✅ Loaded cached Standley Lake data:', cached.length, 'points');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error loading cached Standley Lake data:', error);
      setError('Failed to load cached data');
      return false;
    }
  }, []);

  /**
   * Refresh wind data from Ecowitt API
   */
  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Refreshing Standley Lake wind data...');
      
      // First test the auto-configuration
      try {
        await getAutoEcowittConfigForDevice('DP Standley West');
        console.log('✅ Auto-configuration successful for Standley Lake');
      } catch (configError) {
        console.error('❌ Auto-configuration failed for Standley Lake:', configError);
        setError(`Configuration failed: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
        return;
      }

      const freshData = await fetchEcowittWindDataForDevice('DP Standley West');
      
      setWindData(freshData);
      setLastUpdated(new Date());
      
      // Analyze the fresh data
      if (freshData.length > 0) {
        const converted = convertToWindDataPoint(freshData);
        const defaultCriteria: AlarmCriteria = {
          minimumAverageSpeed: 12,
          directionConsistencyThreshold: 70,
          minimumConsecutivePoints: 4,
          directionDeviationThreshold: 45,
          preferredDirection: 270, // West wind for Standley Lake
          preferredDirectionRange: 45,
          useWindDirection: true,
          alarmEnabled: false,
          alarmTime: "06:00"
        };
        
        const windAnalysis = analyzeWindData(converted, defaultCriteria);
        setAnalysis(windAnalysis);
      }
      
      console.log('✅ Refreshed Standley Lake wind data:', freshData.length, 'points');
      
    } catch (error) {
      console.error('❌ Error refreshing Standley Lake wind data:', error);
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
      await clearEcowittDataCache();
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
export default useStandleyLakeWind;
