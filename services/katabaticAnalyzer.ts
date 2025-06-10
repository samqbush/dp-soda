import { WeatherServiceData, WeatherDataPoint, LocationWeatherData } from '@/services/weatherService';

/**
 * Katabatic wind prediction criteria based on user requirements
 */
export interface KatabaticCriteria {
  // Primary conditions
  maxPrecipitationProbability: number; // < 20%
  minCloudCoverClearPeriod: number;    // 2-5am clear period requirement
  minPressureChange: number;           // hPa change threshold
  minTemperatureDifferential: number;  // Mountain vs valley difference
  
  // Time windows
  clearSkyWindow: { start: string; end: string }; // "02:00" to "05:00"
  predictionWindow: { start: string; end: string }; // "06:00" to "08:00"
  
  // Confidence thresholds
  minimumConfidence: number; // 0-100 scale
}

/**
 * Individual factor analysis for katabatic prediction
 */
export interface KatabaticFactors {
  precipitation: {
    meets: boolean;
    value: number;
    threshold: number;
    confidence: number;
  };
  skyConditions: {
    meets: boolean;
    clearPeriodCoverage: number; // % of 2-5am period that's clear
    averageCloudCover: number;
    confidence: number;
  };
  pressureChange: {
    meets: boolean;
    change: number; // hPa change over analysis period
    trend: 'rising' | 'falling' | 'stable';
    confidence: number;
  };
  temperatureDifferential: {
    meets: boolean;
    differential: number; // °C difference mountain vs valley
    morrisonTemp: number;
    mountainTemp: number;
    confidence: number;
  };
}

/**
 * Complete katabatic wind prediction result
 */
export interface KatabaticPrediction {
  probability: number;        // 0-100% overall probability
  confidence: 'low' | 'medium' | 'high';
  factors: KatabaticFactors;
  recommendation: 'go' | 'maybe' | 'skip';
  explanation: string;
  detailedAnalysis: string;
  bestTimeWindow: {
    start: Date;
    end: Date;
    confidence: number;
  } | null;
}

/**
 * Pressure trend analysis result
 */
export interface PressureTrendAnalysis {
  trend: 'rising' | 'falling' | 'stable';
  change: number; // hPa change over analysis period
  rate: number;   // hPa per hour
  confidence: number;
  analysis: string;
}

/**
 * Katabatic Analyzer Service
 * Implements sophisticated wind prediction algorithm based on meteorological conditions
 */
export class KatabaticAnalyzer {
  private static instance: KatabaticAnalyzer;
  
  // FURTHER IMPROVED criteria based on continued real-world feedback
  // Second round of adjustments after 60% prediction missed actual good katabatic conditions
  private defaultCriteria: KatabaticCriteria = {
    maxPrecipitationProbability: 25,  // Increased from 20% - light precip chance doesn't always kill katabatic
    minCloudCoverClearPeriod: 45,     // Reduced from 60% - mountain weather often has some clouds
    minPressureChange: 1.0,           // Reduced from 1.5 - smaller changes can still indicate good conditions
    minTemperatureDifferential: 3.5,  // Reduced from 4.0°C - more sensitive to temperature differences
    clearSkyWindow: { start: '02:00', end: '05:00' },
    predictionWindow: { start: '06:00', end: '08:00' },
    minimumConfidence: 50,            // Reduced from 60 - be less conservative overall
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
    
    // Analyze each factor
    const factors = this.analyzeFactors(weatherData, activeCriteria);
    
    // Calculate overall probability
    const probability = this.calculateOverallProbability(factors);
    
    // Determine confidence level
    const confidence = this.determineConfidence(factors, probability);
    
    // Generate recommendation
    const recommendation = this.generateRecommendation(probability, confidence, activeCriteria);
    
    // Create explanations
    const explanation = this.generateExplanation(factors, probability, recommendation);
    const detailedAnalysis = this.generateDetailedAnalysis(factors, weatherData);
    
    // Find best time window
    const bestTimeWindow = this.findBestTimeWindow(weatherData, activeCriteria);

    return {
      probability,
      confidence,
      factors,
      recommendation,
      explanation,
      detailedAnalysis,
      bestTimeWindow,
    };
  }

