import { WeatherServiceData, WeatherDataPoint } from '@/services/weatherService';
import { FreeHistoricalWeatherService } from '@/services/freeHistoricalWeatherService';

/**
 * Katabatic wind prediction criteria for 5-factor hybrid system
 */
export interface KatabaticCriteria {
  maxPrecipitationProbability: number; // < 25%
  minCloudCoverClearPeriod: number;    // 2-5am clear period requirement
  minPressureChange: number;           // hPa change threshold
  minTemperatureDifferential: number;  // Mountain vs valley difference
  minWavePatternScore: number;         // Wave enhancement threshold
  
  clearSkyWindow: { start: string; end: string }; // "02:00" to "05:00"
  predictionWindow: { start: string; end: string }; // "06:00" to "08:00"
  minimumConfidence: number; // 0-100 scale
}

/**
 * Enhanced individual factor analysis for 5-factor Hybrid NOAA + OpenWeather prediction
 */
export interface KatabaticFactors {
  precipitation: {
    meets: boolean;
    value: number;
    threshold: number;
    confidence: number;
    dataSource: 'noaa' | 'openweather';
  };
  skyConditions: {
    meets: boolean;
    clearPeriodCoverage: number;
    averageCloudCover: number;
    confidence: number;
    dataSource: 'noaa' | 'openweather';
  };
  pressureChange: {
    meets: boolean;
    change: number;
    trend: 'rising' | 'falling' | 'stable';
    confidence: number;
    dataSource: 'openweather';
  };
  temperatureDifferential: {
    meets: boolean;
    differential: number;
    morrisonTemp: number;
    mountainTemp: number;
    confidence: number;
    dataSource: 'noaa' | 'openweather' | 'hybrid_thermal_cycle';
    analysisType: 'thermal_cycle' | 'unavailable'; // Type of analysis performed
    thermalCycleFailureReason?: string; // Specific reason why overnight analysis isn't available
  };
  wavePattern: {
    meets: boolean;
    transportWindAnalysis: string;
    mixingHeightData: number | null;
    waveEnhancement: 'positive' | 'neutral' | 'negative';
    confidence: number;
    dataSource: 'noaa';
  };
}

/**
 * Complete katabatic wind prediction result
 */
export interface KatabaticPrediction {
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  confidenceScore: number; // 0-100 numerical confidence
  factors: KatabaticFactors;
  recommendation: 'go' | 'maybe' | 'skip';
  explanation: string;
  detailedAnalysis: string;
  bestTimeWindow: {
    start: Date;
    end: Date;
    confidence: number;
  } | null;
  enhancedAnalysis?: {
    hasHistoricalData: boolean;
    historicalDifferential?: number;
    historicalConfidence?: number;
    historicalSource?: string;
    fallbackReason?: string;
  };
}

/**
 * Katabatic Analyzer Service for 5-factor hybrid system
 */
export class KatabaticAnalyzer {
  private static instance: KatabaticAnalyzer;
  
  private defaultCriteria: KatabaticCriteria = {
    maxPrecipitationProbability: 25,
    minCloudCoverClearPeriod: 45,
    minPressureChange: 1.0,
    minTemperatureDifferential: 3.2,
    minWavePatternScore: 50,
    clearSkyWindow: { start: '18:00', end: '06:00' }, // Updated: 6pm to 6am as requested
    predictionWindow: { start: '06:00', end: '08:00' },
    minimumConfidence: 50,
  };

  private constructor() {}

  public static getInstance(): KatabaticAnalyzer {
    if (!KatabaticAnalyzer.instance) {
      KatabaticAnalyzer.instance = new KatabaticAnalyzer();
    }
    return KatabaticAnalyzer.instance;
  }

  /**
   * Main prediction method - analyzes weather data and returns katabatic prediction
   */
  public analyzePrediction(
    weatherData: WeatherServiceData,
    criteria: Partial<KatabaticCriteria> = {}
  ): KatabaticPrediction {
    const activeCriteria = { ...this.defaultCriteria, ...criteria };
    
    const factors = this.analyzeFactors(weatherData, activeCriteria);
    const probability = this.calculateOverallProbability(factors);
    const { confidence, confidenceScore } = this.determineConfidence(factors, probability);
    const recommendation = this.generateRecommendation(probability, confidence);
    const explanation = this.generateExplanation(factors, probability, recommendation);
    const detailedAnalysis = this.generateDetailedAnalysis(factors, weatherData);
    const bestTimeWindow = this.findBestTimeWindow(weatherData, activeCriteria);

    return {
      probability,
      confidence,
      confidenceScore,
      factors,
      recommendation,
      explanation,
      detailedAnalysis,
      bestTimeWindow,
    };
  }

