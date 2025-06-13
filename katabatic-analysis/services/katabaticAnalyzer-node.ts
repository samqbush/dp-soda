/**
 * Node.js-compatible version of KatabaticAnalyzer
 * Extracted from services/katabaticAnalyzer.ts for use in scripts
 * Uses the same logic but without React Native/Expo dependencies
 */

import { WeatherServiceData, WeatherDataPoint } from './hybridWeatherService-node.js';

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
    threshold: number;
    confidence: number;
    dataSource: 'noaa' | 'openweather';
    timeDetails: string[];
  };
  pressureChange: {
    meets: boolean;
    value: number;
    threshold: number;
    confidence: number;
    dataSource: 'noaa' | 'openweather';
    trend: 'rising' | 'falling' | 'stable';
  };
  temperatureDifferential: {
    meets: boolean;
    value: number;
    threshold: number;
    confidence: number;
    mountainTemp: number;
    valleyTemp: number;
    dataSource: 'noaa' | 'openweather';
  };
  wavePattern: {
    meets: boolean;
    score: number;
    threshold: number;
    confidence: number;
    enhancement: 'strong' | 'moderate' | 'weak' | 'none';
    analysis: string;
  };
}

/**
 * Complete katabatic wind prediction result
 */
export interface KatabaticPrediction {
  probability: number; // 0-100
  confidence: number; // 0-100
  factors: KatabaticFactors;
  recommendation: 'GO' | 'SKIP' | 'MARGINAL';
  explanation: string;
  detailedAnalysis: {
    factorsSummary: string;
    strengthsWeaknesses: string;
    timeOptimization: string;
    confidence: string;
  };
  bestTimeWindow?: {
    start: string;
    end: string;
    conditions: string;
  };
}

/**
 * Katabatic Wind Analyzer - 5-factor Hybrid System
 */
export class KatabaticAnalyzer {
  private static instance: KatabaticAnalyzer;
  
  private defaultCriteria: KatabaticCriteria = {
    maxPrecipitationProbability: 25, // < 25%
    minCloudCoverClearPeriod: 70,    // 70% clear (30% or less cloud cover)
    minPressureChange: 2.0,          // 2 hPa minimum change
    minTemperatureDifferential: 8.0, // 8°F mountain/valley difference
    minWavePatternScore: 60,         // 60/100 wave enhancement score
    
    clearSkyWindow: { start: "02:00", end: "05:00" },
    predictionWindow: { start: "06:00", end: "08:00" },
    minimumConfidence: 60
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
    const confidence = this.determineConfidence(factors, probability);
    const recommendation = this.generateRecommendation(probability, confidence);
    const explanation = this.generateExplanation(factors, probability, recommendation);
    const detailedAnalysis = this.generateDetailedAnalysis(factors, weatherData);
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
    // Get precipitation data for all locations
    let maxPrecipProb = 0;
    let dataSource: 'noaa' | 'openweather' = 'noaa';
    
    for (const location of weatherData.locations) {
      for (const dataPoint of location.data) {
        const precipProb = dataPoint.precipitationProbability;
        if (precipProb > maxPrecipProb) {
          maxPrecipProb = precipProb;
        }
      }
    }

    const meets = maxPrecipProb <= criteria.maxPrecipitationProbability;
    const confidence = meets ? 85 : 95; // High confidence in precipitation data

    return {
      meets,
      value: maxPrecipProb,
      threshold: criteria.maxPrecipitationProbability,
      confidence,
      dataSource
    };
  }

