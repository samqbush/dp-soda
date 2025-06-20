import { Platform } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';
import { alarmAudio } from './alarmAudioService';
import { fetchWindData, analyzeWindData, getAlarmCriteria, checkSimplifiedAlarmConditions, type AlarmCriteria, type WindAnalysis } from './windService';

export interface AlarmState {
  isEnabled: boolean;
  isActive: boolean;
  isPlaying: boolean;
  alarmTime: string;
  nextCheckTime: Date | null;
}

export interface AlarmTestOptions {
  useCurrentConditions: boolean;
  useIdealConditions: boolean;
  customConditions?: {
    averageSpeed: number;
    directionConsistency: number;
    consecutiveGoodPoints: number;
  };
}

/**
 * Unified Alarm Manager
 * 
 * Single service that manages all alarm functionality:
 * - Wind condition checking and analysis
 * - Alarm scheduling with JavaScript timers
 * - Audio playback and vibration
 */
class UnifiedAlarmManager {
  private foregroundTimer: NodeJS.Timeout | null = null;
  private isAppInForeground: boolean = true;
  private settingsLoaded: boolean = false;
  private isInitialized: boolean = false;
  private isUpdatingAlarmTime: boolean = false; // Lock to prevent concurrent modifications
  private alarmState: AlarmState = {
    isEnabled: false,
    isActive: false,
    isPlaying: false,
    alarmTime: '05:00',
    nextCheckTime: null,
  };
  private stateChangeCallbacks: Set<(state: AlarmState) => void> = new Set();

  /**
   * Initialize the alarm manager and request permissions
   */
  async initialize(): Promise<void> {
    try {
      // Prevent multiple initializations
      if (this.isInitialized) {
        AlarmLogger.info('Unified Alarm Manager already initialized, skipping');
        return;
      }
      
      AlarmLogger.info('🚀 Initializing Unified Alarm Manager...');
      
      // Load saved alarm settings
      await this.loadAlarmSettings();
      
      this.isInitialized = true;
      AlarmLogger.success('✅ Unified Alarm Manager initialized');
      this.notifyStateChange();
    } catch (error) {
      AlarmLogger.error('Error initializing Unified Alarm Manager:', error);
    }
  }