  private analyzeFactors(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ): KatabaticFactors {
    // PERFORMANCE OPTIMIZATION: Pre-index forecast data once for all factor analyses
    const morrisonIndex = this.indexForecastData(weatherData.morrison.hourlyForecast);
    const mountainIndex = this.indexForecastData(weatherData.mountain.hourlyForecast);
    
    return {
      precipitation: this.analyzePrecipitation(weatherData, criteria),
      skyConditions: this.analyzeSkyConditions(weatherData, criteria),
      pressureChange: this.analyzePressureChange(weatherData, criteria),
      temperatureDifferential: this.analyzeTemperatureDifferential(weatherData, criteria, morrisonIndex, mountainIndex),
      wavePattern: this.analyzeWavePattern(weatherData, criteria),
    };
  }

  /**
   * PERFORMANCE OPTIMIZATION: Index forecast data by date and hour for efficient lookups
   * This avoids repeated filtering and Date object creation
   */
  private indexForecastData(forecast: WeatherDataPoint[]): Map<string, Map<number, WeatherDataPoint>> {
    const index = new Map<string, Map<number, WeatherDataPoint>>();
    
    for (const point of forecast) {
      const pointDate = new Date(point.timestamp);
      const dateStr = pointDate.toDateString();
      const hour = pointDate.getHours();
      
      if (!index.has(dateStr)) {
        index.set(dateStr, new Map());
      }
      index.get(dateStr)!.set(hour, point);
    }
    
    return index;
  }

  /**
   * Find max temperature in afternoon heating window for thermal cycle analysis
   */
  private findAfternoonMaxTemperature(
    forecastIndex: Map<string, Map<number, WeatherDataPoint>>, 
    targetDate?: Date
  ): number | null {
    const searchDate = targetDate || new Date();
    const searchDateStr = searchDate.toDateString();
    
    const dayData = forecastIndex.get(searchDateStr);
    if (!dayData) return null;
    
    let maxTemp = -Infinity;
    let foundData = false;
    
    // Check afternoon hours (12-17)
    for (let hour = 12; hour <= 17; hour++) {
      const dataPoint = dayData.get(hour);
      if (dataPoint && dataPoint.temperature > maxTemp) {
        maxTemp = dataPoint.temperature;
        foundData = true;
      }
    }
    
    return foundData ? maxTemp : null;
  }

  /**
   * Find min temperature in pre-dawn cooling window for thermal cycle analysis
   */
  private findPreDawnMinTemperature(
    forecastIndex: Map<string, Map<number, WeatherDataPoint>>, 
    targetDate?: Date
  ): number | null {
    const today = targetDate || new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDateStr = tomorrow.toDateString();
    
    // Try tomorrow's pre-dawn hours first (3-7 AM)
    const tomorrowData = forecastIndex.get(tomorrowDateStr);
    if (tomorrowData) {
      let minTemp = Infinity;
      let foundData = false;
      
      for (let hour = 3; hour <= 7; hour++) {
        const dataPoint = tomorrowData.get(hour);
        if (dataPoint && dataPoint.temperature < minTemp) {
          minTemp = dataPoint.temperature;
          foundData = true;
        }
      }
      
      if (foundData) return minTemp;
    }
    
    // Fallback: try tonight's pre-dawn if tomorrow's isn't available
    const todayDateStr = today.toDateString();
    const todayData = forecastIndex.get(todayDateStr);
    if (todayData) {
      let minTemp = Infinity;
      let foundData = false;
      
      for (let hour = 3; hour <= 7; hour++) {
        const dataPoint = todayData.get(hour);
        if (dataPoint && dataPoint.temperature < minTemp) {
          minTemp = dataPoint.temperature;
          foundData = true;
        }
      }
      
      if (foundData) return minTemp;
    }
    
    return null;
  }

  private analyzePrecipitation(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const clearPeriodPrecip = this.getPrecipitationForWindow(
      weatherData.morrison.hourlyForecast,
      criteria.clearSkyWindow
    );
    
    const predictionPeriodPrecip = this.getPrecipitationForWindow(
      weatherData.morrison.hourlyForecast,
      criteria.predictionWindow
    );
    
    const maxPrecipitation = Math.max(clearPeriodPrecip, predictionPeriodPrecip);
    const meets = maxPrecipitation <= criteria.maxPrecipitationProbability;
    
    const confidence = meets 
      ? Math.min(100, 100 - (maxPrecipitation / criteria.maxPrecipitationProbability) * 100)
      : Math.max(0, 100 - ((maxPrecipitation - criteria.maxPrecipitationProbability) / criteria.maxPrecipitationProbability) * 100);

    return {
      meets,
      value: maxPrecipitation,
      threshold: criteria.maxPrecipitationProbability,
      confidence,
      dataSource: 'noaa' as const,
    };
  }