  /**
   * Analyze individual factors for katabatic conditions
   */
  private analyzeFactors(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ): KatabaticFactors {
    return {
      precipitation: this.analyzePrecipitation(weatherData, criteria),
      skyConditions: this.analyzeSkyConditions(weatherData, criteria),
      pressureChange: this.analyzePressureChange(weatherData, criteria),
      temperatureDifferential: this.analyzeTemperatureDifferential(weatherData, criteria),
    };
  }

  /**
   * Analyze precipitation probability for katabatic conditions
   */
  private analyzePrecipitation(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ) {
    const { clearSkyWindow, predictionWindow } = criteria;
    
    // Get precipitation data for relevant time windows
    const clearPeriodPrecip = this.getPrecipitationForWindow(
      weatherData.morrison.hourlyForecast,
      clearSkyWindow
    );
    
    const predictionPeriodPrecip = this.getPrecipitationForWindow(
      weatherData.morrison.hourlyForecast,
      predictionWindow
    );
    
    // Take the maximum precipitation probability from both periods
    const maxPrecipitation = Math.max(clearPeriodPrecip, predictionPeriodPrecip);
    
    const meets = maxPrecipitation <= criteria.maxPrecipitationProbability;
    
    // Calculate confidence based on how far below threshold we are
    const confidence = meets 
      ? Math.min(100, 100 - (maxPrecipitation / criteria.maxPrecipitationProbability) * 100)
      : Math.max(0, 100 - ((maxPrecipitation - criteria.maxPrecipitationProbability) / criteria.maxPrecipitationProbability) * 100);

    return {
      meets,
      value: maxPrecipitation,
      threshold: criteria.maxPrecipitationProbability,
      confidence,
    };
  }

  /**
   * Analyze sky conditions for radiative cooling
   */
  private analyzeSkyConditions(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ) {
    const { clearSkyWindow } = criteria;
    
    // Analyze cloud cover during 2-5am window for both locations
    const morrisonCloudData = this.getCloudCoverForWindow(
      weatherData.morrison.hourlyForecast,
      clearSkyWindow
    );
    
    const mountainCloudData = this.getCloudCoverForWindow(
      weatherData.mountain.hourlyForecast,
      clearSkyWindow
    );
    
    // Calculate average cloud cover (lower is better for katabatic)
    const averageCloudCover = (morrisonCloudData.average + mountainCloudData.average) / 2;
    
    // Calculate clear period coverage (what % of time is clear)
    const clearThreshold = 30; // Consider <30% cloud cover as "clear"
    const clearPeriodCoverage = (morrisonCloudData.clearPercentage + mountainCloudData.clearPercentage) / 2;
    
    const meets = clearPeriodCoverage >= criteria.minCloudCoverClearPeriod;
    
    // More generous confidence calculation - especially for partial cloud conditions
    const confidence = meets 
      ? Math.min(100, clearPeriodCoverage * 1.3) // Increased boost for clear conditions
      : Math.max(20, clearPeriodCoverage * 1.2); // Less harsh penalty, minimum 20% confidence

    return {
      meets,
      clearPeriodCoverage,
      averageCloudCover,
      confidence,
    };
  }

  /**
   * Analyze pressure changes indicating air movement
   */
  private analyzePressureChange(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ) {
    const pressureTrend = this.analyzePressureTrend(weatherData.morrison.hourlyForecast);
    
    const meets = Math.abs(pressureTrend.change) >= criteria.minPressureChange;
    
    // More generous confidence for pressure changes
    const confidence = meets 
      ? Math.min(100, (Math.abs(pressureTrend.change) / criteria.minPressureChange) * 75)
      : Math.max(25, (Math.abs(pressureTrend.change) / criteria.minPressureChange) * 65); // Minimum 25% confidence

    return {
      meets,
      change: pressureTrend.change,
      trend: pressureTrend.trend,
      confidence,
    };
  }

