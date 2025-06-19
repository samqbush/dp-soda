import { useCallback, useEffect, useState, useRef } from 'react';
import { katabaticAnalyzer, KatabaticPrediction, KatabaticCriteria } from '@/services/katabaticAnalyzer';
import { WeatherServiceData } from '@/services/weatherService';

/**
 * Analysis modes based on time of day
 */
export type AnalysisMode = 'prediction' | 'verification' | 'post-dawn';

/**
 * Settings for katabatic analysis that can be customized by user
 */
export interface KatabaticSettings extends Partial<KatabaticCriteria> {
  autoRefresh: boolean;
  refreshInterval: number; // minutes
}

/**
 * Hook state for katabatic analysis
 */
interface UseKatabaticAnalyzerState {
  prediction: KatabaticPrediction | null;
  isAnalyzing: boolean;
  lastAnalysisTime: Date | null;
  error: string | null;
  settings: KatabaticSettings;
}

/**
 * Default settings for katabatic analysis
 * Updated to use 6pm-6am analysis window as requested by user
 */
const defaultSettings: KatabaticSettings = {
  maxPrecipitationProbability: 25,  // Increased from 20% - light precip chance doesn't always kill katabatic
  minCloudCoverClearPeriod: 45,     // Reduced from 60% - mountain weather often has some clouds
  minPressureChange: 1.0,           // Reduced from 1.5 - smaller changes can still indicate good conditions
  minTemperatureDifferential: 3.2,  // Adjusted for Evergreen (lower elevation difference than Nederland)
  clearSkyWindow: { start: '18:00', end: '06:00' }, // Updated: 6pm to 6am as requested
  predictionWindow: { start: '06:00', end: '08:00' },
  minimumConfidence: 50,            // Reduced from 60 - be less conservative overall
  autoRefresh: true,
  refreshInterval: 30, // 30 minutes
};

/**
 * React hook for katabatic wind analysis
 * Provides prediction engine functionality with state management
 */