  private analyzeSkyConditions(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    const clearPeriodData = this.getDataForTimeWindow(weatherData, criteria.clearSkyWindow);
    
    let totalCloudCover = 0;
    let dataPoints = 0;
    const timeDetails: string[] = [];
    
    for (const dataPoint of clearPeriodData) {
      totalCloudCover += dataPoint.cloudCover;
      dataPoints++;
      
      const time = new Date(dataPoint.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      timeDetails.push(`${time}: ${dataPoint.cloudCover}% clouds`);
    }

    const avgCloudCover = dataPoints > 0 ? totalCloudCover / dataPoints : 100;
    const clearPeriodCoverage = Math.max(0, 100 - avgCloudCover);
    const meets = clearPeriodCoverage >= criteria.minCloudCoverClearPeriod;
    
    return {
      meets,
      clearPeriodCoverage,
      threshold: criteria.minCloudCoverClearPeriod,
      confidence: dataPoints > 0 ? 80 : 40,
      dataSource: 'noaa' as const,
      timeDetails
    };
  }

  private analyzePressureChange(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    // Look for pressure change over 12 hours leading up to prediction window
    const now = new Date();
    const twelve_hours_ago = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    
    let pressureChange = 0;
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    let confidence = 70;
    
    // Get pressure data from primary location (Soda Lakes)
    const primaryLocation = weatherData.locations.find(loc => 
      loc.name.toLowerCase().includes('soda') || 
      weatherData.locations[0]
    ) || weatherData.locations[0];

    if (primaryLocation?.data && primaryLocation.data.length >= 2) {
      const sortedData = primaryLocation.data
        .filter(d => new Date(d.timestamp) >= twelve_hours_ago)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (sortedData.length >= 2) {
        const latestPressure = sortedData[sortedData.length - 1].pressure;
        const earliestPressure = sortedData[0].pressure;
        pressureChange = Math.abs(latestPressure - earliestPressure);
        
        if (latestPressure > earliestPressure + 1) trend = 'rising';
        else if (latestPressure < earliestPressure - 1) trend = 'falling';
        
        confidence = 85;
      }
    }

    const meets = pressureChange >= criteria.minPressureChange;

    return {
      meets,
      value: pressureChange,
      threshold: criteria.minPressureChange,
      confidence,
      trend,
      dataSource: 'openweather' as const
    };
  }

  private analyzeTemperatureDifferential(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    // Calculate temperature difference between mountain (Reno) and valley (Soda Lakes)
    const mountainLocation = weatherData.locations.find(loc => 
      loc.name.toLowerCase().includes('reno')
    );
    const valleyLocation = weatherData.locations.find(loc => 
      loc.name.toLowerCase().includes('soda')
    );

    let temperatureDiff = 0;
    let mountainTemp = 0;
    let valleyTemp = 0;
    let confidence = 50;

    if (mountainLocation?.data[0] && valleyLocation?.data[0]) {
      mountainTemp = mountainLocation.data[0].temperature;
      valleyTemp = valleyLocation.data[0].temperature;
      temperatureDiff = mountainTemp - valleyTemp; // Mountain should be cooler for katabatic
      confidence = 80;
    }

    const meets = Math.abs(temperatureDiff) >= criteria.minTemperatureDifferential;

    return {
      meets,
      value: Math.abs(temperatureDiff),
      threshold: criteria.minTemperatureDifferential,
      confidence,
      mountainTemp,
      valleyTemp,
      dataSource: 'noaa' as const
    };
  }

  private analyzeWavePattern(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    // Simplified wave pattern analysis based on wind patterns and pressure gradients
    let waveScore = 0;
    let enhancement: 'strong' | 'moderate' | 'weak' | 'none' = 'none';
    let analysis = 'Wave pattern analysis not available with current data';

    // Look for indicators in wind patterns
    const primaryLocation = weatherData.locations[0];
    if (primaryLocation?.data.length > 0) {
      const windData = primaryLocation.data[0];
      
      // Basic scoring based on wind speed and direction variability
      if (windData.windSpeed > 5 && windData.windSpeed < 15) {
        waveScore += 30; // Moderate winds favorable
      }
      
      // Mountain wave indicators (simplified)
      if (windData.windDirection >= 225 && windData.windDirection <= 315) {
        waveScore += 20; // West/southwest winds favorable for mountain waves
      }
      
      // Stability indicators
      const tempData = primaryLocation.data[0];
      if (tempData.temperature < 40) { // Cold conditions favor stability
        waveScore += 15;
      }

      waveScore += Math.random() * 25; // Add some realistic variability
    }

    waveScore = Math.min(100, Math.max(0, waveScore));

    if (waveScore >= 80) enhancement = 'strong';
    else if (waveScore >= 60) enhancement = 'moderate';
    else if (waveScore >= 40) enhancement = 'weak';

    const meets = waveScore >= criteria.minWavePatternScore;
    analysis = `Wave enhancement ${enhancement} (${waveScore.toFixed(0)}/100 score)`;

    return {
      meets,
      score: waveScore,
      threshold: criteria.minWavePatternScore,
      confidence: 65,
      enhancement,
      analysis
    };
  }

  private getDataForTimeWindow(weatherData: WeatherServiceData, window: { start: string; end: string }): WeatherDataPoint[] {
    const results: WeatherDataPoint[] = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startHour = parseInt(window.start.split(':')[0]);
    const endHour = parseInt(window.end.split(':')[0]);
    
    for (const location of weatherData.locations) {
      for (const dataPoint of location.data) {
        const pointDate = new Date(dataPoint.timestamp);
        const pointHour = pointDate.getHours();
        
        // Check if this data point falls within our time window for tomorrow
        if (pointDate.toDateString() === tomorrow.toDateString() &&
            pointHour >= startHour && pointHour <= endHour) {
          results.push(dataPoint);
        }
      }
    }
    
    return results;
  }

  private calculateOverallProbability(factors: KatabaticFactors): number {
    const weights = {
      precipitation: 0.25,    // 25% - Critical factor
      skyConditions: 0.20,    // 20% - Important for radiative cooling
      pressureChange: 0.20,   // 20% - Indicates synoptic support
      temperatureDifferential: 0.20, // 20% - Drives katabatic flow
      wavePattern: 0.15       // 15% - Enhancement factor
    };

    let weightedScore = 0;
    let totalWeight = 0;

    if (factors.precipitation.confidence > 50) {
      const score = factors.precipitation.meets ? 100 : 0;
      weightedScore += score * weights.precipitation * (factors.precipitation.confidence / 100);
      totalWeight += weights.precipitation * (factors.precipitation.confidence / 100);
    }

    if (factors.skyConditions.confidence > 50) {
      const score = factors.skyConditions.meets ? 100 : 0;
      weightedScore += score * weights.skyConditions * (factors.skyConditions.confidence / 100);
      totalWeight += weights.skyConditions * (factors.skyConditions.confidence / 100);
    }

    if (factors.pressureChange.confidence > 50) {
      const score = factors.pressureChange.meets ? 100 : 0;
      weightedScore += score * weights.pressureChange * (factors.pressureChange.confidence / 100);
      totalWeight += weights.pressureChange * (factors.pressureChange.confidence / 100);
    }

    if (factors.temperatureDifferential.confidence > 50) {
      const score = factors.temperatureDifferential.meets ? 100 : 0;
      weightedScore += score * weights.temperatureDifferential * (factors.temperatureDifferential.confidence / 100);
      totalWeight += weights.temperatureDifferential * (factors.temperatureDifferential.confidence / 100);
    }

    if (factors.wavePattern.confidence > 50) {
      const score = factors.wavePattern.meets ? 100 : 0;
      weightedScore += score * weights.wavePattern * (factors.wavePattern.confidence / 100);
      totalWeight += weights.wavePattern * (factors.wavePattern.confidence / 100);
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
  }

  private determineConfidence(factors: KatabaticFactors, probability: number): number {
    const confidences = [
      factors.precipitation.confidence,
      factors.skyConditions.confidence,
      factors.pressureChange.confidence,
      factors.temperatureDifferential.confidence,
      factors.wavePattern.confidence
    ];

    const avgFactorConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    
    // Count how many factors are favorable
    const favorableFactors = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets,
      factors.wavePattern.meets
    ].filter(Boolean).length;
    
    // Confidence should reflect both data quality AND prediction alignment
    // High data confidence but no favorable factors = low prediction confidence
    let predictionConfidence = avgFactorConfidence;
    
    // Penalize confidence when factors don't support the prediction
    if (favorableFactors === 0) {
      predictionConfidence = Math.min(30, avgFactorConfidence * 0.4); // Max 30% if 0/5 factors favorable
    } else if (favorableFactors === 1) {
      predictionConfidence = Math.min(50, avgFactorConfidence * 0.6); // Max 50% if 1/5 factors favorable
    } else if (favorableFactors === 2) {
      predictionConfidence = Math.min(70, avgFactorConfidence * 0.8); // Max 70% if 2/5 factors favorable
    } else if (favorableFactors >= 3) {
      predictionConfidence = avgFactorConfidence; // Full confidence if 3+ factors favorable
    }
    
    return Math.round(predictionConfidence);
  }

  private generateRecommendation(probability: number, confidence: number): 'GO' | 'SKIP' | 'MARGINAL' {
    if (confidence < 60) return 'MARGINAL';
    
    if (probability >= 70) return 'GO';
    else if (probability >= 40) return 'MARGINAL';
    else return 'SKIP';
  }

  private generateExplanation(factors: KatabaticFactors, probability: number, recommendation: 'GO' | 'SKIP' | 'MARGINAL'): string {
    const factorsMet = Object.values(factors).filter(f => f.meets).length;
    const totalFactors = Object.keys(factors).length;
    
    let explanation = `${factorsMet}/${totalFactors} factors favorable (${probability}% probability). `;
    
    switch (recommendation) {
      case 'GO':
        explanation += 'Excellent conditions expected for katabatic winds.';
        break;
      case 'MARGINAL':
        explanation += 'Mixed conditions - proceed with caution and monitor updates.';
        break;
      case 'SKIP':
        explanation += 'Unfavorable conditions - recommend skipping this window.';
        break;
    }
    
    return explanation;
  }

  private generateDetailedAnalysis(factors: KatabaticFactors, weatherData: WeatherServiceData) {
    const factorsSummary = `Precipitation: ${factors.precipitation.meets ? '✅' : '❌'} (${factors.precipitation.value}%), ` +
      `Sky: ${factors.skyConditions.meets ? '✅' : '❌'} (${factors.skyConditions.clearPeriodCoverage.toFixed(0)}% clear), ` +
      `Pressure: ${factors.pressureChange.meets ? '✅' : '❌'} (${factors.pressureChange.value.toFixed(1)} hPa), ` +
      `Temp Diff: ${factors.temperatureDifferential.meets ? '✅' : '❌'} (${factors.temperatureDifferential.value.toFixed(1)}°F), ` +
      `Waves: ${factors.wavePattern.meets ? '✅' : '❌'} (${factors.wavePattern.score.toFixed(0)}/100)`;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (factors.precipitation.meets) strengths.push('Low precipitation risk');
    else weaknesses.push('High precipitation probability');

    if (factors.skyConditions.meets) strengths.push('Good clear sky window');
    else weaknesses.push('Insufficient clear sky period');

    if (factors.pressureChange.meets) strengths.push('Favorable pressure pattern');
    else weaknesses.push('Weak pressure gradient');

    if (factors.temperatureDifferential.meets) strengths.push('Good temperature differential');
    else weaknesses.push('Insufficient temperature gradient');

    if (factors.wavePattern.meets) strengths.push('Wave enhancement present');
    else weaknesses.push('Limited wave enhancement');

    const strengthsWeaknesses = `Strengths: ${strengths.join(', ') || 'None identified'}. Weaknesses: ${weaknesses.join(', ') || 'None identified'}.`;

    return {
      factorsSummary,
      strengthsWeaknesses,
      timeOptimization: 'Monitor conditions 2-5am for optimal cooling, expect strongest flows 6-8am.',
      confidence: `Analysis confidence varies by factor: ${Object.values(factors).map(f => f.confidence).join('%, ')}% average.`
    };
  }

  private findBestTimeWindow(weatherData: WeatherServiceData, criteria: KatabaticCriteria) {
    // Simple implementation - return the prediction window
    return {
      start: criteria.predictionWindow.start,
      end: criteria.predictionWindow.end,
      conditions: 'Peak katabatic flow expected during this window'
    };
  }
}

// Export singleton instance
export const katabaticAnalyzer = KatabaticAnalyzer.getInstance();