  /**
   * Analyze temperature differential between mountain and valley
   */
  private analyzeTemperatureDifferential(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ) {
    const { predictionWindow } = criteria;
    
    // Get average temperatures during prediction window
    const morrisonTemp = this.getAverageTemperatureForWindow(
      weatherData.morrison.hourlyForecast,
      predictionWindow
    );
    
    const mountainTemp = this.getAverageTemperatureForWindow(
      weatherData.mountain.hourlyForecast,
      predictionWindow
    );
    
    // Calculate differential (positive means morrison is warmer, which is good for katabatic)
    const differential = morrisonTemp - mountainTemp;
    
    const meets = differential >= criteria.minTemperatureDifferential;
    
    // More generous confidence for temperature differentials
    const confidence = meets 
      ? Math.min(100, (differential / criteria.minTemperatureDifferential) * 65)
      : Math.max(30, (differential / criteria.minTemperatureDifferential) * 55); // Minimum 30% confidence

    return {
      meets,
      differential,
      morrisonTemp,
      mountainTemp,
      confidence,
    };
  }

  /**
   * Calculate overall probability based on factor analysis
   * 
   * FURTHER IMPROVED ALGORITHM - Second round of calibration after continued underestimation
   * Previous version predicted 60% for actual good katabatic conditions
   * 
   * Latest improvements (Phase 2B):
   * - Further reduced threshold requirements for all factors
   * - More generous confidence scoring with minimum thresholds
   * - Enhanced penalty reduction for unmet factors  
   * - Stronger bonus system for multiple favorable factors
   * - Added "near miss" bonus for factors close to meeting criteria
   * - Overall goal: 75-90% predictions for actual good conditions
   */
  private calculateOverallProbability(factors: KatabaticFactors): number {
    // Weight factors based on importance for katabatic conditions
    const weights = {
      precipitation: 0.3,      // Very important - rain kills katabatic
      skyConditions: 0.25,     // Important for radiative cooling
      pressureChange: 0.25,    // Important for air movement
      temperatureDifferential: 0.2, // Somewhat important
    };
    
    // Calculate how many factors meet criteria for bonus calculation
    const factorsMet = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets,
    ].filter(Boolean).length;
    
    // Calculate weighted score with IMPROVED penalty system
    let weightedScore = 0;
    let totalWeight = 0;
    
    // Precipitation factor - reduced penalty further for marginal conditions
    if (factors.precipitation.meets) {
      weightedScore += factors.precipitation.confidence * weights.precipitation;
    } else {
      // Further reduced penalty: was -40, now -30 (light precip doesn't always kill katabatic)
      weightedScore += Math.max(0, factors.precipitation.confidence - 30) * weights.precipitation;
    }
    totalWeight += weights.precipitation;
    
    // Sky conditions factor - significantly reduced penalty for mountain weather reality
    if (factors.skyConditions.meets) {
      weightedScore += factors.skyConditions.confidence * weights.skyConditions;
    } else {
      // Further reduced penalty: was -20, now -15 (mountain weather often has partial clouds)
      weightedScore += Math.max(0, factors.skyConditions.confidence - 15) * weights.skyConditions;
    }
    totalWeight += weights.skyConditions;
    
    // Pressure change factor - minimal penalty for stable conditions
    if (factors.pressureChange.meets) {
      weightedScore += factors.pressureChange.confidence * weights.pressureChange;
    } else {
      // Further reduced penalty: was -25, now -20 (small pressure changes can still be significant)
      weightedScore += Math.max(0, factors.pressureChange.confidence - 20) * weights.pressureChange;
    }
    totalWeight += weights.pressureChange;
    
    // Temperature differential factor - very minimal penalty
    if (factors.temperatureDifferential.meets) {
      weightedScore += factors.temperatureDifferential.confidence * weights.temperatureDifferential;
    } else {
      // Further reduced penalty: was -15, now -10 (even small temp diffs can drive flow)
      weightedScore += Math.max(0, factors.temperatureDifferential.confidence - 10) * weights.temperatureDifferential;
    }
    totalWeight += weights.temperatureDifferential;
    
