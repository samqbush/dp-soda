import { useCallback, useEffect, useState } from 'react';
import { katabaticAnalyzer, KatabaticPrediction, KatabaticCriteria } from '@/services/katabaticAnalyzer';
import { WeatherServiceData } from '@/services/weatherService';

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
 */
const defaultSettings: KatabaticSettings = {
  maxPrecipitationProbability: 20,
  minCloudCoverClearPeriod: 70,
  minPressureChange: 2.0,
  minTemperatureDifferential: 5.0,
  clearSkyWindow: { start: '02:00', end: '05:00' },
  predictionWindow: { start: '06:00', end: '08:00' },
  minimumConfidence: 60,
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

  /**
   * Analyze weather data for katabatic conditions
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
      // Merge settings with any custom criteria
      const criteria = { ...state.settings, ...customCriteria };
      
      // Perform analysis
      const prediction = katabaticAnalyzer.analyzePrediction(weatherData, criteria);
      
      setState(prev => ({
        ...prev,
        prediction,
        isAnalyzing: false,
        lastAnalysisTime: new Date(),
        error: null,
      }));
    } catch (error) {
      console.error('Katabatic analysis error:', error);
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Analysis failed',
        prediction: null,
      }));
    }
  }, [weatherData, state.settings]);

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
   * Auto-refresh analysis when weather data changes
   */
  useEffect(() => {
    if (weatherData && !state.isAnalyzing) {
      analyzeConditions();
    }
  }, [weatherData, analyzeConditions, state.isAnalyzing]);

  /**
   * Set up auto-refresh timer
   */
  useEffect(() => {
    if (!state.settings.autoRefresh) return;

    const interval = setInterval(() => {
      if (weatherData && !state.isAnalyzing) {
        analyzeConditions();
      }
    }, state.settings.refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.settings.autoRefresh, state.settings.refreshInterval, weatherData, analyzeConditions, state.isAnalyzing]);

  return {
    // Core state
    prediction: state.prediction,
    isAnalyzing: state.isAnalyzing,
    lastAnalysisTime: state.lastAnalysisTime,
    error: state.error,
    settings: state.settings,
    
    // Actions
    analyzeConditions,
    updateSettings,
    resetSettings,
    
    // Derived data
    analysisSummary: getAnalysisSummary(),
    nextOptimalWindow: getNextOptimalWindow(),
    currentConditionStatus: getCurrentConditionStatus(),
  };
}

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