  private analyzeSkyConditions(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const morrisonCloudData = this.getCloudCoverForWindow(
      weatherData.morrison.hourlyForecast,
      criteria.clearSkyWindow
    );
    
    const mountainCloudData = this.getCloudCoverForWindow(
      weatherData.mountain.hourlyForecast,
      criteria.clearSkyWindow
    );
    
    const averageCloudCover = (morrisonCloudData.average + mountainCloudData.average) / 2;
    const clearPeriodCoverage = (morrisonCloudData.clearPercentage + mountainCloudData.clearPercentage) / 2;
    
    const meets = clearPeriodCoverage >= criteria.minCloudCoverClearPeriod;
    const confidence = meets 
      ? Math.min(100, clearPeriodCoverage * 1.3)
      : Math.max(20, clearPeriodCoverage * 1.2);

    return {
      meets,
      clearPeriodCoverage,
      averageCloudCover,
      confidence,
      dataSource: 'noaa' as const,
    };
  }

  private analyzePressureChange(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const pressureTrend = this.analyzePressureTrend(weatherData.morrison.hourlyForecast);
    const meets = Math.abs(pressureTrend.change) >= criteria.minPressureChange;
    
    const confidence = meets 
      ? Math.min(100, (Math.abs(pressureTrend.change) / criteria.minPressureChange) * 75)
      : Math.max(25, (Math.abs(pressureTrend.change) / criteria.minPressureChange) * 65);

    return {
      meets,
      change: pressureTrend.change,
      trend: pressureTrend.trend,
      confidence,
      dataSource: 'openweather' as const,
    };
  }

  private analyzeTemperatureDifferential(
    weatherData: WeatherServiceData, 
    criteria: KatabaticCriteria,
    morrisonIndex?: Map<string, Map<number, WeatherDataPoint>>,
    mountainIndex?: Map<string, Map<number, WeatherDataPoint>>
  ) {
    // Enhanced thermal cycle approach: Use afternoon max vs pre-dawn min
    // This models the actual physics of katabatic wind formation
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Use provided indexes or create them if not available (for backward compatibility)
    const morrisonForecastIndex = morrisonIndex || this.indexForecastData(weatherData.morrison.hourlyForecast);
    const mountainForecastIndex = mountainIndex || this.indexForecastData(weatherData.mountain.hourlyForecast);
    
    // Check if thermal analysis is available based on timing
    const availabilityCheck = this.determineThermalAnalysisAvailability(currentHour);
    
    let morrisonMaxTemp: number | null = null;
    let evergreenMinTemp: number | null = null;
    let thermalCycleFailureReason: string | undefined;
    
    if (availabilityCheck.isAvailable) {
      // Extract thermal cycle data
      const thermalData = this.extractThermalCycleData(
        morrisonForecastIndex, 
        mountainForecastIndex, 
        now
      );
      
      morrisonMaxTemp = thermalData.morrisonMaxTemp;
      evergreenMinTemp = thermalData.evergreenMinTemp;
      thermalCycleFailureReason = thermalData.failureReason;
    } else {
      thermalCycleFailureReason = availabilityCheck.failureReason;
    }
    
    // Log debug information
    this.logThermalDebugInfo(weatherData, now, currentHour, morrisonMaxTemp, evergreenMinTemp);
    
    // Determine analysis type and temperatures
    let morrisonTemp: number;
    let mountainTemp: number;
    let analysisType: 'thermal_cycle' | 'unavailable';
    
    if (currentHour >= 18 && morrisonMaxTemp !== null && evergreenMinTemp !== null) {
      // Proper overnight analysis available
      morrisonTemp = morrisonMaxTemp;
      mountainTemp = evergreenMinTemp;
      analysisType = 'thermal_cycle';
    } else {
      // Overnight analysis not available - return minimal confidence
      morrisonTemp = 0; // Placeholder values
      mountainTemp = 0;
      analysisType = 'unavailable';
    }
    
    const differential = morrisonTemp - mountainTemp;
    const meets = analysisType === 'thermal_cycle' && differential >= criteria.minTemperatureDifferential;
    const confidence = this.calculateThermalConfidence(analysisType, meets, differential, criteria);
    
    return this.createThermalAnalysisResult(
      meets,
      differential,
      morrisonTemp,
      mountainTemp,
      confidence,
      analysisType,
      thermalCycleFailureReason
    );
  }

