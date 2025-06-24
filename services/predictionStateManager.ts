/**
 * Prediction State Management System
 * Handles the lifecycle of katabatic predictions from preview to verification
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type PredictionState = 'preview' | 'locked' | 'active' | 'verified';

export interface LockedPrediction {
  date: string; // YYYY-MM-DD format
  prediction: {
    probability: number;
    confidence: 'low' | 'medium' | 'high';
    confidenceScore: number;
    factors: any; // Full KatabaticFactors object
    recommendation: 'go' | 'maybe' | 'skip';
    explanation: string;
  };
  lockTime: string; // ISO timestamp when prediction was locked
  lockType: 'evening' | 'final'; // evening = 6pm, final = 11pm
  state: PredictionState;
  verification?: {
    actualConditions?: any;
    accuracy?: number;
    verifiedAt?: string;
  };
}

export class PredictionStateManager {
  private static instance: PredictionStateManager;
  private predictions: Map<string, LockedPrediction> = new Map();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private readonly STORAGE_KEY = 'katabatic_predictions_v1';

  private constructor() {
    // Don't auto-load on construction - wait for explicit initialization
  }

  public static getInstance(): PredictionStateManager {
    if (!PredictionStateManager.instance) {
      PredictionStateManager.instance = new PredictionStateManager();
    }
    return PredictionStateManager.instance;
  }

  /**
   * Initialize the prediction state manager
   * Call this once when the app starts, not on every refresh
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📊 PredictionStateManager already initialized, skipping...');
      return;
    }

    if (this.initializationPromise) {
      console.log('📊 PredictionStateManager initialization in progress, waiting...');
      return this.initializationPromise;
    }

    console.log('📊 Initializing PredictionStateManager...');
    
    this.initializationPromise = this.loadPersistedPredictions()
      .then(() => {
        // Only cleanup after successful load
        this.cleanupOldPredictions();
        this.isInitialized = true;
        console.log('✅ PredictionStateManager initialized successfully');
      })
      .catch((error: Error) => {
        console.error('❌ Failed to initialize PredictionStateManager:', error);
        // Start with empty state on load failure, but still mark as initialized
        this.predictions.clear();
        this.isInitialized = true;
        console.log('⚠️ PredictionStateManager initialized with empty state due to load failure');
      });

    return this.initializationPromise;
  }

  /**
   * Ensure the service is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Determine what prediction state we should be in based on current time
   */
  public async getCurrentPredictionState(targetDate?: Date): Promise<{
    state: PredictionState;
    shouldLock: boolean;
    lockType?: 'evening' | 'final';
    message: string;
  }> {
    await this.ensureInitialized();
    
    const now = new Date();
    const currentHour = now.getHours();
    const target = targetDate || this.getTomorrowDate();
    const targetDateStr = this.formatDate(target);

    const existingPrediction = this.predictions.get(targetDateStr);

    // Check if we're past dawn patrol time (8 AM) for today's prediction
    if (this.isToday(target) && currentHour >= 8) {
      return {
        state: 'verified',
        shouldLock: false,
        message: 'Dawn patrol complete - prediction can be verified'
      };
    }

    // Check if we're in dawn patrol window (6-8 AM) for today's prediction
    if (this.isToday(target) && currentHour >= 6 && currentHour < 8) {
      return {
        state: 'active',
        shouldLock: false,
        message: 'Active dawn patrol window - prediction is live'
      };
    }

    // Check if we're past midnight for tomorrow's prediction (it becomes today's)
    if (this.isToday(target) && currentHour >= 0 && currentHour < 6) {
      return {
        state: 'locked',
        shouldLock: false,
        message: 'Prediction locked for today - awaiting dawn patrol'
      };
    }

    // Tomorrow's prediction logic
    if (this.isTomorrow(target)) {
      // 11 PM - Final lock time
      if (currentHour >= 23) {
        return {
          state: 'locked',
          shouldLock: !existingPrediction || existingPrediction.lockType !== 'final',
          lockType: 'final',
          message: 'Final prediction lock (11 PM) - no more changes until dawn'
        };
      }

      // 6 PM - Evening lock time
      if (currentHour >= 18) {
        return {
          state: existingPrediction?.lockType === 'final' ? 'locked' : 'preview',
          shouldLock: !existingPrediction || existingPrediction.lockType === undefined,
          lockType: 'evening',
          message: 'Evening preview lock (6 PM) - preliminary prediction set'
        };
      }

      // Before 6 PM - Preview only
      return {
        state: 'preview',
        shouldLock: false,
        message: 'Preview mode - prediction will lock at 6 PM'
      };
    }

    return {
      state: 'preview',
      shouldLock: false,
      message: 'Preview mode - target date not in prediction window'
    };
  }

  /**
   * Lock a prediction at the current time
   */
  public async lockPrediction(
    date: Date,
    prediction: any,
    lockType: 'evening' | 'final'
  ): Promise<boolean> {
    await this.ensureInitialized();
    
    const dateStr = this.formatDate(date);
    const now = new Date();

    console.log(`🔒 Locking ${lockType} prediction for ${dateStr} at ${now.toLocaleString()}`);

    const lockedPrediction: LockedPrediction = {
      date: dateStr,
      prediction: {
        probability: prediction.probability,
        confidence: prediction.confidence,
        confidenceScore: prediction.confidenceScore,
        factors: prediction.factors,
        recommendation: prediction.recommendation,
        explanation: prediction.explanation,
      },
      lockTime: now.toISOString(),
      lockType,
      state: 'locked'
    };

    this.predictions.set(dateStr, lockedPrediction);
    await this.persistPredictions();

    return true;
  }

  /**
   * Get locked prediction for a specific date
   */
  public async getLockedPrediction(date: Date): Promise<LockedPrediction | null> {
    await this.ensureInitialized();
    const dateStr = this.formatDate(date);
    return this.predictions.get(dateStr) || null;
  }

  /**
   * Check if we should use locked prediction instead of calculating new one
   */
  public async shouldUseLocked(targetDate: Date): Promise<boolean> {
    await this.ensureInitialized();
    const state = await this.getCurrentPredictionState(targetDate);
    const locked = await this.getLockedPrediction(targetDate);

    // Use locked prediction if:
    // 1. We're past evening lock time AND have a locked prediction
    // 2. We're in locked, active, or verified state
    return (
      locked !== null && 
      ['locked', 'active', 'verified'].includes(state.state)
    );
  }

  /**
   * Transition prediction states based on time
   */
  public async updatePredictionStates(): Promise<void> {
    await this.ensureInitialized();
    const now = new Date();
    let updated = false;

    for (const [dateStr, prediction] of this.predictions) {
      const predictionDate = this.parseDate(dateStr);
      const newState = await this.getCurrentPredictionState(predictionDate);

      if (prediction.state !== newState.state) {
        console.log(`🔄 Transitioning prediction for ${dateStr}: ${prediction.state} → ${newState.state}`);
        prediction.state = newState.state;
        updated = true;
      }
    }

    if (updated) {
      await this.persistPredictions();
    }
  }

  /**
   * Verify a prediction against actual conditions
   */
  public async verifyPrediction(
    date: Date,
    actualConditions: any,
    accuracy: number
  ): Promise<boolean> {
    await this.ensureInitialized();
    const dateStr = this.formatDate(date);
    const prediction = this.predictions.get(dateStr);

    if (!prediction) {
      console.log(`⚠️ No prediction found to verify for ${dateStr}`);
      return false;
    }

    prediction.verification = {
      actualConditions,
      accuracy,
      verifiedAt: new Date().toISOString()
    };

    prediction.state = 'verified';
    await this.persistPredictions();

    console.log(`✅ Verified prediction for ${dateStr} with ${accuracy}% accuracy`);
    return true;
  }

  /**
   * Clean up old predictions (older than 7 days)
   */
  public async cleanupOldPredictions(): Promise<void> {
    // Don't require initialization for cleanup - it should be safe to call anytime
    if (!this.predictions || this.predictions.size === 0) {
      console.log('📊 No predictions to clean up');
      return;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffStr = this.formatDate(cutoffDate);

    let cleaned = 0;
    for (const [dateStr] of this.predictions) {
      if (dateStr < cutoffStr) {
        this.predictions.delete(dateStr);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old predictions`);
      await this.persistPredictions();
    }
  }

  // Helper methods
  private getTomorrowDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private isToday(date: Date): boolean {
    const today = new Date();
    return this.formatDate(date) === this.formatDate(today);
  }

  private isTomorrow(date: Date): boolean {
    const tomorrow = this.getTomorrowDate();
    return this.formatDate(date) === this.formatDate(tomorrow);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  private parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00.000Z');
  }

  private async loadPersistedPredictions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.predictions = new Map(Object.entries(data));
        console.log(`📊 Loaded ${this.predictions.size} persisted predictions`);
      } else {
        console.log('📊 No persisted predictions found, starting fresh');
      }
    } catch (error) {
      console.log('⚠️ Failed to load persisted predictions:', error);
      // Continue with empty predictions map
    }
  }

  private async persistPredictions(): Promise<void> {
    try {
      const data = Object.fromEntries(this.predictions);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.log('⚠️ Failed to persist predictions:', error);
    }
  }

  // Debug/development methods
  public async getAllPredictions(): Promise<Map<string, LockedPrediction>> {
    await this.ensureInitialized();
    return new Map(this.predictions);
  }

  public async clearAllPredictions(): Promise<void> {
    await this.ensureInitialized();
    this.predictions.clear();
    await this.persistPredictions();
    console.log('🗑️ Cleared all predictions');
  }

  /**
   * Reset the initialization state (useful for testing)
   */
  public resetInitialization(): void {
    this.isInitialized = false;
    this.initializationPromise = null;
    this.predictions.clear();
  }
}

export const predictionStateManager = PredictionStateManager.getInstance();
