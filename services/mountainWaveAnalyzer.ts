import { WeatherServiceData, WeatherDataPoint } from '@/services/weatherService';

/**
 * Mountain Wave Analysis Result
 * Based on research from "Interaction of Katabatic Flow and Mountain Waves"
 */
export interface MountainWaveAnalysis {
  froudeNumber: number;                    // Fr = U/NH - optimal range 0.4-0.6
  waveAmplitude: 'low' | 'moderate' | 'high';
  waveOrganization: 'organized' | 'mixed' | 'chaotic';
  surfaceCoupling: 'strong' | 'moderate' | 'weak';
  wavePropagationPotential: number;        // 0-100 score
  enhancementPotential: 'positive' | 'neutral' | 'negative';
  analysis: string;
}

/**
 * Atmospheric Stability Profile Analysis
 */
export interface StabilityProfile {
  surfaceStability: number;                // Brunt-Väisälä frequency at surface (s⁻¹)
  waveLevelStability: number;              // N at 2-4km altitude (s⁻¹)
  stabilityGradient: 'increasing' | 'decreasing' | 'uniform';
  couplingEfficiency: number;              // 0-100 - how well waves couple to surface
  profileOptimal: boolean;                 // True if profile supports MKI
  analysis: string;
}

/**
 * Mountain Wave Factor for 6-factor analysis system
 */
export interface WavePatternFactor {
  meets: boolean;
  froudeNumber: number;
  waveEnhancement: 'positive' | 'neutral' | 'negative';
  confidence: number;
  analysis: string;
}

/**
 * Atmospheric Stability Factor for 6-factor analysis system  
 */
export interface StabilityFactor {
  meets: boolean;
  surfaceStability: number;
  couplingEfficiency: number;
  confidence: number;
  analysis: string;
}

/**
 * Mountain Wave Analyzer Service
 * Implements MKI (Mountain Wave-Katabatic Interaction) analysis
 */
export class MountainWaveAnalyzer {
  private static instance: MountainWaveAnalyzer;

  // Colorado Front Range typical parameters
  private static readonly TERRAIN_HEIGHT = 2000;     // meters (typical barrier height)
  private static readonly OPTIMAL_FR_MIN = 0.4;      // Minimum optimal Froude number
  private static readonly OPTIMAL_FR_MAX = 0.6;      // Maximum optimal Froude number
  private static readonly GRAVITY = 9.81;            // m/s²
  private static readonly STANDARD_TEMP = 288.15;    // K (15°C)

  private constructor() {}

  public static getInstance(): MountainWaveAnalyzer {
    if (!MountainWaveAnalyzer.instance) {
      MountainWaveAnalyzer.instance = new MountainWaveAnalyzer();
    }
    return MountainWaveAnalyzer.instance;
  }

  /**
   * Analyze mountain wave conditions for MKI
   */
  public analyzeMountainWaves(weatherData: WeatherServiceData): MountainWaveAnalysis {
    try {
      // Get upstream wind conditions (2-4km level approximated from surface data)
      const upstreamWind = this.estimateUpstreamWind(weatherData);
      
      // Calculate atmospheric stability
      const stability = this.calculateAtmosphericStability(weatherData);
      
      // Calculate Froude number
      const froudeNumber = this.calculateFroudeNumber(upstreamWind, stability);
      
      // Assess wave characteristics
      const waveAmplitude = this.assessWaveAmplitude(froudeNumber, upstreamWind);
      const waveOrganization = this.assessWaveOrganization(froudeNumber, weatherData);
      const surfaceCoupling = this.assessSurfaceCoupling(stability, weatherData);
      
      // Calculate overall wave propagation potential
      const wavePropagationPotential = this.calculateWavePropagationPotential(
        froudeNumber, waveAmplitude, waveOrganization, surfaceCoupling
      );
      
      // Determine enhancement potential for katabatic flow
      const enhancementPotential = this.determineEnhancementPotential(
        froudeNumber, wavePropagationPotential, surfaceCoupling
      );
      
      const analysis = this.generateWaveAnalysis(
        froudeNumber, waveAmplitude, waveOrganization, enhancementPotential
      );

      return {
        froudeNumber,
        waveAmplitude,
        waveOrganization,
        surfaceCoupling,
        wavePropagationPotential,
        enhancementPotential,
        analysis
      };
    } catch (error) {
      console.error('Mountain wave analysis error:', error);
      return this.getDefaultWaveAnalysis();
    }
  }

