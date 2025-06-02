import {
    clearEcowittDataCache,
    convertToWindDataPoint,
    fetchEcowittWindData,
    getCachedEcowittData,
    getEcowittConfig,
    setEcowittConfig,
    type EcowittApiConfig,
    type EcowittWindDataPoint
} from '@/services/ecowittService';
import { analyzeWindData, type AlarmCriteria, type WindAnalysis, type WindDataPoint } from '@/services/windService';
import { useCallback, useEffect, useState } from 'react';

export interface UseStandleyLakeWindReturn {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[]; // Converted for chart compatibility
  analysis: WindAnalysis | null;
  
  // Configuration state
  config: EcowittApiConfig | null;
  isConfigured: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  loadCachedData: () => Promise<boolean>;
  setApiConfig: (config: EcowittApiConfig) => Promise<void>;
  clearCache: () => Promise<void>;
}

export const useStandleyLakeWind = (): UseStandleyLakeWindReturn => {
  console.log('🏔️ useStandleyLakeWind hook initializing...');
  
  const [windData, setWindData] = useState<EcowittWindDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [config, setConfig] = useState<EcowittApiConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Convert data for chart compatibility
  const chartData = convertToWindDataPoint(windData);

  // Check if API is configured
  const isConfigured = !!(config?.applicationKey && config?.apiKey && config?.macAddress);

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
    if (!isConfigured) {
      setError('API not configured. Please add your Ecowitt API credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Refreshing Standley Lake wind data...');
      const freshData = await fetchEcowittWindData();
      
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
  }, [isConfigured, loadCachedData]);

  /**
   * Set API configuration
   */
  const setApiConfig = useCallback(async (newConfig: EcowittApiConfig): Promise<void> => {
    try {
      await setEcowittConfig(newConfig);
      setConfig(newConfig);
      console.log('✅ Saved Ecowitt API configuration');
      
      // Clear any previous errors
      setError(null);
      
      // Automatically fetch data after configuration
      setTimeout(() => {
        refreshData();
      }, 100);
      
    } catch (error) {
      console.error('❌ Error saving Ecowitt config:', error);
      setError('Failed to save API configuration');
      throw error;
    }
  }, [refreshData]);

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
   * Load initial configuration and cached data
   */
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Load API configuration
        const savedConfig = await getEcowittConfig();
        setConfig(savedConfig);
        
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
    
    // Configuration state
    config,
    isConfigured,
    
    // Loading and error states
    isLoading,
    error,
    lastUpdated,
    
    // Actions
    refreshData,
    loadCachedData,
    setApiConfig,
    clearCache
  };
};

// Default export for compatibility
export default useStandleyLakeWind;