    // ENHANCED: Apply more generous bonus multiplier for multiple good factors
    // This better rewards when several factors align, even if not all are perfect
    let baseScore = weightedScore / totalWeight;
    if (factorsMet >= 3) {
      baseScore *= 1.15; // Increased from 10% to 15% bonus for 3+ factors
    }
    if (factorsMet >= 4) {
      baseScore *= 1.10; // Additional 10% bonus for all factors (25% total)
    }
    
    // Additional "near miss" bonus: if 2+ factors are very close to meeting criteria
    const nearMissFactors = [
      factors.precipitation.confidence > 60 && !factors.precipitation.meets,
      factors.skyConditions.confidence > 40 && !factors.skyConditions.meets,
      factors.pressureChange.confidence > 40 && !factors.pressureChange.meets,
      factors.temperatureDifferential.confidence > 60 && !factors.temperatureDifferential.meets,
    ].filter(Boolean).length;
    
    if (nearMissFactors >= 2) {
      baseScore *= 1.05; // 5% bonus for multiple "near miss" factors
    }
    
    return Math.round(Math.max(0, Math.min(100, baseScore)));
  }

  /**
   * Determine confidence level based on factors and probability
   */
  private determineConfidence(
    factors: KatabaticFactors,
    probability: number
  ): 'low' | 'medium' | 'high' {
    const factorsMet = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets,
    ].filter(Boolean).length;
    
    const averageConfidence = (
      factors.precipitation.confidence +
      factors.skyConditions.confidence +
      factors.pressureChange.confidence +
      factors.temperatureDifferential.confidence
    ) / 4;
    
    if (factorsMet >= 3 && averageConfidence >= 70 && probability >= 75) {
      return 'high';
    } else if (factorsMet >= 2 && averageConfidence >= 50 && probability >= 50) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate recommendation based on analysis
   */
  private generateRecommendation(
    probability: number,
    confidence: 'low' | 'medium' | 'high',
    criteria: KatabaticCriteria
  ): 'go' | 'maybe' | 'skip' {
    if (probability >= 75 && confidence === 'high') {
      return 'go';
    } else if (probability >= criteria.minimumConfidence && confidence !== 'low') {
      return 'maybe';
    } else {
      return 'skip';
    }
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(
    factors: KatabaticFactors,
    probability: number,
    recommendation: 'go' | 'maybe' | 'skip'
  ): string {
    const factorsMet = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets,
    ].filter(Boolean).length;
    
    const recommendations = {
      go: `Strong katabatic conditions predicted (${probability}% probability). ${factorsMet}/4 key factors are favorable.`,
      maybe: `Moderate katabatic conditions possible (${probability}% probability). ${factorsMet}/4 key factors are favorable. Monitor conditions closely.`,
      skip: `Poor katabatic conditions expected (${probability}% probability). Only ${factorsMet}/4 key factors are favorable.`,
    };
    
    return recommendations[recommendation];
  }

  /**
   * Generate detailed technical analysis
   */
  private generateDetailedAnalysis(
    factors: KatabaticFactors,
    weatherData: WeatherServiceData
  ): string {
    const analysis = [];
    
    // Helper function to convert Celsius to Fahrenheit
    const celsiusToFahrenheit = (celsius: number): number => {
      return (celsius * 9/5) + 32;
    };
    
    analysis.push(`PRECIPITATION: ${factors.precipitation.meets ? '✅' : '❌'} ${factors.precipitation.value.toFixed(1)}% (threshold: ${factors.precipitation.threshold}%)`);
    analysis.push(`SKY CONDITIONS: ${factors.skyConditions.meets ? '✅' : '❌'} ${factors.skyConditions.clearPeriodCoverage.toFixed(1)}% clear during 2-5am`);
    analysis.push(`PRESSURE CHANGE: ${factors.pressureChange.meets ? '✅' : '❌'} ${factors.pressureChange.change > 0 ? '+' : ''}${factors.pressureChange.change.toFixed(1)} hPa (${factors.pressureChange.trend})`);
    analysis.push(`TEMPERATURE DIFF: ${factors.temperatureDifferential.meets ? '✅' : '❌'} ${celsiusToFahrenheit(factors.temperatureDifferential.differential).toFixed(1)}°F (${celsiusToFahrenheit(factors.temperatureDifferential.morrisonTemp).toFixed(1)}°F valley, ${celsiusToFahrenheit(factors.temperatureDifferential.mountainTemp).toFixed(1)}°F mountain)`);
    
    return analysis.join('\n');
  }

  /**
   * Find the best time window for katabatic conditions
   */
  private findBestTimeWindow(
    weatherData: WeatherServiceData,
    criteria: KatabaticCriteria
  ): { start: Date; end: Date; confidence: number } | null {
    // For Phase 2, return the default prediction window
    // In Phase 3, we'll implement dynamic window optimization
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [startHour, startMinute] = criteria.predictionWindow.start.split(':').map(Number);
    const [endHour, endMinute] = criteria.predictionWindow.end.split(':').map(Number);
    
    const start = new Date(tomorrow);
    start.setHours(startHour, startMinute, 0, 0);
    
    const end = new Date(tomorrow);
    end.setHours(endHour, endMinute, 0, 0);
    
    return {
      start,
      end,
      confidence: 75, // Placeholder confidence
    };
  }

  // Helper methods for data analysis

  private getPrecipitationForWindow(
    forecast: WeatherDataPoint[],
    window: { start: string; end: string }
  ): number {
    const relevantPoints = this.getDataPointsForTimeWindow(forecast, window);
    return relevantPoints.length > 0 
      ? Math.max(...relevantPoints.map(p => p.precipitationProbability))
      : 0;
  }

  private getCloudCoverForWindow(
    forecast: WeatherDataPoint[],
    window: { start: string; end: string }
  ) {
    const relevantPoints = this.getDataPointsForTimeWindow(forecast, window);
    
    if (relevantPoints.length === 0) {
      return { average: 100, clearPercentage: 0 };
    }
    
    const average = relevantPoints.reduce((sum, p) => sum + p.cloudCover, 0) / relevantPoints.length;
    const clearCount = relevantPoints.filter(p => p.cloudCover < 30).length;
    const clearPercentage = (clearCount / relevantPoints.length) * 100;
    
    return { average, clearPercentage };
  }

  private getAverageTemperatureForWindow(
    forecast: WeatherDataPoint[],
    window: { start: string; end: string }
  ): number {
    const relevantPoints = this.getDataPointsForTimeWindow(forecast, window);
    return relevantPoints.length > 0 
      ? relevantPoints.reduce((sum, p) => sum + p.temperature, 0) / relevantPoints.length
      : 0;
  }

  private getDataPointsForTimeWindow(
    forecast: WeatherDataPoint[],
    window: { start: string; end: string }
  ): WeatherDataPoint[] {
    const [startHour] = window.start.split(':').map(Number);
    const [endHour] = window.end.split(':').map(Number);
    
    return forecast.filter(point => {
      const hour = new Date(point.timestamp).getHours();
      return hour >= startHour && hour <= endHour;
    });
  }

  public analyzePressureTrend(forecast: WeatherDataPoint[]): PressureTrendAnalysis {
    if (forecast.length < 2) {
      return {
        trend: 'stable',
        change: 0,
        rate: 0,
        confidence: 0,
        analysis: 'Insufficient data for pressure trend analysis',
      };
    }
    
    // Use last 12 hours of data for trend analysis
    const recentData = forecast.slice(-12);
    const firstPressure = recentData[0].pressure;
    const lastPressure = recentData[recentData.length - 1].pressure;
    const change = lastPressure - firstPressure;
    const hoursSpan = (recentData[recentData.length - 1].timestamp - recentData[0].timestamp) / (1000 * 60 * 60);
    const rate = hoursSpan > 0 ? change / hoursSpan : 0;
    
    let trend: 'rising' | 'falling' | 'stable';
    if (Math.abs(change) < 1.0) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }
    
    const confidence = Math.min(100, Math.abs(change) * 20);
    
    const analysis = `Pressure ${trend} by ${Math.abs(change).toFixed(1)} hPa over ${hoursSpan.toFixed(1)} hours`;
    
    return {
      trend,
      change,
      rate,
      confidence,
      analysis,
    };
  }
}

// Export singleton instance
export const katabaticAnalyzer = KatabaticAnalyzer.getInstance();
