import { logBuildIssue } from '@/config/buildConfig';
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
  loadCachedData: () => Promise<void>;
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
    minimumAverageSpeed: 10,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    speedDeviationThreshold: 3,
    directionDeviationThreshold: 45,
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
      if (cached) {
        setWindData(cached);
        
        // Analyze cached data
        const windAnalysis = analyzeWindData(cached, criteria);
        const windVerification = verifyWindConditions(cached, criteria);
        
        setAnalysis(windAnalysis);
        setVerification(windVerification);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
      setError('Failed to load cached wind data');
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
      
      // Log as a build issue for better tracking
      logBuildIssue('Data refresh failed', err);
      
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
    const initializeData = async () => {
      console.log('🚀 Initializing wind data...');
      try {
        // First try to load cached data
        await loadCachedData();
        
        // Then try to refresh with new data
        console.log('🔄 Loading fresh data after cached data...');
        await refreshData();
      } catch (err) {
        console.error('💥 Fatal error during data initialization:', err);
        
        // Generate fallback sample data if everything else fails
        try {
          setIsLoading(true);
          // Use sample data as a last resort
          const sampleData = [
            {
              time: new Date().toISOString(),
              windSpeed: "10.5",
              windGust: "12.3",
              windDirection: "225"
            },
            {
              time: new Date(Date.now() - 3600000).toISOString(),
              windSpeed: "9.8",
              windGust: "11.7",
              windDirection: "220"
            }
          ];
          
          setWindData(sampleData);
          setLastUpdated(new Date());
          
          const fallbackAnalysis = analyzeWindData(sampleData, criteria);
          setAnalysis(fallbackAnalysis);
          setVerification(null);
          setError("Using emergency fallback data - please try again later");
        } catch (fallbackErr) {
          console.error('💥 Even fallback data generation failed:', fallbackErr);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    initializeData();
  }, [loadCachedData, refreshData]);

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