  /**
   * Subscribe to alarm state changes
   */
  onStateChange(callback: (state: AlarmState) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    // Return unsubscribe function
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Get current alarm state
   */
  getState(): AlarmState {
    return { ...this.alarmState };
  }

  /**
   * Enable or disable the alarm system
   */
  async setEnabled(enabled: boolean): Promise<void> {
    try {
      this.alarmState.isEnabled = enabled;
      this.settingsLoaded = true; // Mark as loaded to prevent initialization overwrites
      
      if (enabled) {
        // When user explicitly enables alarm, schedule timer
        await this.scheduleNextAlarmCheck(false); // NOT silent - user action
        AlarmLogger.info('Alarm system enabled - timer scheduled');
      } else {
        await this.cancelAllAlarms();
        this.alarmState.nextCheckTime = null;
        AlarmLogger.info('Alarm system disabled');
      }
      
      // Save settings
      await this.saveAlarmSettings();
      this.notifyStateChange();
    } catch (error) {
      AlarmLogger.error('Error setting alarm enabled state:', error);
      throw error;
    }
  }

  /**
   * Set alarm time
   */
  async setAlarmTime(time: string): Promise<void> {
    try {
      // Prevent concurrent modifications
      if (this.isUpdatingAlarmTime) {
        AlarmLogger.warning(`Alarm time update already in progress, ignoring duplicate request to set ${time}`);
        return;
      }
      
      this.isUpdatingAlarmTime = true;
      const previousTime = this.alarmState.alarmTime;
      
      AlarmLogger.info(`🔒 Starting alarm time update: ${previousTime} → ${time}`);
      
      // Update state immediately
      this.alarmState.alarmTime = time;
      this.settingsLoaded = true; // Mark as loaded to prevent initialization overwrites
      
      // Save to storage immediately to prevent race conditions
      await this.saveAlarmSettings();
      
      // If alarm is enabled, reschedule with new time
      if (this.alarmState.isEnabled) {
        // When user changes time, schedule timer with new time
        await this.scheduleNextAlarmCheck(false); // NOT silent - user action
      }
      
      // Notify state change after everything is saved and scheduled
      this.notifyStateChange();
      
      AlarmLogger.success(`🔓 Alarm time successfully updated to ${time} and saved`);
    } catch (error) {
      AlarmLogger.error('Error setting alarm time:', error);
      throw error;
    } finally {
      this.isUpdatingAlarmTime = false;
    }
  }

  /**
   * Stop the currently playing alarm
   */
  async stopAlarm(): Promise<void> {
    try {
      if (this.alarmState.isPlaying) {
        await alarmAudio.stop();
        this.alarmState.isPlaying = false;
        this.alarmState.isActive = false;
        this.notifyStateChange();
        AlarmLogger.info('Alarm stopped by user');
      }
    } catch (error) {
      AlarmLogger.error('Error stopping alarm:', error);
      throw error;
    }
  }

  /**
   * Emergency stop all alarm functions
   */
  async emergencyStop(): Promise<void> {
    try {
      // Stop audio
      await alarmAudio.stop();
      
      // Cancel all timers
      await this.cancelAllAlarms();
      
      // Reset state
      this.alarmState.isActive = false;
      this.alarmState.isPlaying = false;
      this.alarmState.nextCheckTime = null;
      
      this.notifyStateChange();
      AlarmLogger.info('Emergency stop completed');
    } catch (error) {
      AlarmLogger.error('Error in emergency stop:', error);
      throw error;
    }
  }

  /**
   * Update app foreground state
   */
  setAppForegroundState(isInForeground: boolean): void {
    this.isAppInForeground = isInForeground;
    AlarmLogger.info(`App foreground state: ${isInForeground ? 'foreground' : 'background'}`);
  }

  /**
   * Schedule the next alarm check
   * Uses JavaScript timer to schedule alarm checks
   */
  private async scheduleNextAlarmCheck(silent: boolean = false): Promise<void> {
    try {
      // Cancel any existing alarms
      await this.cancelAllAlarms();
      
      // Calculate next alarm time
      const nextCheckTime = this.calculateNextAlarmTime();
      this.alarmState.nextCheckTime = nextCheckTime;
      
      const now = new Date();
      const msUntilAlarm = nextCheckTime.getTime() - now.getTime();
      
      AlarmLogger.info(`Scheduling next alarm check for ${nextCheckTime.toLocaleString()}`);
      
      // Skip timer scheduling if in silent mode (initialization)
      if (!silent) {
        // Schedule timer for alarm check
        this.foregroundTimer = setTimeout(async () => {
          AlarmLogger.info('Timer triggered - performing alarm check');
          await this.performAlarmCheck();
        }, msUntilAlarm);
      }
      
      this.notifyStateChange();
    } catch (error) {
      AlarmLogger.error('Error scheduling next alarm check:', error);
      throw error;
    }
  }

  /**
   * Calculate the next alarm time based on current time and alarm time setting
   */
  private calculateNextAlarmTime(): Date {
    const [hours, minutes] = this.alarmState.alarmTime.split(':').map(Number);
    const now = new Date();
    const alarmTime = new Date();
    
    alarmTime.setHours(hours, minutes, 0, 0);
    
    // If alarm time has passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
    
    return alarmTime;
  }

  /**
   * Perform the actual alarm check
   */
  private async performAlarmCheck(): Promise<void> {
    try {
      AlarmLogger.info('Performing scheduled alarm check using simplified Ecowitt data...');
      
      // Use simplified alarm checking with Ecowitt data
      const result = await checkSimplifiedAlarmConditions();
      
      if (result.shouldTrigger) {
        const message = `🌊 Wake up! Wind conditions are favorable!\n` +
          `Current: ${result.currentSpeed?.toFixed(1) || 'N/A'} mph, ` +
          `Average: ${result.averageSpeed?.toFixed(1) || 'N/A'} mph ` +
          `(threshold: ${result.threshold} mph)`;
        
        await this.triggerAlarm(message);
        
        AlarmLogger.success('Alarm triggered - favorable wind conditions detected', {
          currentSpeed: result.currentSpeed,
          averageSpeed: result.averageSpeed,
          threshold: result.threshold,
          confidence: result.confidence,
          reason: result.reason
        });
      } else {
        AlarmLogger.info('Alarm check completed - conditions not favorable', {
          currentSpeed: result.currentSpeed,
          averageSpeed: result.averageSpeed,
          threshold: result.threshold,
          confidence: result.confidence,
          reason: result.reason
        });
      }
      
      // Schedule next check for tomorrow
      await this.scheduleNextAlarmCheck();
      
    } catch (error) {
      AlarmLogger.error('Error performing alarm check:', error);
      // Still schedule next check even if this one failed
      await this.scheduleNextAlarmCheck();
    }
  }

  /**
   * Trigger the alarm (audio)
   * This method plays the alarm sound
   */
  private async triggerAlarm(message: string): Promise<void> {
    try {
      this.alarmState.isActive = true;
      this.alarmState.isPlaying = true;
      this.notifyStateChange();
      
      AlarmLogger.success('🚨 TRIGGERING ALARM: Favorable wind conditions detected!');
      
      // Always play audio first, regardless of app foreground state
      // The audio service is configured to work in background
      try {
        await alarmAudio.play(0.8); // Start at 80% volume
        AlarmLogger.success('🔊 Alarm audio playing successfully');
      } catch (audioError) {
        AlarmLogger.error('⚠️ Failed to play alarm audio:', audioError);
        // Continue even if audio fails
      }
      
    } catch (error) {
      AlarmLogger.error('❌ Error triggering alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled alarms and timers
   */
  private async cancelAllAlarms(): Promise<void> {
    try {
      AlarmLogger.info('Cancelling all alarms and timers...');
      
      // Cancel foreground timer
      if (this.foregroundTimer) {
        clearTimeout(this.foregroundTimer);
        this.foregroundTimer = null;
        AlarmLogger.info('Cancelled foreground timer');
      }
      
      AlarmLogger.success('All alarms and timers cancelled');
    } catch (error) {
      AlarmLogger.error('Error cancelling alarms:', error);
    }
  }

  /**
   * Load alarm settings from storage
   */
  private async loadAlarmSettings(): Promise<void> {
    try {
      // Prevent race condition: only load settings once during initialization
      if (this.settingsLoaded) {
        AlarmLogger.info(`Alarm settings already loaded, skipping to prevent race condition. Current state: enabled=${this.alarmState.isEnabled}, time=${this.alarmState.alarmTime}`);
        return;
      }
      
      // Don't load if an alarm time update is in progress
      if (this.isUpdatingAlarmTime) {
        AlarmLogger.warning('Alarm time update in progress, skipping settings load to prevent overwrite');
        return;
      }
      
      AlarmLogger.info('Loading alarm settings from storage...');
      const criteria = await getAlarmCriteria();
      
      const previousState = { ...this.alarmState };
      this.alarmState.isEnabled = criteria.alarmEnabled;
      this.alarmState.alarmTime = criteria.alarmTime;
      this.settingsLoaded = true;
      
      AlarmLogger.info('Alarm settings loaded from storage', { 
        enabled: `${previousState.isEnabled} → ${this.alarmState.isEnabled}`,
        time: `${previousState.alarmTime} → ${this.alarmState.alarmTime}`,
        settingsLoaded: this.settingsLoaded
      });
      
      // Only schedule if alarm was previously enabled by user
      if (this.alarmState.isEnabled) {
        await this.scheduleNextAlarmCheck(true);
        
        AlarmLogger.info('🔇 INITIALIZATION: Alarm is enabled - timer scheduled for next check');
      }
      
    } catch (error) {
      AlarmLogger.error('Error loading alarm settings:', error);
    }
  }

  /**
   * Save alarm settings to storage
   */
  private async saveAlarmSettings(): Promise<void> {
    try {
      // Use direct import instead of dynamic import for reliability
      const { setAlarmCriteria } = require('./windService');
      
      const settingsToSave = {
        alarmEnabled: this.alarmState.isEnabled,
        alarmTime: this.alarmState.alarmTime
      };
      
      AlarmLogger.info('Saving alarm settings to storage:', settingsToSave);
      await setAlarmCriteria(settingsToSave);
      AlarmLogger.success('Alarm settings saved successfully to storage');
    } catch (error) {
      AlarmLogger.error('Error saving alarm settings to storage:', error);
      // Don't throw error to avoid breaking the flow, but log it clearly
    }
  }

  /**
   * Notify all subscribers of state changes
   */
  private notifyStateChange(): void {
    const state = this.getState();
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        AlarmLogger.error('Error in state change callback:', error);
      }
    });
  }
}

// Export singleton instance
export const unifiedAlarmManager = new UnifiedAlarmManager();