  private analyzeWavePattern(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const morrisonWinds = this.getWindDataForWindow(
      weatherData.morrison.hourlyForecast, 
      criteria.predictionWindow
    );
    const mountainWinds = this.getWindDataForWindow(
      weatherData.mountain.hourlyForecast, 
      criteria.predictionWindow
    );
    
    const avgMorrisonWind = morrisonWinds.reduce((sum, point) => sum + point.windSpeed, 0) / morrisonWinds.length;
    const avgMountainWind = mountainWinds.reduce((sum, point) => sum + point.windSpeed, 0) / mountainWinds.length;
    
    const downslowDirections = morrisonWinds.filter(point => 
      (point.windDirection >= 270 && point.windDirection <= 360) || 
      (point.windDirection >= 0 && point.windDirection <= 90)
    ).length;
    
    const directionalConsistency = downslowDirections / morrisonWinds.length;
    const windShear = Math.abs(avgMorrisonWind - avgMountainWind);
    const estimatedMixingHeight = windShear > 2 ? 500 + (windShear * 100) : 300;
    
    let waveEnhancement: 'positive' | 'neutral' | 'negative' = 'neutral';
    let analysisText = '';
    
    if (directionalConsistency > 0.7 && avgMorrisonWind < 5 && windShear < 3) {
      waveEnhancement = 'positive';
      analysisText = `Favorable: ${(directionalConsistency * 100).toFixed(0)}% downslope wind consistency, low shear`;
    } else if (directionalConsistency < 0.3 || avgMorrisonWind > 8) {
      waveEnhancement = 'negative';
      analysisText = `Unfavorable: ${(directionalConsistency * 100).toFixed(0)}% downslope winds, high speeds`;
    } else {
      analysisText = `Neutral: ${(directionalConsistency * 100).toFixed(0)}% downslope winds, moderate conditions`;
    }
    
    const meets = waveEnhancement === 'positive';
    const confidence = meets ? 
      Math.min(90, directionalConsistency * 100 + (5 - Math.min(avgMorrisonWind, 5)) * 10) :
      Math.max(20, 60 - Math.max(0, avgMorrisonWind - 5) * 10);
    
    return {
      meets,
      transportWindAnalysis: analysisText,
      mixingHeightData: estimatedMixingHeight,
      waveEnhancement,
      confidence,
      dataSource: 'noaa' as const,
    };
  }

  private calculateOverallProbability(factors: KatabaticFactors): number {
    // UPDATED WEIGHTS - June 16, 2025: Enhanced critical factor analysis
    // Added VETO POWER for critical factors based on prediction failure analysis
    const weights = {
      temperatureDifferential: 0.30, // Most critical factor
      precipitation: 0.25,           // Unchanged
      skyConditions: 0.20,           // Decreased from 25% → 20%
      pressureChange: 0.15,          // Critical for katabatic formation
      wavePattern: 0.10,             // Critical for wind enhancement
    };

    // CRITICAL FACTOR ANALYSIS - June 16, 2025 Fix
    // These factors have "veto power" - if they fail, cap prediction probability
    const criticalFactors = ['pressureChange', 'wavePattern'];
    const failedCriticalFactors = criticalFactors.filter(factorName => 
      !factors[factorName as keyof KatabaticFactors].meets
    );

    console.log('🔍 CRITICAL FACTOR ANALYSIS:', {
      criticalFactors,
      failedCriticalFactors,
      pressureChange: factors.pressureChange.meets ? 'MET' : 'FAILED',
      wavePattern: factors.wavePattern.meets ? 'MET' : 'FAILED'
    });

    let weightedScore = 0;
    let totalWeight = 0;

    // Calculate weighted scores for each factor
    Object.entries(factors).forEach(([key, factor]) => {
      const weight = weights[key as keyof typeof weights];
      if (factor.meets) {
        weightedScore += factor.confidence * weight;
      } else {
        // ENHANCED PENALTY SYSTEM - June 16, 2025
        // Apply much stronger penalties for failed factors, especially critical ones
        const isCritical = criticalFactors.includes(key);
        const penaltyMultiplier = isCritical ? 0.3 : 0.7; // Critical factors get 70% penalty
        weightedScore += Math.max(0, factor.confidence * penaltyMultiplier) * weight;
        
        console.log(`  ❌ Factor ${key} failed:`, {
          isCritical,
          originalConfidence: factor.confidence,
          penaltyMultiplier,
          contributedScore: Math.max(0, factor.confidence * penaltyMultiplier) * weight
        });
      }
      totalWeight += weight;
    });

    const baseProbability = totalWeight > 0 ? (weightedScore / totalWeight) : 0;

    // CRITICAL FACTOR VETO SYSTEM - June 16, 2025
    // If critical factors fail, apply hard caps to prevent overconfident predictions
    let probabilityCap = 100;
    
    if (failedCriticalFactors.length >= 2) {
      // Both critical factors failed - hard cap at 35%
      probabilityCap = 35;
      console.log('🚨 CRITICAL VETO: Both critical factors failed, capping at 35%');
    } else if (failedCriticalFactors.length === 1) {
      // One critical factor failed - cap at 55%
      probabilityCap = 55;
      console.log('⚠️ CRITICAL VETO: One critical factor failed, capping at 55%');
    }

    // CONSERVATIVE MODE - Enhanced with critical factor consideration
    let bonusMultiplier = 1.0;
    const factorsMet = Object.values(factors).filter(f => f.meets).length;
    
    // Reduce bonuses when critical factors are missing
    if (failedCriticalFactors.length > 0) {
      console.log('📉 Reducing bonuses due to failed critical factors');
      if (factorsMet === 5) {
        bonusMultiplier = 1.10; // Reduced from 1.15
      } else if (factorsMet >= 4) {
        bonusMultiplier = 1.0;  // Reduced from 1.05
      } else if (factorsMet >= 3) {
        bonusMultiplier = 0.95; // Penalty for 3/5 with critical failures
      } else {
        bonusMultiplier = 0.75; // Strong penalty for <3 factors + critical failures
      }
    } else {
      // Original bonuses when no critical factors fail
      if (factorsMet === 5) {
        bonusMultiplier = 1.15;
      } else if (factorsMet >= 4) {
        bonusMultiplier = 1.05;
      } else if (factorsMet >= 3) {
        bonusMultiplier = 1.0;
      } else {
        bonusMultiplier = 0.85;
      }
    }

    // Special bonus for critical combinations - but only if no critical factors fail
    if (failedCriticalFactors.length === 0) {
      const hasCriticalCombo = factors.precipitation.meets && factors.skyConditions.meets && factors.temperatureDifferential.meets;
      if (hasCriticalCombo) {
        bonusMultiplier += 0.05;
      }

      if (factors.wavePattern.waveEnhancement === 'positive') {
        bonusMultiplier += 0.08;
      }
    }

    const calculatedProbability = baseProbability * bonusMultiplier;
    const finalProbability = Math.min(probabilityCap, calculatedProbability);

    console.log('🧮 PROBABILITY CALCULATION BREAKDOWN:', {
      baseProbability: baseProbability.toFixed(1),
      bonusMultiplier: bonusMultiplier.toFixed(2),
      calculatedProbability: calculatedProbability.toFixed(1),
      probabilityCap,
      finalProbability: finalProbability.toFixed(1),
      factorsMet: `${factorsMet}/5`,
      failedCriticalFactors
    });

    return Math.min(100, Math.max(0, Math.round(finalProbability)));
  }