  /**
   * Analyze atmospheric stability profile for MKI
   */
  public analyzeStabilityProfile(weatherData: WeatherServiceData): StabilityProfile {
    try {
      // Calculate surface stability from temperature gradient
      const surfaceStability = this.calculateSurfaceStability(weatherData);
      
      // Estimate wave-level stability (2-4km) from available data
      const waveLevelStability = this.estimateWaveLevelStability(weatherData);
      
      // Determine stability gradient
      const stabilityGradient = this.assessStabilityGradient(
        surfaceStability, waveLevelStability
      );
      
      // Calculate coupling efficiency between levels
      const couplingEfficiency = this.calculateCouplingEfficiency(
        surfaceStability, waveLevelStability, stabilityGradient
      );
      
      // Determine if profile is optimal for MKI
      const profileOptimal = this.isProfileOptimalForMKI(
        surfaceStability, waveLevelStability, couplingEfficiency
      );
      
      const analysis = this.generateStabilityAnalysis(
        surfaceStability, waveLevelStability, couplingEfficiency, profileOptimal
      );

      return {
        surfaceStability,
        waveLevelStability,
        stabilityGradient,
        couplingEfficiency,
        profileOptimal,
        analysis
      };
    } catch (error) {
      console.error('Stability profile analysis error:', error);
      return this.getDefaultStabilityProfile();
    }
  }

  /**
   * Calculate Wave Pattern Factor for 6-factor system
   */
  public calculateWavePatternFactor(
    waveAnalysis: MountainWaveAnalysis
  ): WavePatternFactor {
    const { froudeNumber, enhancementPotential, wavePropagationPotential } = waveAnalysis;
    
    // Determine if factor meets criteria (optimal Froude number range)
    const meets = froudeNumber >= MountainWaveAnalyzer.OPTIMAL_FR_MIN && 
                  froudeNumber <= MountainWaveAnalyzer.OPTIMAL_FR_MAX &&
                  enhancementPotential === 'positive';
    
    // Calculate confidence based on how well conditions align
    let confidence = 0;
    if (froudeNumber >= 0.4 && froudeNumber <= 0.6) {
      confidence = Math.min(100, wavePropagationPotential * 1.2);
    } else if (froudeNumber >= 0.3 && froudeNumber <= 0.7) {
      confidence = Math.min(75, wavePropagationPotential);
    } else if (froudeNumber >= 0.2 && froudeNumber <= 0.8) {
      confidence = Math.min(50, wavePropagationPotential * 0.8);
    } else {
      confidence = Math.max(10, wavePropagationPotential * 0.5);
    }

    const analysis = this.generateWaveFactorAnalysis(froudeNumber, enhancementPotential, meets);

    return {
      meets,
      froudeNumber,
      waveEnhancement: enhancementPotential,
      confidence,
      analysis
    };
  }

  /**
   * Calculate Atmospheric Stability Factor for 6-factor system
   */
  public calculateStabilityFactor(
    stabilityProfile: StabilityProfile
  ): StabilityFactor {
    const { surfaceStability, couplingEfficiency, profileOptimal } = stabilityProfile;
    
    const meets = profileOptimal && couplingEfficiency >= 60;
    
    // Calculate confidence based on stability structure quality
    let confidence = 0;
    if (profileOptimal && couplingEfficiency >= 80) {
      confidence = 100;
    } else if (profileOptimal && couplingEfficiency >= 60) {
      confidence = 75;
    } else if (couplingEfficiency >= 40) {
      confidence = 50;
    } else {
      confidence = Math.max(20, couplingEfficiency);
    }

    const analysis = this.generateStabilityFactorAnalysis(
      surfaceStability, couplingEfficiency, profileOptimal
    );

    return {
      meets,
      surfaceStability,
      couplingEfficiency,
      confidence,
      analysis
    };
  }

