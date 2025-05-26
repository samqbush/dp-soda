import { logBuildIssue } from '@/config/buildConfig';
import { useStableState } from '@/hooks/useStableState';
import EMERGENCY_FALLBACK_DATA from '@/services/fallbackData';
import { performMemoryCleanup } from '@/services/memoryManager';
import {
    NotificationType,
    canSendNotification,
    formatNotificationMessage,
    recordNotification,
    shouldShowNotification
} from '@/services/notificationService';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform } from 'react-native';

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
  
  // Use more stable state to prevent white screen crashes
  const [windData, setWindData] = useStableState<WindDataPoint[]>([]);
  const [analysis, setAnalysis] = useStableState<WindAnalysis | null>(null);
  const [verification, setVerification] = useStableState<WindAnalysis | null>(null);
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
  
  // Track app state for memory management
  const appState = useRef(AppState.currentState);
  const hasCleanedMemory = useRef(false);

  // Load initial criteria from storage
  useEffect(() => {
    console.log('📋 Loading initial criteria...');
    
    // Perform memory cleanup during initialization
    // This can help prevent white screen issues after app updates
    if (Platform.OS === 'android' && !hasCleanedMemory.current) {
      performMemoryCleanup(false).catch(err => 
        console.error('Memory cleanup failed:', err)
      );
      hasCleanedMemory.current = true;
    }
    
    loadCriteria();
  }, []);
  
  // Monitor app state for memory management
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // When app comes to foreground, check if we need to clean up memory
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground - checking memory');
        performMemoryCleanup(false).catch(err => 
          console.error('Background-to-foreground memory cleanup failed:', err)
        );
      }
      
      appState.current = nextAppState;
    });
    
    return () => {
      subscription.remove();
    };
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
        console.log('No valid cached data found, using emergency fallback');
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

  // Function to handle notifications for wind conditions
  const handleWindNotifications = useCallback(async (
    currentAnalysis: WindAnalysis | null,
    previousAnalysis: WindAnalysis | null,
    type: NotificationType = 'alarm'
  ) => {
    // Skip if no analysis or if notification check fails
    if (!currentAnalysis) return;
    
    // Check if we should show notifications at all
    const canShow = await shouldShowNotification(type);
    if (!canShow) return;
    
    // Check if we've already notified recently
    const canSend = await canSendNotification(type);
    if (!canSend) return;
    
    // For alarm notifications
    if (type === 'alarm' && currentAnalysis.isAlarmWorthy) {
      // Only notify if this is a change from previous state or first analysis
      if (!previousAnalysis || previousAnalysis.isAlarmWorthy !== currentAnalysis.isAlarmWorthy) {
        const message = formatNotificationMessage(
          'Wind Alarm: Wake Up! 🌊',
          `Great wind conditions detected! Average speed: ${currentAnalysis.averageSpeed.toFixed(1)} mph with ${currentAnalysis.directionConsistency.toFixed(0)}% direction consistency.`
        );
        
        // Show alert for now, in future this could be a push notification
        Alert.alert(message.title, message.body);
        
        // Record that we showed this notification
        await recordNotification(type);
      }
    }
    
    // For verification notifications
    if (type === 'verification' && currentAnalysis.isAlarmWorthy) {
      const message = formatNotificationMessage(
        'Wind Verification: Conditions Good! ✅',
        `Wind conditions verified in 6am-8am window. Average speed: ${currentAnalysis.averageSpeed.toFixed(1)} mph.`
      );
      
      // Show alert for now, in future this could be a push notification
      Alert.alert(message.title, message.body);
      
      // Record that we showed this notification
      await recordNotification(type);
    }
  }, []);

  // Keep track of previous analysis for change detection
  const prevAnalysisRef = useRef<WindAnalysis | null>(null);
  const prevVerificationRef = useRef<WindAnalysis | null>(null);

  // Trigger notifications when analysis changes
  useEffect(() => {
    if (analysis) {
      handleWindNotifications(analysis, prevAnalysisRef.current, 'alarm').catch(console.error);
      prevAnalysisRef.current = analysis;
    }
  }, [analysis, handleWindNotifications]);

  // Trigger notifications when verification changes
  useEffect(() => {
    if (verification) {
      handleWindNotifications(verification, prevVerificationRef.current, 'verification').catch(console.error);
      prevVerificationRef.current = verification;
    }
  }, [verification, handleWindNotifications]);

  // Load cached data and then refresh on mount
  useEffect(() => {
    const initialized = useRef(false);
    
    // Skip duplicate initialization which can cause white screens
    if (initialized.current) return;
    initialized.current = true;
    
    const initializeData = async () => {
      console.log('🚀 Initializing wind data...');
      let dataLoaded = false;
      
      // Perform immediate memory cleanup to prevent issues
      if (Platform.OS === 'android') {
        try {
          await performMemoryCleanup(true);
        } catch (e) {
          console.error('Failed to perform startup memory cleanup:', e);
        }
      }
      
      try {
        // SAFETY: Ensure we never hang forever on initialization
        // Use safer approach with cleanup - helps prevent white screens
        const timeoutId = setTimeout(() => {
          if (!dataLoaded) {
            console.warn('⚠️ Wind data initialization timeout - using emergency fallback');
            handleEmergencyFallback();
          }
        }, Platform.OS === 'android' ? 3000 : 5000);
        
        // First try to load cached data
        try {
          const cachedDataLoaded = await loadCachedData();
          
          // If no cached data, immediately use fallback first
          if (!cachedDataLoaded) {
            console.log('No cached data available, using emergency fallback first');
            handleEmergencyFallback();
            dataLoaded = true;
          }
        } catch (cacheErr) {
          console.error('❌ Error loading cached data:', cacheErr);
          handleEmergencyFallback();
        }
        
        // Clear timeout as we've handled the data loading
        clearTimeout(timeoutId);
        
        // On Android, introduce a delay before attempting network fetch
        // This helps prevent resource contention during startup
        if (Platform.OS === 'android') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Regardless, try to refresh with new data if possible
        try {
          console.log('🔄 Loading fresh data...');
          await refreshData();
          dataLoaded = true;
        } catch (refreshErr) {
          console.error('💥 Error refreshing data:', refreshErr);
          // If not loaded already, fallback to emergency data
          if (!dataLoaded) {
            handleEmergencyFallback();
          }
          dataLoaded = true;
        }
      } catch (err) {
        console.error('💥 Fatal error during data initialization:', err);
        handleEmergencyFallback();
        dataLoaded = true;
      }
    };
    
    // Function to use emergency fallback data
    const handleEmergencyFallback = () => {
      try {
        console.log('📊 Using emergency fallback data');
        setIsLoading(true);
        
        // Use clean emergency data for Android
        const safeData = [...EMERGENCY_FALLBACK_DATA];
        
        setWindData(safeData);
        setLastUpdated(new Date());
        
        // Always pass fresh criteria object to avoid reference issues
        const fallbackAnalysis = analyzeWindData(safeData, {...criteria});
        setAnalysis(fallbackAnalysis);
        setVerification(null);
        setError("Using emergency fallback data - please pull down to refresh");
      } catch (fallbackErr) {
        console.error('💥 Even fallback data setup failed:', fallbackErr);
        
        // Last resort - set minimal safe data
        try {
          setWindData([{
            time: new Date().toISOString(),
            windSpeed: "10.0",
            windGust: "12.0",
            windDirection: "220"
          }]);
          
          setAnalysis({
            isAlarmWorthy: false,
            averageSpeed: 10,
            directionConsistency: 100,
            consecutiveGoodPoints: 1,
            analysis: "Emergency fallback"
          });
          
          setVerification(null);
        } catch (e) {
          console.error('💥 Critical data setup failure:', e);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

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