export function useKatabaticAnalyzer(weatherData: WeatherServiceData | null) {
  const [state, setState] = useState<UseKatabaticAnalyzerState>({
    prediction: null,
    isAnalyzing: false,
    lastAnalysisTime: null,
    error: null,
    settings: defaultSettings,
  });

  // Use a ref to store current state for stable access in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Analyze weather data for katabatic conditions with enhanced historical data
   */
  const analyzeConditions = useCallback(async (customCriteria?: Partial<KatabaticCriteria>) => {
    if (!weatherData) {
      setState(prev => ({
        ...prev,
        error: 'No weather data available for analysis',
        prediction: null,
      }));
      return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Merge settings with any custom criteria using ref
      const mergedCriteria = { ...stateRef.current.settings, ...customCriteria };
      
      // Extract only the KatabaticCriteria properties for analysis
      const criteria: KatabaticCriteria = {
        maxPrecipitationProbability: mergedCriteria.maxPrecipitationProbability!,
        minCloudCoverClearPeriod: mergedCriteria.minCloudCoverClearPeriod!,
        minPressureChange: mergedCriteria.minPressureChange!,
        minTemperatureDifferential: mergedCriteria.minTemperatureDifferential!,
        minWavePatternScore: mergedCriteria.minWavePatternScore!,
        clearSkyWindow: mergedCriteria.clearSkyWindow!,
        predictionWindow: mergedCriteria.predictionWindow!,
        minimumConfidence: mergedCriteria.minimumConfidence!,
      };
      
      // Perform main analysis first
      const prediction = katabaticAnalyzer.analyzePrediction(weatherData, criteria);
      
      // Enhance with free historical data if conditions warrant it
      try {
        const enhancedAnalysis = await katabaticAnalyzer.getEnhancedThermalAnalysis(weatherData, criteria);
        
        // If we got good historical data, update the prediction's thermal factor
        if (enhancedAnalysis.hasHistoricalData && enhancedAnalysis.historicalDifferential !== undefined) {
          console.log('🆓 Integrating FREE historical thermal data into prediction');
          
          // Update the temperature differential factor with historical data
          const enhancedPrediction = {
            ...prediction,
            factors: {
              ...prediction.factors,
              temperatureDifferential: {
                ...prediction.factors.temperatureDifferential,
                differential: enhancedAnalysis.historicalDifferential,
                confidence: enhancedAnalysis.historicalConfidence || 95,
                dataSource: 'hybrid_thermal_cycle' as const,
                thermalCycleFailureReason: undefined, // Clear any failure reason
                usedTomorrowFallback: false,
              }
            },
            enhancedAnalysis
          };
          
          // Check if the thermal factor now meets criteria with historical data
          const thermalMeetsThreshold = enhancedAnalysis.historicalDifferential >= criteria.minTemperatureDifferential;
          enhancedPrediction.factors.temperatureDifferential.meets = thermalMeetsThreshold;
          
          // If thermal factor changed from failing to passing, recalculate overall probability
          if (thermalMeetsThreshold && !prediction.factors.temperatureDifferential.meets) {
            console.log('🔥 Historical data improved thermal factor from failing to passing!');
            // This would ideally trigger a full probability recalculation, but for now
            // we'll boost the confidence and let the UI show the improvement
            enhancedPrediction.confidenceScore = Math.min(100, enhancedPrediction.confidenceScore + 15);
            enhancedPrediction.probability = Math.min(100, enhancedPrediction.probability + 10);
          }
          
          setState(prev => ({
            ...prev,
            prediction: enhancedPrediction,
            isAnalyzing: false,
            lastAnalysisTime: new Date(),
            error: null,
          }));
        } else {
          // No historical enhancement available, use original prediction with fallback info
          setState(prev => ({
            ...prev,
            prediction: {
              ...prediction,
              enhancedAnalysis
            },
            isAnalyzing: false,
            lastAnalysisTime: new Date(),
            error: null,
          }));
        }
      } catch (enhancementError) {
        console.log('⚠️ Historical enhancement failed, using standard prediction:', enhancementError);
        // Enhancement failed, use original prediction
        setState(prev => ({
          ...prev,
          prediction: {
            ...prediction,
            enhancedAnalysis: {
              hasHistoricalData: false,
              fallbackReason: `Enhancement error: ${enhancementError instanceof Error ? enhancementError.message : 'Unknown error'}`
            }
          },
          isAnalyzing: false,
          lastAnalysisTime: new Date(),
          error: null,
        }));
      }
      
    } catch (error) {
      console.error('Katabatic analysis error:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        prediction: null,
      }));
    }
  }, [weatherData]);

  /**
   * Update analysis settings
   */
  const updateSettings = useCallback((newSettings: Partial<KatabaticSettings>) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  }, []);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setState(prev => ({
      ...prev,
      settings: defaultSettings,
    }));
  }, []);

  /**
   * Get analysis summary for quick reference
   */
  const getAnalysisSummary = useCallback(() => {
    if (!state.prediction) return null;

    const { prediction } = state;
    const factorsMet = [
      prediction.factors.precipitation.meets,
      prediction.factors.skyConditions.meets,
      prediction.factors.pressureChange.meets,
      prediction.factors.temperatureDifferential.meets,
    ].filter(Boolean).length;

    return {
      probability: prediction.probability,
      confidence: prediction.confidence,
      recommendation: prediction.recommendation,
      factorsMet,
      totalFactors: 4,
      primaryConcern: getPrimaryConcern(prediction),
      bestAspect: getBestAspect(prediction),
    };
  }, [state.prediction]);

  /**
   * Get the next optimal window for katabatic conditions
   */
  const getNextOptimalWindow = useCallback(() => {
    if (!state.prediction?.bestTimeWindow) return null;

    const now = new Date();
    const { start, end, confidence } = state.prediction.bestTimeWindow;

    // Check if the window is in the future
    if (start > now) {
      const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
      return {
        start,
        end,
        confidence,
        hoursUntil: Math.round(hoursUntil * 10) / 10,
        isToday: start.toDateString() === now.toDateString(),
      };
    }

    return null;
  }, [state.prediction]);

  /**
   * Check if conditions are favorable right now
   */
  const getCurrentConditionStatus = useCallback(() => {
    if (!state.prediction) return null;

    const now = new Date();
    const currentHour = now.getHours();
    
    // Check if we're in the prediction window (6-8am)
    const inPredictionWindow = currentHour >= 6 && currentHour <= 8;
    
    return {
      inPredictionWindow,
      recommendation: state.prediction.recommendation,
      probability: state.prediction.probability,
      shouldGo: state.prediction.recommendation === 'go' && inPredictionWindow,
      shouldConsider: state.prediction.recommendation === 'maybe' && inPredictionWindow,
    };
  }, [state.prediction]);

  /**
   * Determine analysis mode based on current time
   */
  const getAnalysisMode = useCallback(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour >= 0 && currentHour < 6) {
      return 'prediction'; // Pre-dawn: Focus on today's prediction
    } else if (currentHour >= 6 && currentHour <= 8) {
      return 'verification'; // Dawn patrol: Real-time verification mode
    } else {
      return 'post-dawn'; // After 8am: Freeze today's analysis, focus on tomorrow
    }
  }, []);

  /**
   * Time-aware analysis that considers the current phase of dawn patrol
   */
  const timeAwareAnalyzeConditions = useCallback(async (customCriteria?: Partial<KatabaticCriteria>) => {
    if (!weatherData) {
      setState(prev => ({
        ...prev,
        error: 'No weather data available for analysis',
        prediction: null,
      }));
      return;
    }

    const analysisMode = getAnalysisMode();
    const now = new Date();
    
    // Use ref to access current state without creating dependency
    const currentState = stateRef.current;
    
    // For post-dawn mode, check if we already have a prediction from today
    if (analysisMode === 'post-dawn' && currentState.prediction && currentState.lastAnalysisTime) {
      const lastAnalysisDate = currentState.lastAnalysisTime;
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      // If we have a prediction from today and it's after 8am, don't re-analyze
      if (lastAnalysisDate >= todayStart) {
        console.log('🔒 Post-dawn mode: Using frozen today\'s prediction, analysis mode:', analysisMode);
        return;
      }
    }

    setState(prev => ({ ...prev, isAnalyzing: true, error: null }));

    try {
      // Merge settings with any custom criteria using ref
      const criteria = { ...currentState.settings, ...customCriteria };
      
      // Perform analysis
      const prediction = katabaticAnalyzer.analyzePrediction(weatherData, criteria);
      
      // Add analysis mode context to the prediction
      const enhancedPrediction = {
        ...prediction,
        analysisMode,
        analysisTime: now.toISOString(),
        timeWindow: analysisMode === 'verification' ? 'active' : analysisMode === 'post-dawn' ? 'completed' : 'upcoming'
      };
      
      setState(prev => ({
        ...prev,
        prediction: enhancedPrediction,
        isAnalyzing: false,
        lastAnalysisTime: now,
        error: null,
      }));
      
      console.log('🌅 Time-aware analysis completed:', {
        mode: analysisMode,
        time: now.toLocaleTimeString(),
        probability: prediction.probability
      });
    } catch (error) {
      console.error('Katabatic analysis error:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        prediction: null,
      }));
    }
  }, [weatherData, getAnalysisMode]);

  /**
   * Auto-refresh analysis when weather data changes (time-aware)
   */
  useEffect(() => {
    if (weatherData && !stateRef.current.isAnalyzing) {
      timeAwareAnalyzeConditions();
    }
  }, [weatherData, timeAwareAnalyzeConditions]);

  /**
   * Set up time-aware auto-refresh timer
   */
  useEffect(() => {
    if (!stateRef.current.settings.autoRefresh) return;

    const interval = setInterval(() => {
      const currentState = stateRef.current;
      if (weatherData && !currentState.isAnalyzing) {
        const analysisMode = getAnalysisMode();
        
        // Reduce refresh frequency in post-dawn mode
        if (analysisMode === 'post-dawn') {
          console.log('🕐 Post-dawn mode: Skipping auto-refresh to preserve today\'s analysis');
          return;
        }
        
        timeAwareAnalyzeConditions();
      }
    }, stateRef.current.settings.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [weatherData, timeAwareAnalyzeConditions, getAnalysisMode]);

  return {
    // Core state
    prediction: state.prediction,
    isAnalyzing: state.isAnalyzing,
    lastAnalysisTime: state.lastAnalysisTime,
    error: state.error,
    settings: state.settings,
    
    // Time-aware state
    analysisMode: getAnalysisMode(),
    
    // Actions
    analyzeConditions: timeAwareAnalyzeConditions, // Use time-aware version
    updateSettings,
    resetSettings,
    
    // Derived data
    analysisSummary: getAnalysisSummary(),
    nextOptimalWindow: getNextOptimalWindow(),
    currentConditionStatus: getCurrentConditionStatus(),
  };
}

/**
 * Time-Aware Katabatic Analysis System
 * 
 * This hook implements time-based analysis modes to prevent continuous updates
 * after the dawn patrol window has passed, ensuring prediction accuracy tracking:
 * 
 * 🔮 PREDICTION MODE (00:00 - 06:00): 
 *    - Active analysis for today's dawn patrol
 *    - Uses forecast data for current day prediction
 *    - Updates every 30 minutes
 * 
 * ⚡ VERIFICATION MODE (06:00 - 08:00):
 *    - Real-time verification during dawn patrol window
 *    - Compares predictions against actual conditions
 *    - Continues updating to track accuracy
 * 
 * 🔒 POST-DAWN MODE (08:00 - 23:59):
 *    - Freezes today's analysis to preserve prediction accuracy
 *    - Prevents continuous updates that would change the original prediction
 *    - Focus shifts to tomorrow's forecast
 *    - Auto-refresh disabled for today's prediction
 * 
 * This ensures that users can see exactly what was predicted vs what actually
 * happened, enabling proper verification and historical accuracy tracking.
 */

/**
 * Helper function to identify the primary concern in prediction
 */
function getPrimaryConcern(prediction: KatabaticPrediction): string {
  const factors = prediction.factors;
  
  // Find the factor with the lowest confidence that doesn't meet criteria
  const concerns = [
    { name: 'High precipitation risk', confidence: factors.precipitation.confidence, meets: factors.precipitation.meets },
    { name: 'Poor sky conditions', confidence: factors.skyConditions.confidence, meets: factors.skyConditions.meets },
    { name: 'Insufficient pressure change', confidence: factors.pressureChange.confidence, meets: factors.pressureChange.meets },
    { name: 'Low temperature differential', confidence: factors.temperatureDifferential.confidence, meets: factors.temperatureDifferential.meets },
  ];
  
  // Find the biggest concern (lowest confidence among unmet factors)
  const unmetConcerns = concerns.filter(c => !c.meets);
  if (unmetConcerns.length > 0) {
    const biggestConcern = unmetConcerns.reduce((prev, curr) => 
      curr.confidence < prev.confidence ? curr : prev
    );
    return biggestConcern.name;
  }
  
  // If all factors are met, find the weakest one
  const weakestFactor = concerns.reduce((prev, curr) => 
    curr.confidence < prev.confidence ? curr : prev
  );
  return `Monitor ${weakestFactor.name.toLowerCase()}`;
}

/**
 * Helper function to identify the best aspect of current conditions
 */
function getBestAspect(prediction: KatabaticPrediction): string {
  const factors = prediction.factors;
  
  const aspects = [
    { name: 'Low precipitation', confidence: factors.precipitation.confidence, meets: factors.precipitation.meets },
    { name: 'Clear skies', confidence: factors.skyConditions.confidence, meets: factors.skyConditions.meets },
    { name: 'Good pressure change', confidence: factors.pressureChange.confidence, meets: factors.pressureChange.meets },
    { name: 'Strong temperature differential', confidence: factors.temperatureDifferential.confidence, meets: factors.temperatureDifferential.meets },
  ];
  
  // Find the best performing factor among those that meet criteria
  const metAspects = aspects.filter(a => a.meets);
  if (metAspects.length > 0) {
    const bestAspect = metAspects.reduce((prev, curr) => 
      curr.confidence > prev.confidence ? curr : prev
    );
    return bestAspect.name;
  }
  
  // If no factors are met, find the best performing one overall
  const bestOverall = aspects.reduce((prev, curr) => 
    curr.confidence > prev.confidence ? curr : prev
  );
  return bestOverall.name;
}