  // Private helper methods

  private estimateUpstreamWind(weatherData: WeatherServiceData): number {
    // Estimate upper-level wind from surface wind + typical Colorado Front Range scaling
    const morrisonWind = this.getAverageWindSpeed(weatherData.morrison.hourlyForecast);
    const mountainWind = this.getAverageWindSpeed(weatherData.mountain.hourlyForecast);
    
    // Upper-level winds typically 1.5-2x surface winds in this region
    return Math.max(morrisonWind, mountainWind) * 1.7;
  }

  private calculateAtmosphericStability(weatherData: WeatherServiceData): number {
    // Calculate Brunt-Väisälä frequency from temperature profile
    const tempGradient = this.calculateTemperatureGradient(weatherData);
    
    // N² = (g/T) * (dT/dz + g/cp)
    // Simplified calculation for available data
    const dryAdiabaticLapse = 0.0098; // K/m
    const actualLapse = tempGradient / 1000; // Convert to K/m
    
    return Math.sqrt(
      Math.max(0, (MountainWaveAnalyzer.GRAVITY / MountainWaveAnalyzer.STANDARD_TEMP) * 
      (dryAdiabaticLapse - actualLapse))
    );
  }

  private calculateFroudeNumber(upstreamWind: number, stability: number): number {
    // Fr = U / (N * H)  
    return upstreamWind / (stability * MountainWaveAnalyzer.TERRAIN_HEIGHT);
  }

  private assessWaveAmplitude(froudeNumber: number, windSpeed: number): 'low' | 'moderate' | 'high' {
    if (froudeNumber >= 0.4 && froudeNumber <= 0.6 && windSpeed >= 10) {
      return 'high';
    } else if (froudeNumber >= 0.3 && froudeNumber <= 0.7 && windSpeed >= 6) {
      return 'moderate';
    } else {
      return 'low';
    }
  }

  private assessWaveOrganization(froudeNumber: number, weatherData: WeatherServiceData): 'organized' | 'mixed' | 'chaotic' {
    // Organized waves occur with optimal Fr and stable conditions
    if (froudeNumber >= 0.4 && froudeNumber <= 0.6) {
      const windConsistency = this.assessWindConsistency(weatherData);
      return windConsistency > 0.7 ? 'organized' : 'mixed';
    } else if (froudeNumber >= 0.2 && froudeNumber <= 0.8) {
      return 'mixed';
    } else {
      return 'chaotic';
    }
  }

  private assessSurfaceCoupling(stability: number, weatherData: WeatherServiceData): 'strong' | 'moderate' | 'weak' {
    // Strong coupling occurs with good surface stability
    if (stability > 0.01) {
      return 'strong';
    } else if (stability > 0.005) {
      return 'moderate';
    } else {
      return 'weak';
    }
  }

  private calculateWavePropagationPotential(
    froudeNumber: number,
    amplitude: 'low' | 'moderate' | 'high',
    organization: 'organized' | 'mixed' | 'chaotic',
    coupling: 'strong' | 'moderate' | 'weak'
  ): number {
    let score = 0;
    
    // Froude number contribution (40% of total)
    if (froudeNumber >= 0.4 && froudeNumber <= 0.6) {
      score += 40;
    } else if (froudeNumber >= 0.3 && froudeNumber <= 0.7) {
      score += 30;
    } else if (froudeNumber >= 0.2 && froudeNumber <= 0.8) {
      score += 20;
    }
    
    // Wave amplitude contribution (25% of total)
    switch (amplitude) {
      case 'high': score += 25; break;
      case 'moderate': score += 15; break;
      case 'low': score += 5; break;
    }
    
    // Wave organization contribution (20% of total)
    switch (organization) {
      case 'organized': score += 20; break;
      case 'mixed': score += 10; break;
      case 'chaotic': score += 0; break;
    }
    
    // Surface coupling contribution (15% of total)
    switch (coupling) {
      case 'strong': score += 15; break;
      case 'moderate': score += 10; break;
      case 'weak': score += 5; break;
    }
    
    return Math.min(100, score);
  }

