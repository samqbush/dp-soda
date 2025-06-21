import { useCallback, useEffect, useState } from 'react';
import { WeatherServiceData, WeatherDataPoint } from '@/services/weatherService';
import { hybridWeatherService } from '@/services/hybridWeatherService';
import { useKatabaticAnalyzer } from '@/hooks/useKatabaticAnalyzer';
import { katabaticAnalyzer } from '@/services/katabaticAnalyzer';
import { predictionTrackingService } from '@/services/predictionTrackingService';

/**
 * Custom hook for managing weather data state and operations
 * Follows the same patterns as useWindData.ts
 * Updated June 14, 2025: Added prediction tracking for continuous improvement
 */
export const useWeatherData = () => {
  const [weatherData, setWeatherData] = useState<WeatherServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize katabatic analyzer with weather data
  const katabaticAnalysis = useKatabaticAnalyzer(weatherData);

  /**
   * Fetch weather data from the hybrid weather service
   */
  const fetchWeatherData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await hybridWeatherService.fetchHybridWeatherData();
      
      setWeatherData(data);
      setLastUpdated(new Date(data.lastFetch));
      
      // If the service returned an error but still has data, set the error state
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      console.error('Weather data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh weather data (force fetch)
   */
  const refreshData = useCallback(async () => {
    await hybridWeatherService.clearCache();
    await fetchWeatherData();
  }, [fetchWeatherData]);

  /**
   * Clear cached weather data
   */
  const clearCache = useCallback(async () => {
    try {
      await hybridWeatherService.clearCache();
      setWeatherData(null);
      setLastUpdated(null);
      setError(null);
    } catch (err) {
      console.error('Failed to clear weather cache:', err);
    }
  }, []);

  /**
   * Get current conditions for a specific location
   */
  const getCurrentConditions = useCallback((location: 'morrison' | 'mountain') => {
    if (!weatherData) return null;
    return weatherData[location]?.current || null;
  }, [weatherData]);

  /**
   * Get hourly forecast for a specific location
   */
  const getHourlyForecast = useCallback((location: 'morrison' | 'mountain', hours?: number) => {
    if (!weatherData) return [];
    const forecast = weatherData[location]?.hourlyForecast || [];
    return hours ? forecast.slice(0, hours) : forecast;
  }, [weatherData]);

  /**
   * Get weather data for a specific time window
   */
  const getWeatherForTimeWindow = useCallback((
    location: 'morrison' | 'mountain',
    startHour: number,
    endHour: number
  ) => {
    if (!weatherData) return [];
    
    const forecast = weatherData[location]?.hourlyForecast || [];
    
    return forecast.filter((point: WeatherDataPoint) => {
      const pointDate = new Date(point.timestamp);
      const pointHour = pointDate.getHours();
      
      // For time windows that span midnight (e.g., 22:00 to 06:00)
      if (startHour > endHour) {
        return pointHour >= startHour || pointHour <= endHour;
      }
      
      return pointHour >= startHour && pointHour <= endHour;
    });
  }, [weatherData]);

  /**
   * Calculate temperature differential between mountain and valley
   */
  const getTemperatureDifferential = useCallback(() => {
    if (!weatherData) return null;
    
    const morrisonTemp = weatherData.morrison?.current?.temperature;
    const mountainTemp = weatherData.mountain?.current?.temperature;
    
    if (morrisonTemp === undefined || mountainTemp === undefined) return null;
    
    return {
      morrison: morrisonTemp,
      mountain: mountainTemp,
      differential: morrisonTemp - mountainTemp,
    };
  }, [weatherData]);

  /**
   * Enhanced temperature differential calculation using thermal cycles
   * Uses the KatabaticAnalyzer to avoid code duplication
   */
  const getKatabaticTemperatureDifferential = useCallback(async () => {
    if (!weatherData) return null;
    
    try {
      // Use the existing katabatic analyzer to get temperature differential analysis
      const analysis = await katabaticAnalyzer.analyzePrediction(weatherData);
      const tempFactor = analysis.factors.temperatureDifferential;
      
      if (tempFactor.analysisType === 'unavailable') {
        // Fallback to current differential if thermal cycle analysis unavailable
        return getTemperatureDifferential();
      }
      
      // Return the thermal cycle analysis from the analyzer
      return {
        morrison: tempFactor.morrisonTemp,
        mountain: tempFactor.mountainTemp,
        differential: tempFactor.differential,
        type: 'thermal_cycle',
        dataStrategy: tempFactor.analysisType === 'thermal_cycle' ? 'thermal_cycle_analysis' : 'fallback',
        confidence: tempFactor.confidence > 70 ? 'high' : tempFactor.confidence > 40 ? 'medium' : 'low',
        timeWindow: {
          morrisonMax: '18:00 (Evening - start of cooling cycle)',
          evergreenMin: '06:00 (Dawn - end of cooling cycle)'
        }
      };
    } catch (error) {
      console.error('Error getting katabatic temperature differential:', error);
      // Fallback to current differential on error
      return getTemperatureDifferential();
    }
  }, [weatherData, getTemperatureDifferential]);

  /**
   * Get pressure trend analysis
   */
  const getPressureTrend = useCallback((location: 'morrison' | 'mountain', hours: number = 6) => {
    if (!weatherData) return null;
    
    const forecast = weatherData[location]?.hourlyForecast || [];
    const recentData = forecast.slice(0, hours);
    
    if (recentData.length < 2) return null;
    
    const pressures = recentData.map((point: WeatherDataPoint) => point.pressure);
    const firstPressure = pressures[0];
    const lastPressure = pressures[pressures.length - 1];
    const change = lastPressure - firstPressure;
    
    let trend: 'rising' | 'falling' | 'stable';
    if (Math.abs(change) < 1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }
    
    return {
      change,
      trend,
      pressures,
      timespan: hours,
    };
  }, [weatherData]);

  /**
   * Check if conditions are suitable for katabatic winds
   * This is a simplified check - the full analysis will be in useKatabaticAnalyzer
   */
  const getBasicKatabaticConditions = useCallback(() => {
    if (!weatherData) return null;
    
    const morrisonCurrent = weatherData.morrison?.current;
    const mountainCurrent = weatherData.mountain?.current;
    
    if (!morrisonCurrent || !mountainCurrent) return null;
    
    // Get weather for the critical time windows
    const clearSkyPeriod = getWeatherForTimeWindow('morrison', 2, 5); // 2-5am
    const predictionPeriod = getWeatherForTimeWindow('morrison', 6, 8); // 6-8am
    
    // Calculate average precipitation probability for clear sky period
    const avgPrecipProb = clearSkyPeriod.length > 0 
      ? clearSkyPeriod.reduce((sum: number, point: WeatherDataPoint) => sum + point.precipitationProbability, 0) / clearSkyPeriod.length
      : morrisonCurrent.precipitationProbability;
    
    // Calculate average cloud cover for clear sky period
    const avgCloudCover = clearSkyPeriod.length > 0
      ? clearSkyPeriod.reduce((sum: number, point: WeatherDataPoint) => sum + point.cloudCover, 0) / clearSkyPeriod.length
      : morrisonCurrent.cloudCover;
    
    const tempDiff = getTemperatureDifferential();
    const pressureTrend = getPressureTrend('morrison');
    
    return {
      precipitationProbability: avgPrecipProb,
      cloudCover: avgCloudCover,
      temperatureDifferential: tempDiff?.differential || 0,
      pressureChange: pressureTrend?.change || 0,
      pressureTrend: pressureTrend?.trend || 'stable',
      clearSkyPeriod,
      predictionPeriod,
    };
  }, [weatherData, getWeatherForTimeWindow, getTemperatureDifferential, getPressureTrend]);

  /**
   * Get preliminary katabatic prediction for tomorrow
   * Note: This is a preliminary prediction based on current forecast models
   */
  const getTomorrowPrediction = useCallback(async () => {
    if (!weatherData) return null;
    
    try {
      // Create a modified analyzer instance for tomorrow's data
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Filter weather data for tomorrow's 24-hour period
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setHours(0, 0, 0, 0);
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);
      
      // Create filtered weather data for tomorrow
      const tomorrowWeatherData = {
        ...weatherData,
        morrison: {
          ...weatherData.morrison,
          hourlyForecast: weatherData.morrison.hourlyForecast.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= tomorrowStart && pointDate <= tomorrowEnd;
          })
        },
        mountain: {
          ...weatherData.mountain,
          hourlyForecast: weatherData.mountain.hourlyForecast.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= tomorrowStart && pointDate <= tomorrowEnd;
          })
        }
      };
      
      // Only proceed if we have tomorrow's data
      if (tomorrowWeatherData.morrison.hourlyForecast.length === 0) {
        return null;
      }
      
      // Run katabatic analysis on tomorrow's data
      const prediction = await katabaticAnalyzer.analyzePrediction(tomorrowWeatherData);
      
      return {
        prediction,
        isPreliminary: true,
        dataQuality: tomorrowWeatherData.morrison.hourlyForecast.length >= 20 ? 'good' : 'limited',
        lastModelUpdate: weatherData.lastFetch,
        nextUpdateExpected: '6:00 PM today',
        disclaimer: 'Preliminary forecast - accuracy improves with evening weather model updates'
      };
      
    } catch (error) {
      console.error('Tomorrow prediction error:', error);
      return null;
    }
  }, [weatherData]);

  /**
   * Get katabatic prediction for a specific day (0 = today, 1 = tomorrow, etc.)
   */
  const getDayPrediction = useCallback(async (dayOffset: number) => {
    if (!weatherData) return null;
    
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + dayOffset);
      
      // For today (dayOffset = 0), use time-aware prediction from katabaticAnalysis
      // to ensure consistency with the main prediction display
      if (dayOffset === 0 && katabaticAnalysis.prediction) {
        console.log('📊 Using time-aware today prediction from katabaticAnalysis for daily breakdown');
        return {
          prediction: katabaticAnalysis.prediction,
          dayOffset: 0,
          targetDate,
          isPreliminary: false,
          dataQuality: 'good',
          lastModelUpdate: weatherData.lastFetch,
          nextUpdateExpected: 'Real-time updates',
          disclaimer: katabaticAnalysis.analysisMode === 'post-dawn' 
            ? 'Frozen prediction for accuracy verification - tomorrow\'s forecast available'
            : 'Current day analysis based on latest conditions'
        };
      }
      
      // For other days (tomorrow+), perform fresh analysis
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Create filtered weather data for the target day
      const dayWeatherData = {
        ...weatherData,
        morrison: {
          ...weatherData.morrison,
          hourlyForecast: weatherData.morrison.hourlyForecast.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= dayStart && pointDate <= dayEnd;
          })
        },
        mountain: {
          ...weatherData.mountain,
          hourlyForecast: weatherData.mountain.hourlyForecast.filter(point => {
            const pointDate = new Date(point.timestamp);
            return pointDate >= dayStart && pointDate <= dayEnd;
          })
        }
      };
      
      // Only proceed if we have the day's data
      if (dayWeatherData.morrison.hourlyForecast.length === 0) {
        return null;
      }
      
      // Run katabatic analysis on the day's data
      const prediction = await katabaticAnalyzer.analyzePrediction(dayWeatherData);
      
      // Determine data quality and preliminary status
      const dataQuality = dayWeatherData.morrison.hourlyForecast.length >= 18 ? 'good' : 'limited';
      const isPreliminary = dayOffset > 1; // Days beyond tomorrow are more preliminary
      
      return {
        prediction,
        dayOffset,
        targetDate,
        isPreliminary,
        dataQuality,
        lastModelUpdate: weatherData.lastFetch,
        nextUpdateExpected: dayOffset <= 1 ? '6:00 PM today' : 'Next model update',
        disclaimer: dayOffset === 0 
          ? 'Current day analysis based on latest conditions'
          : dayOffset === 1 
          ? 'Preliminary forecast - accuracy improves with evening weather model updates'
          : 'Extended forecast - conditions may change significantly'
      };
      
    } catch (error) {
      console.error(`Day ${dayOffset} prediction error:`, error);
      return null;
    }
  }, [weatherData, katabaticAnalysis]);

  /**
   * Get predictions for the next 5 days (maximum available from free API)
   */
  const getWeeklyPredictions = useCallback(async () => {
    if (!weatherData) return [];
    
    const predictions = [];
    
    // Get predictions for today through day 4 (5 days total)
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const prediction = await getDayPrediction(dayOffset);
      if (prediction) {
        predictions.push(prediction);
      }
    }
    
    return predictions;
  }, [weatherData, getDayPrediction]);

  /**
   * Get available forecast days with data availability info
   */
  const getForecastAvailability = useCallback(() => {
    if (!weatherData) return null;
    
    const now = new Date();
    const forecastHours = weatherData.morrison.hourlyForecast;
    
    if (forecastHours.length === 0) return null;
    
    // Find the last forecast point
    const lastForecast = forecastHours[forecastHours.length - 1];
    const lastForecastDate = new Date(lastForecast.timestamp);
    
    // Calculate how many full days we have
    const daysAvailable = Math.floor((lastForecastDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    return {
      totalHours: forecastHours.length,
      daysAvailable: Math.min(daysAvailable, 5), // Cap at 5 days
      lastForecastTime: lastForecastDate,
      dataSource: weatherData.dataSource,
      isComplete: daysAvailable >= 4 // We consider 4+ days "complete"
    };
  }, [weatherData]);

  /**
   * Set OpenWeatherMap API key manually
   */
  const setApiKey = useCallback((apiKey: string) => {
    hybridWeatherService.setApiKey(apiKey);
  }, []);

  /**
   * Check if API key is configured
   */
  const isApiKeyConfigured = useCallback(() => {
    return hybridWeatherService.isApiKeyConfigured();
  }, []);

  /**
   * Get data source information
   */
  const getDataSourceInfo = useCallback(() => {
    if (!weatherData) return null;
    return {
      source: weatherData.dataSource,
      apiKeyConfigured: weatherData.apiKeyConfigured,
      lastFetch: weatherData.lastFetch,
      hasError: !!weatherData.error
    };
  }, [weatherData]);

  /**
   * Log prediction for tracking (called when prediction is made)
   */
  const logCurrentPrediction = useCallback(async () => {
    if (!weatherData || !katabaticAnalysis.prediction) return;
    
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(6, 0, 0, 0); // Dawn patrol time
      
      // Extract weather conditions for tracking
      const weatherConditions = {
        morrisonTemp: weatherData.morrison?.current?.temperature || 0,
        mountainTemp: weatherData.mountain?.current?.temperature || 0,
        actualTempDiff: (weatherData.morrison?.current?.temperature || 0) - (weatherData.mountain?.current?.temperature || 0),
        precipitation: weatherData.morrison?.current?.precipitationProbability || 0,
        cloudCover: weatherData.morrison?.current?.cloudCover || 0,
        pressure: weatherData.morrison?.current?.pressure || 0,
      };
      
      // 🆕 Add call tracking for debugging
      const logDetails = {
        timestamp: new Date().toISOString(),
        predictionDate: tomorrow.toDateString(),
        probability: katabaticAnalysis.prediction.probability,
        confidence: katabaticAnalysis.prediction.confidenceScore,
        triggeredBy: 'useWeatherData',
        environment: __DEV__ ? 'development' : 'production'
      };
      
      // In production, reduce logging noise
      if (__DEV__) {
        console.log('🔄 logCurrentPrediction called:', logDetails);
      }
      
      await predictionTrackingService.logPrediction(
        tomorrow,
        katabaticAnalysis.prediction,
        weatherConditions
      );
      
      // In production, reduce logging noise
      const logMessage = __DEV__ ? 
        'Logged prediction for tracking:' : 
        'Prediction logged for learning system:';
        
      console.log(`📊 ${logMessage}`, {
        date: tomorrow.toDateString(),
        probability: katabaticAnalysis.prediction.probability,
        confidence: katabaticAnalysis.prediction.confidenceScore
      });
    } catch (error) {
      console.error('❌ Failed to log prediction:', error);
      // Don't throw - prediction tracking shouldn't break the main functionality
    }
  }, [weatherData, katabaticAnalysis.prediction]);

  /**
   * Enhanced prediction validation with detailed failure analysis
   * Automatically validates predictions against Ecowitt wind data after 8 AM
   */
  const validatePastPredictions = useCallback(async (actualWindData: Array<{
    time: Date;
    windSpeedMph: number;
    windDirection: number;
  }>) => {
    try {
      const today = new Date();
      console.log('🔍 Starting validation process:', {
        currentTime: today.toLocaleString(),
        currentHour: today.getHours()
      });
      
      // Look for predictions made for today (not dawn patrol time specifically)
      const todayDateOnly = new Date(today);
      todayDateOnly.setHours(0, 0, 0, 0); // Start of day
      
      console.log('📅 Looking for predictions for date:', todayDateOnly.toDateString());
      
      // Find prediction that needs validation
      const pendingPrediction = await predictionTrackingService.findPredictionNeedingOutcome(todayDateOnly);
      
      console.log('🔍 Prediction search result:', {
        found: !!pendingPrediction,
        predictionId: pendingPrediction?.id,
        predictionDate: pendingPrediction?.predictionDate?.toDateString(),
        hasOutcome: !!pendingPrediction?.outcome
      });
      
      if (!pendingPrediction) {
        console.log('📊 No pending predictions to validate for today');
        // Let's also check what predictions we do have
        const allPredictions = await predictionTrackingService.getAllPredictions();
        console.log('📊 All stored predictions:', allPredictions.map(p => ({
          id: p.id,
          date: p.predictionDate.toDateString(),
          hasOutcome: !!p.outcome,
          probability: p.prediction.probability
        })));
        
        // Check if we have a recent completed validation to show
        const todaysPrediction = allPredictions.find(p => 
          p.predictionDate.toDateString() === todayDateOnly.toDateString()
        );
        
        if (todaysPrediction && todaysPrediction.outcome) {
          console.log('📊 Found completed validation for today, displaying results');
          
          // Enhanced algorithm debugging for completed validation
          const validationOutcome = todaysPrediction.outcome;
          const wasPredictedSuccess = todaysPrediction.prediction.probability >= 50;
          const wasAccurate = wasPredictedSuccess === validationOutcome.success;
          
          console.log('🧮 DETAILED ALGORITHM ANALYSIS FOR COMPLETED VALIDATION');
          console.log('=' .repeat(80));
          console.log('📊 PREDICTION BREAKDOWN:', {
            predictionId: todaysPrediction.id,
            predictionDate: todaysPrediction.predictionDate.toDateString(),
            predictedProbability: todaysPrediction.prediction.probability,
            predictedConfidence: todaysPrediction.prediction.confidence,
            predictedRecommendation: todaysPrediction.prediction.recommendation,
            predictedSuccess: wasPredictedSuccess,
            actualSuccess: validationOutcome.success,
            predictionWasAccurate: wasAccurate,
            failureType: !wasAccurate ? 
              (wasPredictedSuccess && !validationOutcome.success ? 'FALSE_POSITIVE' : 'FALSE_NEGATIVE') : 'CORRECT'
          });
          
          console.log('🌤️ ACTUAL WIND CONDITIONS:', {
            avgWindSpeed: validationOutcome.actualWindSpeed.toFixed(1) + ' mph',
            maxWindSpeed: validationOutcome.actualMaxSpeed.toFixed(1) + ' mph',
            minWindSpeed: validationOutcome.actualMinSpeed.toFixed(1) + ' mph',
            dataPoints: validationOutcome.dataPoints,
            windSuccess: validationOutcome.success,
            validationSource: validationOutcome.source,
            notes: validationOutcome.notes
          });
          
          // Detailed factor analysis if prediction was wrong
          if (!wasAccurate) {
            console.log('🔍 FACTOR-BY-FACTOR ANALYSIS OF PREDICTION FAILURE:');
            
            const predictionData = todaysPrediction.prediction;
            if (predictionData.factors) {
              console.log('  📈 PREDICTED FACTORS BREAKDOWN:');
              
              Object.entries(predictionData.factors).forEach(([factorName, factor]) => {
                console.log(`    • ${factorName.toUpperCase()}:`, {
                  meets: factor.meets ? '✅ MET' : '❌ NOT MET',
                  value: factor.value !== undefined ? factor.value : 'N/A',
                  threshold: factor.threshold !== undefined ? factor.threshold : 'N/A',
                  weight: factor.weight !== undefined ? factor.weight : 'N/A',
                  contribution: factor.meets ? '+' : '-'
                });
              });
            }
            
            console.log('  💡 ALGORITHM CONFIDENCE BREAKDOWN:');
            console.log(`    - Overall Probability: ${predictionData.probability}% (threshold: 50%)`);
            console.log(`    - Confidence Level: ${predictionData.confidence}%`);
            console.log(`    - Recommendation: ${predictionData.recommendation}`);
            
            if (wasPredictedSuccess && !validationOutcome.success) {
              console.log('  ⚠️ FALSE POSITIVE ANALYSIS:');
              console.log(`    - Algorithm said: ${predictionData.probability}% chance of good winds`);
              console.log(`    - Reality: ${validationOutcome.actualWindSpeed.toFixed(1)} mph average (need 15+ mph)`);
              console.log(`    - Gap: Algorithm was overconfident by ${predictionData.probability - 0}%`);
              console.log('  🔧 LIKELY ALGORITHM ISSUES:');
              console.log('    - Factor weights may be too aggressive');
              console.log('    - Confidence calculation may be inflated');
              console.log('    - Missing critical negative factors');
            }
            
            console.log('  🎯 SPECIFIC IMPROVEMENT TARGETS:');
            console.log('    1. Review factor weights in katabaticAnalyzer.ts');
            console.log('    2. Analyze weather conditions that led to failure');
            console.log('    3. Add penalty for similar failed patterns');
            console.log('    4. Recalibrate confidence thresholds');
          }
          console.log('=' .repeat(80));
          
          // Return the completed validation results for display
          const outcome = todaysPrediction.outcome;
          const predictedSuccess = todaysPrediction.prediction.probability >= 50;
          const predictionWasAccurate = predictedSuccess === outcome.success;
          
          return {
            predictionWasAccurate,
            actualSuccess: outcome.success,
            predictedSuccess,
            avgSpeed: outcome.actualWindSpeed,
            maxSpeed: outcome.actualMaxSpeed,
            goodWindPercentage: outcome.success ? 80 : 20, // Estimate based on success
            katabaticConsistency: 70, // Estimate
            predictedProbability: todaysPrediction.prediction.probability,
            predictionDate: todaysPrediction.predictionDate,
            alreadyValidated: true,
            validationNotes: outcome.notes || 'Validation completed earlier',
            failureAnalysis: !predictionWasAccurate ? {
              type: predictedSuccess && !outcome.success ? 'FALSE_POSITIVE' : 
                    !predictedSuccess && outcome.success ? 'FALSE_NEGATIVE' : 'CORRECT',
              summary: predictedSuccess && !outcome.success ? 
                       'Predicted good winds but conditions were poor' :
                       'Predicted poor winds but conditions were actually good',
              factorAnalysis: [
                `Actual wind speed: ${outcome.actualWindSpeed.toFixed(1)} mph`,
                `Wind success: ${outcome.success ? 'Good winds achieved' : 'Poor wind conditions'}`,
                'Detailed factor analysis from original validation'
              ],
              improvementSuggestions: [
                'Review prediction factors for this type of condition',
                'Analyze why prediction confidence didn\'t match reality',
                'Consider adjusting algorithm weights based on this outcome'
              ]
            } : null
          };
        }
        
        return null;
      }
      
      console.log('🔍 STARTING PREDICTION VALIDATION', {
        predictionDate: todayDateOnly.toDateString(),
        predictionId: pendingPrediction.id,
        predictedProbability: pendingPrediction.prediction.probability,
        predictedConfidence: pendingPrediction.prediction.confidence,
        actualWindDataPoints: actualWindData.length
      });
      
      // Filter wind data for dawn patrol window (6-8 AM)
      const dawnPatrolStart = new Date(todayDateOnly);
      dawnPatrolStart.setHours(6, 0, 0, 0);
      const dawnPatrolEnd = new Date(todayDateOnly);
      dawnPatrolEnd.setHours(8, 0, 0, 0);
      
      const dawnPatrolWinds = actualWindData.filter(point => 
        point.time >= dawnPatrolStart && point.time <= dawnPatrolEnd
      );
      
      if (dawnPatrolWinds.length === 0) {
        console.log('📊 No wind data available for validation window (6-8 AM)');
        return null;
      }
      
      // Calculate comprehensive wind metrics
      const avgSpeed = dawnPatrolWinds.reduce((sum, point) => sum + point.windSpeedMph, 0) / dawnPatrolWinds.length;
      const maxSpeed = Math.max(...dawnPatrolWinds.map(point => point.windSpeedMph));
      const minSpeed = Math.min(...dawnPatrolWinds.map(point => point.windSpeedMph));
      const avgDirection = dawnPatrolWinds.reduce((sum, point) => sum + point.windDirection, 0) / dawnPatrolWinds.length;
      
      // Determine if winds were actually good (15+ mph sustained)
      const goodWindPoints = dawnPatrolWinds.filter(point => point.windSpeedMph >= 15);
      const goodWindPercentage = (goodWindPoints.length / dawnPatrolWinds.length) * 100;
      const actualSuccess = goodWindPercentage >= 70; // 70% of time with good winds = success
      
      // Analyze wind direction consistency (katabatic should be downslope)
      const katabaticDirections = dawnPatrolWinds.filter(point => 
        (point.windDirection >= 270 && point.windDirection <= 360) || 
        (point.windDirection >= 0 && point.windDirection <= 90)
      );
      const katabaticConsistency = (katabaticDirections.length / dawnPatrolWinds.length) * 100;
      
      // Extract predicted conditions for comparison
      const predictedFactors = pendingPrediction.prediction.factors;
      const actualConditions = pendingPrediction.weatherConditions;
      
      // Determine prediction accuracy
      const predictedSuccess = pendingPrediction.prediction.probability >= 50;
      const predictionWasAccurate = predictedSuccess === actualSuccess;
      
      // Determine failure type for analysis
      const failureType = predictionWasAccurate ? 'CORRECT' : 
                         predictedSuccess && !actualSuccess ? 'FALSE_POSITIVE' : 
                         !predictedSuccess && actualSuccess ? 'FALSE_NEGATIVE' : 'CORRECT';
      
      console.log('📊 VALIDATION RESULTS:', {
        predicted: {
          probability: pendingPrediction.prediction.probability,
          confidence: pendingPrediction.prediction.confidence,
          recommendation: pendingPrediction.prediction.recommendation,
          predictedSuccess
        },
        actual: {
          avgSpeed: avgSpeed.toFixed(1),
          maxSpeed: maxSpeed.toFixed(1),
          goodWindPercentage: goodWindPercentage.toFixed(1),
          katabaticConsistency: katabaticConsistency.toFixed(1),
          actualSuccess
        },
        accuracy: {
          predictionWasAccurate,
          type: failureType
        }
      });
      
      // 🚨 DETAILED FAILURE ANALYSIS for algorithm improvement
      if (!predictionWasAccurate) {
        console.log('🔍 PREDICTION FAILURE ANALYSIS - ALGORITHM IMPROVEMENT NEEDED');
        console.log('=' .repeat(80));
        
        if (failureType === 'FALSE_POSITIVE') {
          console.log('❌ FALSE POSITIVE: Predicted good winds, but winds were poor');
          console.log('💡 IMPROVEMENT ANALYSIS:');
          
          // Analyze what factors were wrong
          if (avgSpeed < 10) {
            console.log('  • ISSUE: Wind speeds too low despite positive prediction');
            console.log(`    - Predicted probability: ${pendingPrediction.prediction.probability}%`);
            console.log(`    - Actual average speed: ${avgSpeed.toFixed(1)} mph`);
            console.log('    - RECOMMENDATION: Increase weight of wind speed factors');
          }
          
          if (katabaticConsistency < 50) {
            console.log('  • ISSUE: Wind direction not katabatic despite positive prediction');
            console.log(`    - Katabatic consistency: ${katabaticConsistency.toFixed(1)}%`);
            console.log('    - RECOMMENDATION: Strengthen wave pattern analysis requirements');
          }
          
          // Check specific factor predictions vs reality
          console.log('  • FACTOR ANALYSIS:');
          console.log(`    - Precipitation factor: ${predictedFactors.precipitation.meets ? 'MET' : 'NOT MET'} (predicted low precip)`);
          console.log(`    - Sky conditions: ${predictedFactors.skyConditions.meets ? 'MET' : 'NOT MET'} (predicted clear)`);
          console.log(`    - Pressure change: ${predictedFactors.pressureChange.meets ? 'MET' : 'NOT MET'} (${predictedFactors.pressureChange.change.toFixed(1)} hPa)`);
          console.log(`    - Temp differential: ${predictedFactors.temperatureDifferential.meets ? 'MET' : 'NOT MET'} (${predictedFactors.temperatureDifferential.differential.toFixed(1)}°F diff)`);
          console.log(`    - Wave pattern: ${predictedFactors.wavePattern.meets ? 'MET' : 'NOT MET'} (${predictedFactors.wavePattern.waveEnhancement})`);
          
        } else if (failureType === 'FALSE_NEGATIVE') {
          console.log('❌ FALSE NEGATIVE: Predicted poor winds, but winds were actually good');
          console.log('💡 IMPROVEMENT ANALYSIS:');
          
          console.log(`  • SURPRISE SUCCESS: Algorithm missed good conditions`);
          console.log(`    - Predicted probability: ${pendingPrediction.prediction.probability}%`);
          console.log(`    - Actual average speed: ${avgSpeed.toFixed(1)} mph`);
          console.log(`    - Good wind percentage: ${goodWindPercentage.toFixed(1)}%`);
          console.log('    - RECOMMENDATION: Review factor thresholds - may be too conservative');
          
          // Identify which factors might have been too restrictive
          let restrictiveFactors = [];
          if (!predictedFactors.precipitation.meets && predictedFactors.precipitation.value < 30) {
            restrictiveFactors.push('precipitation (may be too strict)');
          }
          if (!predictedFactors.skyConditions.meets && predictedFactors.skyConditions.clearPeriodCoverage > 30) {
            restrictiveFactors.push('sky conditions (may be too strict)');
          }
          if (!predictedFactors.temperatureDifferential.meets && predictedFactors.temperatureDifferential.differential > 2) {
            restrictiveFactors.push('temperature differential (may be too strict)');
          }
          
          if (restrictiveFactors.length > 0) {
            console.log(`    - POTENTIALLY TOO RESTRICTIVE: ${restrictiveFactors.join(', ')}`);
          }
        }
        
        console.log('🔧 RECOMMENDED CODE CHANGES:');
        console.log('  1. Check katabaticAnalyzer.ts factor weights and thresholds');
        console.log('  2. Review confidence calculation in determineConfidence()');
        console.log('  3. Consider adjusting probability calculation in calculateOverallProbability()');
        console.log('  4. Validate wave pattern analysis accuracy');
        console.log('=' .repeat(80));
      } else {
        console.log('✅ PREDICTION WAS ACCURATE! Algorithm working well for this case.');
      }
      
      // Create outcome record
      const outcome = {
        timestamp: new Date(),
        actualWindSpeed: avgSpeed,
        actualWindDirection: avgDirection,
        actualMaxSpeed: maxSpeed,
        actualMinSpeed: minSpeed,
        dataPoints: dawnPatrolWinds.length,
        success: actualSuccess,
        source: 'soda-lake' as const,
        notes: `Dawn patrol winds: ${avgSpeed.toFixed(1)} mph avg, ${goodWindPercentage.toFixed(1)}% good winds, ${katabaticConsistency.toFixed(1)}% katabatic direction`
      };
      
      // Update prediction with outcome
      await predictionTrackingService.updatePredictionOutcome(pendingPrediction.id, outcome);
      
      console.log('✅ Prediction validation completed and recorded');
      
      // Determine failure analysis details
      const failureAnalysisType = predictionWasAccurate ? 'CORRECT' : 
                                 predictedSuccess && !actualSuccess ? 'FALSE_POSITIVE' : 
                                 !predictedSuccess && actualSuccess ? 'FALSE_NEGATIVE' : 'CORRECT';

      // Generate improvement suggestions based on failure analysis
      const improvementSuggestions = [];
      const factorAnalysis = [];

      if (!predictionWasAccurate) {
        if (failureAnalysisType === 'FALSE_POSITIVE') {
          factorAnalysis.push('Predicted good winds but winds were poor');
          if (avgSpeed < 10) {
            factorAnalysis.push(`Wind speeds too low: ${avgSpeed.toFixed(1)} mph average`);
            improvementSuggestions.push('Increase weight of wind speed factors in prediction algorithm');
          }
          if (katabaticConsistency < 50) {
            factorAnalysis.push(`Wind direction not katabatic: ${katabaticConsistency.toFixed(1)}% consistency`);
            improvementSuggestions.push('Strengthen wave pattern analysis requirements');
          }
          improvementSuggestions.push('Review factor thresholds in katabaticAnalyzer.ts');
        } else if (failureAnalysisType === 'FALSE_NEGATIVE') {
          factorAnalysis.push('Predicted poor winds but winds were actually good');
          factorAnalysis.push(`Missed good conditions: ${avgSpeed.toFixed(1)} mph average, ${goodWindPercentage.toFixed(1)}% good winds`);
          improvementSuggestions.push('Review factor thresholds - may be too conservative');
          improvementSuggestions.push('Consider adjusting probability calculation in calculateOverallProbability()');
        }
        improvementSuggestions.push('Validate wave pattern analysis accuracy');
        improvementSuggestions.push('Check confidence calculation in determineConfidence()');
      }
      
      return {
        predictionWasAccurate,
        actualSuccess,
        predictedSuccess,
        avgSpeed,
        maxSpeed,
        goodWindPercentage,
        katabaticConsistency,
        predictedProbability: pendingPrediction.prediction.probability,
        predictionDate: pendingPrediction.predictionDate,
        failureAnalysis: !predictionWasAccurate ? {
          type: failureAnalysisType,
          summary: failureAnalysisType === 'FALSE_POSITIVE' ? 
                   'Predicted good winds but conditions were poor' :
                   'Predicted poor winds but conditions were actually good',
          factorAnalysis,
          improvementSuggestions,
          factors: predictedFactors,
          actualConditions: {
            avgSpeed,
            maxSpeed,
            goodWindPercentage,
            katabaticConsistency
          }
        } : null
      };
      
    } catch (error) {
      console.error('❌ Prediction validation failed:', error);
      return null;
    }
  }, []);

  /**
   * Get prediction accuracy metrics
   */
  const getPredictionAccuracy = useCallback(async () => {
    try {
      return await predictionTrackingService.getPredictionAccuracy();
    } catch (error) {
      console.error('❌ Failed to get prediction accuracy:', error);
      return null;
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  return {
    // Data
    weatherData,
    isLoading,
    error,
    lastUpdated,
    
    // Actions
    refreshData,
    clearCache,
    setApiKey,
    
    // Getters
    getCurrentConditions,
    getHourlyForecast,
    getWeatherForTimeWindow,
    getTemperatureDifferential,
    getKatabaticTemperatureDifferential,
    getPressureTrend,
    getBasicKatabaticConditions,
    isApiKeyConfigured,
    getDataSourceInfo,
    
    // Phase 2: Katabatic prediction engine
    katabaticAnalysis,
    getTomorrowPrediction,
    
    // Phase 2.5: Extended predictions
    getDayPrediction,
    getWeeklyPredictions,
    getForecastAvailability,
    
    // Phase 3: Prediction tracking & validation (June 14, 2025)
    logCurrentPrediction,
    validatePastPredictions,
    getPredictionAccuracy,
  };
};
