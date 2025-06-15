import { WeatherServiceData, WeatherDataPoint } from '@/services/weatherService';

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
    dataSource: 'noaa' | 'openweather';
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
    minTemperatureDifferential: 3.5,
    minWavePatternScore: 50,
    clearSkyWindow: { start: '02:00', end: '05:00' },
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
    return {
      precipitation: this.analyzePrecipitation(weatherData, criteria),
      skyConditions: this.analyzeSkyConditions(weatherData, criteria),
      pressureChange: this.analyzePressureChange(weatherData, criteria),
      temperatureDifferential: this.analyzeTemperatureDifferential(weatherData, criteria),
      wavePattern: this.analyzeWavePattern(weatherData, criteria),
    };
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

  private analyzeTemperatureDifferential(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const morrisonTemp = this.getAverageTemperatureForWindow(
      weatherData.morrison.hourlyForecast,
      criteria.predictionWindow
    );
    
    const mountainTemp = this.getAverageTemperatureForWindow(
      weatherData.mountain.hourlyForecast,
      criteria.predictionWindow
    );
    
    const differential = morrisonTemp - mountainTemp;
    const meets = differential >= criteria.minTemperatureDifferential;
    
    const confidence = meets 
      ? Math.min(100, (differential / criteria.minTemperatureDifferential) * 65)
      : Math.max(30, (differential / criteria.minTemperatureDifferential) * 55);

    return {
      meets,
      differential,
      morrisonTemp,
      mountainTemp,
      confidence,
      dataSource: 'noaa' as const,
    };
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
    // UPDATED WEIGHTS - June 14, 2025: Increased temperature differential importance
    // Temperature inversion is CRITICAL for katabatic winds - learned from prediction failures
    const weights = {
      temperatureDifferential: 0.30, // Increased from 15% → 30% (most critical factor)
      precipitation: 0.25,           // Unchanged
      skyConditions: 0.20,           // Decreased from 25% → 20%
      pressureChange: 0.15,          // Decreased from 20% → 15%
      wavePattern: 0.10,             // Unchanged
    };

    let weightedScore = 0;
    let totalWeight = 0;

    // Calculate weighted scores for each factor
    Object.entries(factors).forEach(([key, factor]) => {
      const weight = weights[key as keyof typeof weights];
      if (factor.meets) {
        weightedScore += factor.confidence * weight;
      } else {
        // Apply penalty but don't completely zero out
        weightedScore += Math.max(0, factor.confidence - 20) * weight;
      }
      totalWeight += weight;
    });

    const baseProbability = totalWeight > 0 ? (weightedScore / totalWeight) : 0;

    // CONSERVATIVE MODE - June 14, 2025: More demanding requirements for high probability
    // Require ALL 5 factors favorable for >90% probability to prevent overconfident predictions
    let bonusMultiplier = 1.0;
    const factorsMet = Object.values(factors).filter(f => f.meets).length;
    
    if (factorsMet === 5) {
      bonusMultiplier = 1.15; // Full bonus only when all factors align
    } else if (factorsMet >= 4) {
      bonusMultiplier = 1.05; // Reduced bonus for 4/5 factors
    } else if (factorsMet >= 3) {
      bonusMultiplier = 1.0; // No bonus for 3/5 factors
    } else {
      bonusMultiplier = 0.85; // Penalty for <3 factors
    }

    // Special bonus for critical combinations - but require temperature differential
    const hasCriticalCombo = factors.precipitation.meets && factors.skyConditions.meets && factors.temperatureDifferential.meets;
    if (hasCriticalCombo) {
      bonusMultiplier += 0.05;
    }

    if (factors.wavePattern.waveEnhancement === 'positive') {
      bonusMultiplier += 0.08;
    }

    const finalProbability = Math.min(100, baseProbability * bonusMultiplier);
    return Math.round(finalProbability);
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

    // LEARNING MODE CAP - June 14, 2025: Cap confidence at 65% until validation system proves accuracy
    adjustedConfidence = Math.min(65, adjustedConfidence);

    const confidenceScore = Math.round(adjustedConfidence);

    // Convert numeric confidence to string categories (adjusted thresholds)
    let confidence: 'low' | 'medium' | 'high';
    if (adjustedConfidence >= 60) {
      confidence = 'high';
    } else if (adjustedConfidence >= 40) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return { confidence, confidenceScore };
  }

  private generateRecommendation(probability: number, confidence: 'low' | 'medium' | 'high'): 'go' | 'maybe' | 'skip' {
    if (probability >= 70 && confidence !== 'low') {
      return 'go';
    } else if (probability >= 50 && confidence === 'high') {
      return 'go';
    } else if (probability >= 40) {
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

    // LEARNING MODE DISCLAIMER - June 14, 2025
    const learningModeNote = "🧠 Learning Mode: Predictions are more conservative while we validate accuracy with actual wind data.";

    if (recommendation === 'go') {
      return `Strong conditions! ${metFactors.length}/5 factors favorable (${metFactors.join(', ')}). ${probability}% hybrid prediction confidence. ${learningModeNote}`;
    } else if (recommendation === 'maybe') {
      return `Mixed conditions. ${metFactors.length}/5 factors favorable (${metFactors.join(', ')}). ${probability}% hybrid prediction - check closer to dawn. ${learningModeNote}`;
    } else {
      return `Poor conditions. Only ${metFactors.length}/5 factors favorable. ${probability}% hybrid prediction suggests waiting for better conditions. ${learningModeNote}`;
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

  private getDataForTimeWindow(forecast: WeatherDataPoint[], window: { start: string; end: string }): WeatherDataPoint[] {
    const startHour = parseInt(window.start.split(':')[0]);
    const endHour = parseInt(window.end.split(':')[0]);
    
    return forecast.filter(point => {
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