  private determineEnhancementPotential(
    froudeNumber: number,
    wavePropagation: number,
    coupling: 'strong' | 'moderate' | 'weak'
  ): 'positive' | 'neutral' | 'negative' {
    if (froudeNumber >= 0.4 && froudeNumber <= 0.6 && wavePropagation >= 60 && coupling !== 'weak') {
      return 'positive';
    } else if (froudeNumber < 0.2 || froudeNumber > 1.0 || wavePropagation < 30) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }

  // Additional helper methods for calculations

  private getAverageWindSpeed(forecast: WeatherDataPoint[]): number {
    if (!forecast.length) return 0;
    const totalSpeed = forecast.reduce((sum, point) => sum + (point.windSpeed || 0), 0);
    return totalSpeed / forecast.length;
  }

  private calculateTemperatureGradient(weatherData: WeatherServiceData): number {
    // Calculate temperature difference between mountain and valley stations
    const morrisonTemp = this.getAverageTemperature(weatherData.morrison.hourlyForecast);
    const mountainTemp = this.getAverageTemperature(weatherData.mountain.hourlyForecast);
    
    // Typical elevation difference between stations (~500m)
    const elevationDiff = 500; // meters
    
    return (mountainTemp - morrisonTemp) / elevationDiff * 1000; // K/km
  }

  private getAverageTemperature(forecast: WeatherDataPoint[]): number {
    if (!forecast.length) return 0;
    const totalTemp = forecast.reduce((sum, point) => sum + (point.temperature || 0), 0);
    return totalTemp / forecast.length;
  }

  private calculateSurfaceStability(weatherData: WeatherServiceData): number {
    // Calculate from overnight cooling and temperature profile
    const tempGradient = this.calculateTemperatureGradient(weatherData);
    return Math.max(0, tempGradient * 0.0001); // Simplified stability calculation
  }

  private estimateWaveLevelStability(weatherData: WeatherServiceData): number {
    // Estimate mid-level stability from surface conditions
    const surfaceStability = this.calculateSurfaceStability(weatherData);
    // Typically decreases with altitude in stable conditions
    return surfaceStability * 0.8;
  }

  private assessStabilityGradient(
    surface: number, 
    waveLevel: number
  ): 'increasing' | 'decreasing' | 'uniform' {
    const ratio = waveLevel / Math.max(surface, 0.001);
    if (ratio > 1.1) {
      return 'increasing';
    } else if (ratio < 0.9) {
      return 'decreasing';
    } else {
      return 'uniform';
    }
  }

  private calculateCouplingEfficiency(
    surface: number,
    waveLevel: number,
    gradient: 'increasing' | 'decreasing' | 'uniform'
  ): number {
    // Best coupling with strong surface stability and moderate wave-level stability
    let efficiency = 0;
    
    if (surface > 0.01) {
      efficiency += 40;
    } else if (surface > 0.005) {
      efficiency += 25;
    }
    
    if (waveLevel > 0.005) {
      efficiency += 30;
    } else if (waveLevel > 0.002) {
      efficiency += 20;
    }
    
    // Gradient bonus/penalty
    switch (gradient) {
      case 'decreasing': efficiency += 30; break; // Optimal for wave coupling
      case 'uniform': efficiency += 15; break;
      case 'increasing': efficiency += 0; break; // Poor for coupling
    }
    
    return Math.min(100, efficiency);
  }

  private isProfileOptimalForMKI(
    surface: number,
    waveLevel: number,
    coupling: number
  ): boolean {
    return surface > 0.005 && waveLevel > 0.002 && coupling >= 50;
  }

