/**
 * Prediction Tracking Service
 * Logs predictions vs actual outcomes for continuous improvement
 * Created: June 14, 2025 - Response to prediction failure analysis
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { KatabaticPrediction } from './katabaticAnalyzer';

export interface PredictionEntry {
  id: string;
  timestamp: Date;
  predictionDate: Date; // Date the prediction was for
  prediction: KatabaticPrediction;
  outcome?: PredictionOutcome; // Added after the fact
  weatherConditions?: {
    morrisonTemp: number;
    mountainTemp: number;
    actualTempDiff: number;
    precipitation: number;
    cloudCover: number;
    pressure: number;
  };
}

export interface PredictionOutcome {
  timestamp: Date;
  actualWindSpeed: number;
  actualWindDirection: number;
  actualMaxSpeed: number;
  actualMinSpeed: number;
  dataPoints: number;
  success: boolean; // True if winds were 15+ mph
  source: 'soda-lake' | 'standley-lake' | 'user-report';
  notes?: string;
}

export interface PredictionAccuracy {
  totalPredictions: number;
  correctPredictions: number;
  falsePositives: number; // Predicted good, actual bad
  falseNegatives: number; // Predicted bad, actual good
  accuracy: number; // Percentage correct
  confidenceCalibration: {
    [key: string]: {
      predicted: number;
      actual: number;
      count: number;
    };
  };
}

const PREDICTION_STORAGE_KEY = 'wind_predictions';
const MAX_STORED_PREDICTIONS = 100;

export class PredictionTrackingService {
  private static instance: PredictionTrackingService;
  
  private constructor() {}
  
  public static getInstance(): PredictionTrackingService {
    if (!PredictionTrackingService.instance) {
      PredictionTrackingService.instance = new PredictionTrackingService();
    }
    return PredictionTrackingService.instance;
  }

  /**
   * Log a new prediction
   */
  async logPrediction(
    predictionDate: Date,
    prediction: KatabaticPrediction,
    weatherConditions?: PredictionEntry['weatherConditions']
  ): Promise<string> {
    try {
      const predictions = await this.getAllPredictions();
      
      const entry: PredictionEntry = {
        id: `${predictionDate.toISOString()}-${Date.now()}`,
        timestamp: new Date(),
        predictionDate,
        prediction,
        weatherConditions,
      };
      
      predictions.push(entry);
      
      // Keep only the most recent predictions
      if (predictions.length > MAX_STORED_PREDICTIONS) {
        predictions.splice(0, predictions.length - MAX_STORED_PREDICTIONS);
      }
      
      await AsyncStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify(predictions));
      
      console.log('📊 Logged prediction:', {
        date: predictionDate.toISOString(),
        probability: prediction.probability,
        confidence: prediction.confidenceScore,
        id: entry.id
      });
      
      return entry.id;
    } catch (error) {
      console.error('❌ Failed to log prediction:', error);
      throw error;
    }
  }

  /**
   * Update a prediction with actual outcome
   */
  async updatePredictionOutcome(
    predictionId: string,
    outcome: PredictionOutcome
  ): Promise<void> {
    try {
      const predictions = await this.getAllPredictions();
      const predictionIndex = predictions.findIndex(p => p.id === predictionId);
      
      if (predictionIndex === -1) {
        throw new Error(`Prediction not found: ${predictionId}`);
      }
      
      predictions[predictionIndex].outcome = outcome;
      
      await AsyncStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify(predictions));
      
      console.log('📈 Updated prediction outcome:', {
        id: predictionId,
        predicted: predictions[predictionIndex].prediction.probability,
        actual: outcome.success,
        accurate: this.isPredictionAccurate(predictions[predictionIndex].prediction, outcome)
      });
    } catch (error) {
      console.error('❌ Failed to update prediction outcome:', error);
      throw error;
    }
  }

  /**
   * Get all stored predictions
   */
  async getAllPredictions(): Promise<PredictionEntry[]> {
    try {
      const stored = await AsyncStorage.getItem(PREDICTION_STORAGE_KEY);
      if (!stored) return [];
      
      const predictions = JSON.parse(stored) as PredictionEntry[];
      
      // Convert date strings back to Date objects
      return predictions.map(p => ({
        ...p,
        timestamp: new Date(p.timestamp),
        predictionDate: new Date(p.predictionDate),
        outcome: p.outcome ? {
          ...p.outcome,
          timestamp: new Date(p.outcome.timestamp)
        } : undefined
      }));
    } catch (error) {
      console.error('❌ Failed to get predictions:', error);
      return [];
    }
  }

  /**
   * Get prediction accuracy metrics
   */
  async getPredictionAccuracy(): Promise<PredictionAccuracy> {
    try {
      const predictions = await this.getAllPredictions();
      const completedPredictions = predictions.filter(p => p.outcome);
      
      if (completedPredictions.length === 0) {
        return {
          totalPredictions: 0,
          correctPredictions: 0,
          falsePositives: 0,
          falseNegatives: 0,
          accuracy: 0,
          confidenceCalibration: {}
        };
      }
      
      let correctPredictions = 0;
      let falsePositives = 0;
      let falseNegatives = 0;
      const confidenceCalibration: PredictionAccuracy['confidenceCalibration'] = {};
      
      completedPredictions.forEach(prediction => {
        const isAccurate = this.isPredictionAccurate(prediction.prediction, prediction.outcome!);
        const predictedGood = prediction.prediction.probability >= 50;
        const actualGood = prediction.outcome!.success;
        
        if (isAccurate) {
          correctPredictions++;
        } else if (predictedGood && !actualGood) {
          falsePositives++;
        } else if (!predictedGood && actualGood) {
          falseNegatives++;
        }
        
        // Track confidence calibration
        const confidenceBucket = Math.floor(prediction.prediction.confidenceScore / 10) * 10;
        const bucketKey = `${confidenceBucket}-${confidenceBucket + 9}`;
        
        if (!confidenceCalibration[bucketKey]) {
          confidenceCalibration[bucketKey] = {
            predicted: prediction.prediction.confidenceScore,
            actual: 0,
            count: 0
          };
        }
        
        confidenceCalibration[bucketKey].actual += actualGood ? 100 : 0;
        confidenceCalibration[bucketKey].count++;
      });
      
      // Calculate average actual success rate for each confidence bucket
      Object.keys(confidenceCalibration).forEach(bucket => {
        const data = confidenceCalibration[bucket];
        data.actual = data.actual / data.count;
      });
      
      return {
        totalPredictions: completedPredictions.length,
        correctPredictions,
        falsePositives,
        falseNegatives,
        accuracy: (correctPredictions / completedPredictions.length) * 100,
        confidenceCalibration
      };
    } catch (error) {
      console.error('❌ Failed to calculate accuracy:', error);
      return {
        totalPredictions: 0,
        correctPredictions: 0,
        falsePositives: 0,
        falseNegatives: 0,
        accuracy: 0,
        confidenceCalibration: {}
      };
    }
  }

  /**
   * Get predictions for a specific date
   */
  async getPredictionsForDate(date: Date): Promise<PredictionEntry[]> {
    const predictions = await this.getAllPredictions();
    const targetDate = date.toDateString();
    
    return predictions.filter(p => p.predictionDate.toDateString() === targetDate);
  }

  /**
   * Find prediction that needs outcome update
   */
  async findPredictionNeedingOutcome(dawnPatrolDate: Date): Promise<PredictionEntry | null> {
    const predictions = await this.getPredictionsForDate(dawnPatrolDate);
    
    // Find the most recent prediction for this date that doesn't have an outcome
    const pendingPredictions = predictions.filter(p => !p.outcome);
    
    if (pendingPredictions.length === 0) return null;
    
    // Return the most recent prediction
    return pendingPredictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  /**
   * Clear all stored predictions (for testing/debugging)
   */
  async clearAllPredictions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PREDICTION_STORAGE_KEY);
      console.log('🧹 Cleared all prediction data');
    } catch (error) {
      console.error('❌ Failed to clear predictions:', error);
      throw error;
    }
  }

  /**
   * Helper to determine if a prediction was accurate
   */
  private isPredictionAccurate(prediction: KatabaticPrediction, outcome: PredictionOutcome): boolean {
    const predictedGood = prediction.probability >= 50; // 50%+ = predicted good conditions
    const actualGood = outcome.success; // 15+ mph = actual good conditions
    
    return predictedGood === actualGood;
  }

  /**
   * Get recent prediction trends
   */
  async getRecentTrends(days: number = 7): Promise<{
    trends: Array<{
      date: string;
      predicted: number;
      actual: boolean | null;
      accurate: boolean | null;
    }>;
    summary: {
      totalDays: number;
      accurateDays: number;
      accuracyRate: number;
    };
  }> {
    try {
      const predictions = await this.getAllPredictions();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentPredictions = predictions.filter(p => p.predictionDate >= cutoffDate);
      
      // Group by date
      const dailyPredictions = new Map<string, PredictionEntry[]>();
      recentPredictions.forEach(p => {
        const dateKey = p.predictionDate.toDateString();
        if (!dailyPredictions.has(dateKey)) {
          dailyPredictions.set(dateKey, []);
        }
        dailyPredictions.get(dateKey)!.push(p);
      });
      
      const trends = Array.from(dailyPredictions.entries()).map(([dateKey, predictions]) => {
        // Use the most recent prediction for each day
        const latestPrediction = predictions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        return {
          date: dateKey,
          predicted: latestPrediction.prediction.probability,
          actual: latestPrediction.outcome?.success ?? null,
          accurate: latestPrediction.outcome 
            ? this.isPredictionAccurate(latestPrediction.prediction, latestPrediction.outcome)
            : null
        };
      });
      
      const completedDays = trends.filter(t => t.actual !== null);
      const accurateDays = completedDays.filter(t => t.accurate === true);
      
      return {
        trends,
        summary: {
          totalDays: completedDays.length,
          accurateDays: accurateDays.length,
          accuracyRate: completedDays.length > 0 ? (accurateDays.length / completedDays.length) * 100 : 0
        }
      };
    } catch (error) {
      console.error('❌ Failed to get recent trends:', error);
      return {
        trends: [],
        summary: {
          totalDays: 0,
          accurateDays: 0,
          accuracyRate: 0
        }
      };
    }
  }
}

export const predictionTrackingService = PredictionTrackingService.getInstance();
