import { clearWindDataCache } from '@/services/storageService';
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
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface UseWindDataReturn {
  // Data state
  windData: WindDataPoint[];
  analysis: WindAnalysis | null;
  verification: WindAnalysis | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Configuration
  criteria: AlarmCriteria;
  setCriteria: (criteria: Partial<AlarmCriteria>) => Promise<void>;
  
  // Actions
  refreshData: () => Promise<void>;
  fetchRealData: () => Promise<void>;
  loadCachedData: () => Promise<boolean>;
}

export const useWindData = (): UseWindDataReturn => {
  console.log('🔄 useWindData hook initializing...');
  
  const [windData, setWindData] = useState<WindDataPoint[]>([]);
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [verification, setVerification] = useState<WindAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [criteria, setCriteriaState] = useState<AlarmCriteria>({
    minimumAverageSpeed: 15,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    directionDeviationThreshold: 45,
    preferredDirection: 315, // Northwest
    preferredDirectionRange: 45, // +/- 45 degrees from preferred direction
    useWindDirection: true, // By default, use wind direction in calculations
    alarmEnabled: false,
    alarmTime: "05:00" // Default to 5:00 AM
  });

  // Load initial criteria from storage
  useEffect(() => {
    console.log('📋 Loading initial criteria...');
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    try {
      console.log('📥 Getting alarm criteria from storage...');
      const storedCriteria = await getAlarmCriteria();
      console.log('✅ Criteria loaded:', storedCriteria);
      setCriteriaState(storedCriteria);
    } catch (err) {
      console.error('❌ Error loading criteria:', err);
    }
  };

  const setCriteria = useCallback(async (newCriteria: Partial<AlarmCriteria>) => {
    try {
      await setAlarmCriteria(newCriteria);
      const updatedCriteria = await getAlarmCriteria();
      setCriteriaState(updatedCriteria);
      
      // Re-analyze existing data with new criteria
      if (windData.length > 0) {
        const newAnalysis = analyzeWindData(windData, updatedCriteria);
        const newVerification = verifyWindConditions(windData, updatedCriteria);
        setAnalysis(newAnalysis);
        setVerification(newVerification);
      }
    } catch (err) {
      console.error('Error setting criteria:', err);
      setError('Failed to update alarm criteria');
    }
  }, [windData]);

  const loadCachedData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const cached = await getCachedWindData();
      if (cached && cached.length > 0) {
        setWindData(cached);
        
        // Analyze cached data
        const windAnalysis = analyzeWindData(cached, criteria);
        const windVerification = verifyWindConditions(cached, criteria);
        
        setAnalysis(windAnalysis);
        setVerification(windVerification);
        setLastUpdated(new Date());
        return true;
      } else {
        console.log('No valid cached data found');
        return false;
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      setError('Failed to load cached wind data');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [criteria]);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 Refreshing data (Platform: ${Platform.OS}, Version: ${Platform.Version})`);
      
      const data = await fetchWindData();
      
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid data format received');
      }
      
      setWindData(data);
      
      // Analyze fresh data
      const windAnalysis = analyzeWindData(data, criteria);
      const windVerification = verifyWindConditions(data, criteria);
      
      setAnalysis(windAnalysis);
      setVerification(windVerification);
      setLastUpdated(new Date());
      
      console.log('✅ Wind data refreshed successfully:', {
        dataPoints: data.length,
        isAlarmWorthy: windAnalysis.isAlarmWorthy,
        averageSpeed: windAnalysis.averageSpeed
      });
      
    } catch (err) {
      console.error('❌ Error refreshing wind data:', err);
      
      // Log error for better tracking
      console.warn('Data refresh failed:', err);
      
      // User-friendly error message
      setError(err instanceof Error ? 
        `Refresh failed: ${err.message}` : 
        'Failed to fetch wind data'
      );
      
      // Check if the cache might be corrupted
      const errMsg = err instanceof Error ? err.message.toLowerCase() : '';
      if (errMsg.includes('json') || errMsg.includes('parse')) {
        console.warn('⚠️ Possible corrupted cache detected, clearing cache...');
        try {
          await clearWindDataCache();
        } catch (clearErr) {
          console.error('❌ Failed to clear cache:', clearErr);
        }
      }
      
      // Try to load cached data as fallback
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [criteria, loadCachedData]);

  const fetchRealData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchRealWindData();
      setWindData(data);
      
      // Analyze fresh real data
      const windAnalysis = analyzeWindData(data, criteria);
      const windVerification = verifyWindConditions(data, criteria);
      
      setAnalysis(windAnalysis);
      setVerification(windVerification);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching real wind data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch real wind data');
    } finally {
      setIsLoading(false);
    }
  }, [criteria]);

  // Load cached data and then refresh on mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    const initializeData = async () => {
      console.log('🚀 Initializing wind data...');
      let dataLoaded = false;
      
      try {
        // SAFETY: Ensure we never hang forever on initialization
        timeoutId = setTimeout(() => {
          if (!dataLoaded) {
            console.warn('⚠️ Wind data initialization timeout - setting error state');
            setError('Unable to load wind data. Please check your connection and try refreshing.');
            setIsLoading(false);
            dataLoaded = true;
          }
        }, Platform.OS === 'android' ? 2000 : 5000);
        
        // First try to load cached data
        const cachedDataLoaded = await loadCachedData();
        
        // If no cached data, don't use fallback - let the refresh handle it
        if (!cachedDataLoaded) {
          console.log('No cached data available, attempting fresh data fetch');
        }
        
        // Regardless, try to refresh with new data if possible
        try {
          console.log('🔄 Loading fresh data...');
          await refreshData();
          dataLoaded = true;
        } catch (refreshErr) {
          console.error('💥 Error refreshing data:', refreshErr);
          if (!cachedDataLoaded) {
            setError(refreshErr instanceof Error ? refreshErr.message : 'Failed to load wind data');
            setIsLoading(false);
          }
          dataLoaded = true;
          if (timeoutId) clearTimeout(timeoutId); // Clear timeout when data is loaded
        }
      } catch (err) {
        console.error('💥 Fatal error during data initialization:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize wind data');
        setIsLoading(false);
        dataLoaded = true;
        if (timeoutId) clearTimeout(timeoutId); // Clear timeout on error
      }
    };
    
    initializeData();
    
    // Cleanup function to clear timeout if component unmounts
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loadCachedData, refreshData, criteria]);

  return {
    windData,
    analysis,
    verification,
    isLoading,
    error,
    lastUpdated,
    criteria,
    setCriteria,
    refreshData,
    fetchRealData,
    loadCachedData
  };
};