  private assessWindConsistency(weatherData: WeatherServiceData): number {
    // Assess wind direction and speed consistency over time
    const morrisonForecast = weatherData.morrison.hourlyForecast;
    if (!morrisonForecast.length) return 0;
    
    const speeds = morrisonForecast.map(p => p.windSpeed || 0);
    const directions = morrisonForecast.map(p => p.windDirection || 0);
    
    const speedVariance = this.calculateVariance(speeds);
    const directionVariance = this.calculateDirectionVariance(directions);
    
    // Lower variance = higher consistency
    const speedConsistency = Math.max(0, 1 - speedVariance / 25); // Normalize to 0-1
    const directionConsistency = Math.max(0, 1 - directionVariance / 90); // Normalize to 0-1
    
    return (speedConsistency + directionConsistency) / 2;
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateDirectionVariance(directions: number[]): number {
    if (directions.length === 0) return 0;
    // Convert to radians and handle circular variance
    const radians = directions.map(d => d * Math.PI / 180);
    const sinSum = radians.reduce((sum, r) => sum + Math.sin(r), 0);
    const cosSum = radians.reduce((sum, r) => sum + Math.cos(r), 0);
    const meanDir = Math.atan2(sinSum / radians.length, cosSum / radians.length);
    
    const variance = radians.reduce((sum, r) => {
      let diff = r - meanDir;
      // Handle circular difference
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      return sum + Math.pow(diff, 2);
    }, 0) / radians.length;
    
    return Math.sqrt(variance) * 180 / Math.PI; // Convert back to degrees
  }

  // Analysis text generation methods

  private generateWaveAnalysis(
    fr: number,
    amplitude: string,
    organization: string,
    enhancement: string
  ): string {
    if (enhancement === 'positive') {
      return `Excellent mountain wave conditions (Fr=${fr.toFixed(2)}) with ${amplitude} amplitude ${organization} waves enhancing katabatic potential.`;
    } else if (enhancement === 'neutral') {
      return `Moderate mountain wave activity (Fr=${fr.toFixed(2)}) with ${amplitude} amplitude waves having neutral impact on katabatic flow.`;
    } else {
      return `Poor mountain wave conditions (Fr=${fr.toFixed(2)}) likely disrupting katabatic development with ${organization} wave patterns.`;
    }
  }

  private generateStabilityAnalysis(
    surface: number,
    waveLevel: number,
    coupling: number,
    optimal: boolean
  ): string {
    if (optimal) {
      return `Excellent atmospheric stability profile with strong surface layer (${(surface * 1000).toFixed(1)}×10⁻³ s⁻¹) and ${coupling.toFixed(0)}% coupling efficiency.`;
    } else {
      return `Suboptimal stability profile with limited coupling potential (${coupling.toFixed(0)}%) between surface and wave levels.`;
    }
  }

  private generateWaveFactorAnalysis(
    fr: number,
    enhancement: string,
    meets: boolean
  ): string {
    if (meets) {
      return `Optimal Froude number (${fr.toFixed(2)}) creating organized mountain waves that enhance katabatic flow development.`;
    } else {
      return `Suboptimal Froude number (${fr.toFixed(2)}) with ${enhancement} wave impact on katabatic conditions.`;
    }
  }

  private generateStabilityFactorAnalysis(
    surface: number,
    coupling: number,
    optimal: boolean
  ): string {
    if (optimal) {
      return `Strong atmospheric stability structure supporting excellent wave-katabatic coupling (${coupling.toFixed(0)}% efficiency).`;
    } else {
      return `Limited atmospheric stability with reduced coupling potential (${coupling.toFixed(0)}% efficiency).`;
    }
  }

  // Default fallback methods

  private getDefaultWaveAnalysis(): MountainWaveAnalysis {
    return {
      froudeNumber: 0.5,
      waveAmplitude: 'low',
      waveOrganization: 'mixed',
      surfaceCoupling: 'weak',
      wavePropagationPotential: 25,
      enhancementPotential: 'neutral',
      analysis: 'Unable to analyze mountain wave conditions - using default neutral impact.'
    };
  }

  private getDefaultStabilityProfile(): StabilityProfile {
    return {
      surfaceStability: 0.005,
      waveLevelStability: 0.004,
      stabilityGradient: 'uniform',
      couplingEfficiency: 40,
      profileOptimal: false,
      analysis: 'Unable to analyze atmospheric stability profile - using default moderate conditions.'
    };
  }
}

export const mountainWaveAnalyzer = MountainWaveAnalyzer.getInstance();
