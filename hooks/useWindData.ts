import {
    analyzeWindData,
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
  loadCachedData: () => Promise<void>;
}

export const useWindData = (): UseWindDataReturn => {
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
    directionDeviationThreshold: 45
  });

  // Load initial criteria from storage
  useEffect(() => {
    loadCriteria();
  }, []);

  const loadCriteria = async () => {
    try {
      const storedCriteria = await getAlarmCriteria();
      setCriteriaState(storedCriteria);
    } catch (err) {
      console.error('Error loading criteria:', err);
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
      
      const data = await fetchWindData();
      setWindData(data);
      
      // Analyze fresh data
      const windAnalysis = analyzeWindData(data, criteria);
      const windVerification = verifyWindConditions(data, criteria);
      
      setAnalysis(windAnalysis);
      setVerification(windVerification);
      setLastUpdated(new Date());
      
      console.log('Wind data refreshed successfully:', {
        dataPoints: data.length,
        isAlarmWorthy: windAnalysis.isAlarmWorthy,
        averageSpeed: windAnalysis.averageSpeed
      });
      
    } catch (err) {
      console.error('Error refreshing wind data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wind data');
      
      // Try to load cached data as fallback
      await loadCachedData();
    } finally {
      setIsLoading(false);
    }
  }, [criteria, loadCachedData]);

  // Load cached data on mount
  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

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
    loadCachedData
  };
};