  private determineConfidence(factors: KatabaticFactors, probability: number): { confidence: 'low' | 'medium' | 'high', confidenceScore: number } {
    const highConfidenceFactors = Object.values(factors).filter(f => f.confidence > 70).length;
    const avgConfidence = Object.values(factors).reduce((sum, f) => sum + f.confidence, 0) / 5;

    // Count how many factors are favorable
    const favorableFactors = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets,
      factors.wavePattern.meets
    ].filter(Boolean).length;

    // CONSERVATIVE MODE - June 14, 2025: More conservative confidence scoring
    // Apply stronger penalties and require more evidence for high confidence
    let adjustedConfidence = avgConfidence;
    
    // Penalize confidence when factors don't support the prediction
    if (favorableFactors === 0) {
      adjustedConfidence = Math.min(30, avgConfidence * 0.4); // Max 30% if 0/5 factors favorable
    } else if (favorableFactors === 1) {
      adjustedConfidence = Math.min(40, avgConfidence * 0.5); // Max 40% if 1/5 factors favorable  
    } else if (favorableFactors === 2) {
      adjustedConfidence = Math.min(55, avgConfidence * 0.7); // Max 55% if 2/5 factors favorable
    } else if (favorableFactors === 3) {
      adjustedConfidence = Math.min(65, avgConfidence * 0.8); // Max 65% if 3/5 factors favorable
    } else if (favorableFactors === 4) {
      adjustedConfidence = Math.min(75, avgConfidence * 0.9); // Max 75% if 4/5 factors favorable
    } else if (favorableFactors === 5) {
      adjustedConfidence = avgConfidence; // Full confidence only if ALL factors favorable
    }

    // CRITICAL FACTOR CHECK - Temperature differential is essential for katabatic winds
    // If temperature differential doesn't meet criteria, cap confidence at 50%
    if (!factors.temperatureDifferential.meets) {
      adjustedConfidence = Math.min(50, adjustedConfidence);
    }

    // REMOVED: Learning mode confidence cap - allowing full confidence range
    // adjustedConfidence = Math.min(65, adjustedConfidence);

    const confidenceScore = Math.round(adjustedConfidence);

    // Convert numeric confidence to string categories (realistic thresholds)
    let confidence: 'low' | 'medium' | 'high';
    if (adjustedConfidence >= 80) {
      confidence = 'high';
    } else if (adjustedConfidence >= 60) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return { confidence, confidenceScore };
  }

  private generateRecommendation(probability: number, confidence: 'low' | 'medium' | 'high'): 'go' | 'maybe' | 'skip' {
    if (probability >= 75 && confidence === 'high') {
      return 'go';
    } else if (probability >= 65 && confidence !== 'low') {
      return 'go';
    } else if (probability >= 45) {
      return 'maybe';
    } else {
      return 'skip';
    }
  }

  private generateExplanation(factors: KatabaticFactors, probability: number, recommendation: 'go' | 'maybe' | 'skip'): string {
    const metFactors = Object.entries(factors)
      .filter(([_, factor]) => factor.meets)
      .map(([key, _]) => {
        switch(key) {
          case 'precipitation': return 'rain';
          case 'skyConditions': return 'clear sky';
          case 'pressureChange': return 'pressure';
          case 'temperatureDifferential': return 'temp diff';
          case 'wavePattern': return 'wave pattern';
          default: return key;
        }
      });

    // REMOVED: Learning mode disclaimer - focusing on direct predictions
    // const learningModeNote = "🧠 Learning Mode: Predictions are more conservative while we validate accuracy with actual wind data.";

    if (recommendation === 'go') {
      return `Strong conditions! ${metFactors.length}/5 factors favorable (${metFactors.join(', ')}). ${probability}% hybrid prediction confidence.`;
    } else if (recommendation === 'maybe') {
      return `Mixed conditions. ${metFactors.length}/5 factors favorable (${metFactors.join(', ')}). ${probability}% hybrid prediction - check closer to dawn.`;
    } else {
      return `Poor conditions. Only ${metFactors.length}/5 factors favorable. ${probability}% hybrid prediction suggests waiting for better conditions.`;
    }
  }

  private generateDetailedAnalysis(factors: KatabaticFactors, weatherData: WeatherServiceData): string {
    const analysis: string[] = [];
    
    analysis.push(`🌤️ HYBRID 5-FACTOR ANALYSIS (NOAA + OpenWeather)`);
    analysis.push(`PRECIPITATION: ${factors.precipitation.meets ? '✅' : '❌'} ${factors.precipitation.value.toFixed(0)}% chance (${factors.precipitation.dataSource.toUpperCase()})`);
    analysis.push(`CLEAR SKY: ${factors.skyConditions.meets ? '✅' : '❌'} ${factors.skyConditions.clearPeriodCoverage.toFixed(0)}% clear period (${factors.skyConditions.dataSource.toUpperCase()})`);
    analysis.push(`PRESSURE: ${factors.pressureChange.meets ? '✅' : '❌'} ${factors.pressureChange.change > 0 ? '+' : ''}${factors.pressureChange.change.toFixed(1)} hPa (${factors.pressureChange.dataSource.toUpperCase()})`);
    analysis.push(`TEMP DIFF: ${factors.temperatureDifferential.meets ? '✅' : '❌'} ${factors.temperatureDifferential.differential.toFixed(1)}°C (${factors.temperatureDifferential.dataSource.toUpperCase()})`);
    analysis.push(`WAVE PATTERN: ${factors.wavePattern.meets ? '✅' : '❌'} ${factors.wavePattern.transportWindAnalysis} (${factors.wavePattern.dataSource.toUpperCase()})`);
    
    analysis.push(`\nData Quality: ${weatherData.dataSource === 'api' ? 'Live API' : weatherData.dataSource === 'cache' ? 'Cached' : 'Mock'}`);
    
    return analysis.join('\n');
  }

  private findBestTimeWindow(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const start = new Date(tomorrow);
    start.setHours(6, 0, 0, 0);
    
    const end = new Date(tomorrow);
    end.setHours(8, 0, 0, 0);
    
    return { start, end, confidence: 75 };
  }

  /**
   * Enhanced thermal differential analysis using FREE historical data when available
   * This runs as a background enhancement and doesn't block the main analysis
   */
  async getEnhancedThermalAnalysis(
    weatherData: WeatherServiceData, 
    criteria: KatabaticCriteria
  ): Promise<{
    hasHistoricalData: boolean;
    historicalDifferential?: number;
    historicalConfidence?: number;
    historicalSource?: string;
    fallbackReason?: string;
  }> {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Only try historical data if it's afternoon/evening (when we need today's data)
    if (currentHour < 12) {
      return {
        hasHistoricalData: false,
        fallbackReason: 'Too early in the day for historical analysis'
      };
    }
    
    try {
      console.log('🆓 Attempting FREE historical weather enhancement...');
      const historicalService = FreeHistoricalWeatherService.getInstance();
      const historicalData = await historicalService.getTodaysThermalCycleData();
      
      if (historicalData.dataAvailability.canCalculateThermalCycle && 
          historicalData.thermalDifferential !== null) {
        
        console.log('✅ FREE historical enhancement available:', {
          morrisonAfternoonMax: historicalData.morrison?.afternoonMax,
          evergreenMorningMin: historicalData.evergreen?.morningMin,
          thermalDifferential: historicalData.thermalDifferential
        });
        
        return {
          hasHistoricalData: true,
          historicalDifferential: historicalData.thermalDifferential,
          historicalConfidence: 95, // High confidence for actual observed data
          historicalSource: 'Open-Meteo actual observations (free)'
        };
      } else {
        return {
          hasHistoricalData: false,
          fallbackReason: 'Historical data incomplete for thermal cycle analysis'
        };
      }
    } catch (error) {
      console.log('⚠️ Historical enhancement unavailable:', error);
      return {
        hasHistoricalData: false,
        fallbackReason: `Historical service error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Determine if thermal cycle analysis is available based on current time
   */
  private determineThermalAnalysisAvailability(currentHour: number): {
    isAvailable: boolean;
    failureReason?: string;
  } {
    if (currentHour < 18) {
      return {
        isAvailable: false,
        failureReason: `Overnight analysis available after 6 PM. For most accurate katabatic predictions, check back when evening temperatures are established.`
      };
    }
    
    return { isAvailable: true };
  }

  /**
   * Extract thermal cycle temperature data using indexed forecasts
   */
  private extractThermalCycleData(
    morrisonIndex: Map<string, Map<number, WeatherDataPoint>>,
    mountainIndex: Map<string, Map<number, WeatherDataPoint>>,
    currentTime: Date
  ): {
    morrisonMaxTemp: number | null;
    evergreenMinTemp: number | null;
    failureReason?: string;
  } {
    const today = new Date(currentTime);
    
    // Look for today's afternoon maximum temperature
    const morrisonMaxTemp = this.findAfternoonMaxTemperature(morrisonIndex, today);
    
    // Look for tomorrow's dawn minimum temperature
    const evergreenMinTemp = this.findPreDawnMinTemperature(mountainIndex, currentTime);
    
    // Determine failure reasons if data is missing
    let failureReason: string | undefined;
    if (morrisonMaxTemp === null || evergreenMinTemp === null) {
      const reasons: string[] = [];
      if (morrisonMaxTemp === null) {
        reasons.push('evening temperature data (6 PM)');
      }
      if (evergreenMinTemp === null) {
        reasons.push('dawn temperature data (6 AM tomorrow)');
      }
      
      failureReason = `Overnight analysis incomplete - missing ${reasons.join(' and ')}. This may indicate weather API data gaps or insufficient forecast coverage.`;
    }
    
    return {
      morrisonMaxTemp,
      evergreenMinTemp,
      failureReason
    };
  }

  /**
   * Calculate confidence score for thermal differential analysis
   */
  private calculateThermalConfidence(
    analysisType: 'thermal_cycle' | 'unavailable',
    meets: boolean,
    differential: number,
    criteria: KatabaticCriteria
  ): number {
    if (analysisType === 'unavailable') {
      return 0; // No confidence when proper data isn't available
    }
    
    return meets 
      ? Math.min(100, (differential / criteria.minTemperatureDifferential) * 75)
      : Math.max(30, (differential / criteria.minTemperatureDifferential) * 55);
  }

  /**
   * Log debug information for thermal cycle analysis
   */
  private logThermalDebugInfo(
    weatherData: WeatherServiceData,
    currentTime: Date,
    currentHour: number,
    morrisonMaxTemp: number | null,
    evergreenMinTemp: number | null
  ): void {
    if (!__DEV__) return;
    
    console.log('🌡️ Thermal Cycle Debug Info:');
    console.log(`  Current time: ${currentTime.toLocaleString()}`);
    console.log(`  Current hour: ${currentHour}`);
    console.log(`  Morrison forecast hours: ${weatherData.morrison.hourlyForecast.length}`);
    console.log(`  Mountain forecast hours: ${weatherData.mountain.hourlyForecast.length}`);
    
    // Determine which day we're looking for afternoon data
    const afternoonSearchDate = currentHour >= 17 ? (() => {
      const tomorrow = new Date(currentTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })() : currentTime;
    
    console.log(`  Primary search for afternoon heating data on: ${afternoonSearchDate.toDateString()} (${currentHour >= 17 ? 'tomorrow' : 'today'})`);
    
    // Log available timestamps
    const morrisonTimes = weatherData.morrison.hourlyForecast.slice(0, 5).map(p => 
      `${new Date(p.timestamp).toLocaleString()} (${new Date(p.timestamp).getHours()}h)`
    );
    console.log(`  First 5 Morrison forecast times: ${morrisonTimes.join(', ')}`);
    
    // Check if we have any data for the target afternoon period
    const afternoonSearchDateStr = afternoonSearchDate.toDateString();
    const targetAfternoonData = weatherData.morrison.hourlyForecast.filter(point => {
      const pointDate = new Date(point.timestamp);
      const pointHour = pointDate.getHours();
      const pointDateStr = pointDate.toDateString();
      return pointDateStr === afternoonSearchDateStr && pointHour >= 12 && pointHour <= 17;
    });
    console.log(`  Target afternoon data points found: ${targetAfternoonData.length}`);
    
    if (targetAfternoonData.length > 0) {
      console.log(`  Target afternoon temps: ${targetAfternoonData.map(p => `${p.temperature.toFixed(1)}°C at ${new Date(p.timestamp).getHours()}h`).join(', ')}`);
    }
    
    console.log(`  Morrison max temp found: ${morrisonMaxTemp ? morrisonMaxTemp.toFixed(1) + '°C' : 'null'}`);
    console.log(`  Evergreen min temp found: ${evergreenMinTemp ? evergreenMinTemp.toFixed(1) + '°C' : 'null'}`);
  }

  /**
   * Create the thermal analysis result object
   */
  private createThermalAnalysisResult(
    meets: boolean,
    differential: number,
    morrisonTemp: number,
    mountainTemp: number,
    confidence: number,
    analysisType: 'thermal_cycle' | 'unavailable',
    thermalCycleFailureReason?: string
  ) {
    return {
      meets,
      differential,
      morrisonTemp,
      mountainTemp,
      confidence,
      dataSource: 'hybrid_thermal_cycle' as const,
      analysisType,
      thermalCycleFailureReason: thermalCycleFailureReason || undefined,
      thermalWindow: analysisType === 'thermal_cycle' ? {
        morrisonMax: '18:00 (Evening - start of cooling cycle)',
        evergreenMin: '06:00 (Dawn - end of cooling cycle)'
      } : undefined
    };
  }

  // Helper methods
  private getPrecipitationForWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }): number {
    const windowData = this.getDataForTimeWindow(forecast, window);
    if (windowData.length === 0) return 0;
    return Math.max(...windowData.map(point => point.precipitationProbability));
  }

  private getCloudCoverForWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }) {
    const windowData = this.getDataForTimeWindow(forecast, window);
    if (windowData.length === 0) return { average: 100, clearPercentage: 0 };
    
    const average = windowData.reduce((sum, point) => sum + point.cloudCover, 0) / windowData.length;
    const clearCount = windowData.filter(point => point.cloudCover < 30).length;
    const clearPercentage = (clearCount / windowData.length) * 100;
    
    return { average, clearPercentage };
  }

  private analyzePressureTrend(forecast: WeatherDataPoint[]) {
    if (forecast.length < 2) {
      return { trend: 'stable' as const, change: 0, rate: 0, confidence: 0, analysis: 'Insufficient data' };
    }

    const first = forecast[0];
    const last = forecast[Math.min(6, forecast.length - 1)];
    const change = last.pressure - first.pressure;
    const timeHours = (last.timestamp - first.timestamp) / (1000 * 60 * 60);
    const rate = timeHours > 0 ? change / timeHours : 0;

    let trend: 'rising' | 'falling' | 'stable';
    if (Math.abs(change) < 1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }

    const confidence = Math.min(90, Math.abs(change) * 20 + 30);

    return { trend, change, rate, confidence, analysis: `${trend} ${Math.abs(rate).toFixed(1)} hPa/hr` };
  }

  private getAverageTemperatureForWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }): number {
    const windowData = this.getDataForTimeWindow(forecast, window);
    if (windowData.length === 0) return 0;
    return windowData.reduce((sum, point) => sum + point.temperature, 0) / windowData.length;
  }

  private getWindDataForWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }): WeatherDataPoint[] {
    return this.getDataForTimeWindow(forecast, window);
  }

  private getDataForTimeWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }): WeatherDataPoint[];
  private getDataForTimeWindow(forecastIndex: Map<string, Map<number, WeatherDataPoint>>, window: { start: string; end: string }, targetDate?: Date): WeatherDataPoint[];
  private getDataForTimeWindow(
    forecastOrIndex: WeatherDataPoint[] | Map<string, Map<number, WeatherDataPoint>>, 
    window: { start: string; end: string },
    targetDate?: Date
  ): WeatherDataPoint[] {
    const startHour = parseInt(window.start.split(':')[0]);
    const endHour = parseInt(window.end.split(':')[0]);
    
    // Check if we're working with indexed data (performance optimized path)
    if (forecastOrIndex instanceof Map) {
      const result: WeatherDataPoint[] = [];
      const searchDate = targetDate || new Date();
      const searchDateStr = searchDate.toDateString();
      
      const dayData = forecastOrIndex.get(searchDateStr);
      if (!dayData) return result;
      
      if (startHour > endHour) {
        // Handle time windows that cross midnight (e.g., 18:00 to 06:00)
        for (let hour = startHour; hour <= 23; hour++) {
          const dataPoint = dayData.get(hour);
          if (dataPoint) result.push(dataPoint);
        }
        for (let hour = 0; hour <= endHour; hour++) {
          const dataPoint = dayData.get(hour);
          if (dataPoint) result.push(dataPoint);
        }
      } else {
        // Handle normal time windows (e.g., 06:00 to 08:00)
        for (let hour = startHour; hour <= endHour; hour++) {
          const dataPoint = dayData.get(hour);
          if (dataPoint) result.push(dataPoint);
        }
      }
      
      return result;
    }
    
    // Original implementation for backward compatibility
    return forecastOrIndex.filter(point => {
      const pointDate = new Date(point.timestamp);
      const pointHour = pointDate.getHours();
      
      if (startHour > endHour) {
        return pointHour >= startHour || pointHour <= endHour;
      }
      
      return pointHour >= startHour && pointHour <= endHour;
    });
  }
}

export const katabaticAnalyzer = KatabaticAnalyzer.getInstance();
