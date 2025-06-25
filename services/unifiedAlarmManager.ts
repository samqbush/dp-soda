import { Platform } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';
import { alarmAudio } from './alarmAudioService';
import { fetchWindData, analyzeWindData, getAlarmCriteria, checkSimplifiedAlarmConditions, type AlarmCriteria, type WindAnalysis } from './windService';
import { alarmNotificationService } from './alarmNotificationService';
import * as Notifications from 'expo-notifications';

export interface AlarmState {
  isEnabled: boolean;
  isActive: boolean;
  isPlaying: boolean;
  alarmTime: string;
  nextCheckTime: Date | null;
  lastCheckTime: Date | null;
  lastCheckResult: 'triggered' | 'conditions-not-met' | 'error' | null;
  lastCheckWindSpeed: number | null;
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
  private scheduledNotificationId: string | null = null; // Track background notification
  private notificationReceivedListener: Notifications.Subscription | null = null;
  private notificationResponseListener: Notifications.Subscription | null = null;
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
    lastCheckTime: null,
    lastCheckResult: null,
    lastCheckWindSpeed: null,
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
      
      // Initialize notification services for background support
      await alarmNotificationService.setupNotificationChannels();
      await alarmNotificationService.requestPermissions();
      
      // Set up notification listeners for background alarm handling
      this.setupNotificationListeners();
      
      // Load saved alarm settings
      await this.loadAlarmSettings();
      
      this.isInitialized = true;
      AlarmLogger.success('✅ Unified Alarm Manager initialized with background notification support');
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
  /**
   * Schedule the next alarm check
   * Uses both JavaScript timer (foreground) AND background notifications for reliability
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
      const hoursUntilAlarm = msUntilAlarm / (1000 * 60 * 60);
      
      AlarmLogger.info(`Scheduling next alarm check for ${nextCheckTime.toLocaleString()} (in ${hoursUntilAlarm.toFixed(1)} hours)`);
      
      // Skip timer scheduling if in silent mode (initialization)
      if (!silent) {
        let scheduledSomething = false;
        
        // Always schedule background notification - this is required for reliable background alarm
        // The notification will wake up the app to run the wind check and alarm
        if (msUntilAlarm > 30000) { // At least 30 seconds in the future (reduced for testing)
          await this.scheduleBackgroundNotification(nextCheckTime);
          scheduledSomething = true;
        } else {
          AlarmLogger.warning(`⚠️ Skipping background notification - alarm time too close (${Math.round(msUntilAlarm/1000)} seconds). Will use foreground timer only.`);
        }
        
        // Also schedule foreground timer as backup if reasonable time frame (< 24 hours) and at least 30 seconds away
        if (hoursUntilAlarm < 24 && msUntilAlarm > 30000) { // 30 seconds minimum for testing
          this.foregroundTimer = setTimeout(async () => {
            AlarmLogger.info('⏰ Foreground timer triggered - performing alarm check');
            await this.performAlarmCheck();
          }, msUntilAlarm);
          
          if (scheduledSomething) {
            AlarmLogger.info(`✅ Scheduled both background notification and foreground timer for maximum reliability`);
          } else {
            AlarmLogger.info(`✅ Scheduled foreground timer only (notification too close)`);
          }
          scheduledSomething = true;
        } else if (hoursUntilAlarm >= 24) {
          if (scheduledSomething) {
            AlarmLogger.info(`✅ Scheduled background notification only (alarm too far in future for foreground timer)`);
          }
        }
        
        // If nothing was scheduled and we have at least 10 seconds, force a foreground timer
        if (!scheduledSomething && msUntilAlarm > 10000) {
          AlarmLogger.warning(`⚠️ Forcing foreground timer for very short alarm (${Math.round(msUntilAlarm/1000)} seconds)`);
          this.foregroundTimer = setTimeout(async () => {
            AlarmLogger.info('⏰ Emergency foreground timer triggered - performing alarm check');
            await this.performAlarmCheck();
          }, msUntilAlarm);
          scheduledSomething = true;
        }
        
        if (!scheduledSomething) {
          AlarmLogger.warning(`⚠️ No scheduling performed - alarm time too close (${Math.round(msUntilAlarm/1000)} seconds)`);
        }
      } else {
        AlarmLogger.info('🔇 Silent mode: alarm scheduled in settings only, will activate on next user action');
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
      
      // Record the check time
      this.alarmState.lastCheckTime = new Date();
      
      // Use simplified alarm checking with Ecowitt data
      const result = await checkSimplifiedAlarmConditions();
      
      // Record wind speed for user visibility
      this.alarmState.lastCheckWindSpeed = result.currentSpeed || result.averageSpeed || null;
      
      if (result.shouldTrigger) {
        const message = `🌊 Wake up! Wind conditions are favorable!\n` +
          `Current: ${result.currentSpeed?.toFixed(1) || 'N/A'} mph, ` +
          `Average: ${result.averageSpeed?.toFixed(1) || 'N/A'} mph ` +
          `(threshold: ${result.threshold} mph)`;
        
        // Record successful trigger
        this.alarmState.lastCheckResult = 'triggered';
        
        await this.triggerAlarm(message);
        
        AlarmLogger.success('Alarm triggered - favorable wind conditions detected', {
          currentSpeed: result.currentSpeed,
          averageSpeed: result.averageSpeed,
          threshold: result.threshold,
          confidence: result.confidence,
          reason: result.reason
        });
      } else {
        // Record that conditions were not met
        this.alarmState.lastCheckResult = 'conditions-not-met';
        
        AlarmLogger.info('Alarm check completed - conditions not favorable', {
          currentSpeed: result.currentSpeed,
          averageSpeed: result.averageSpeed,
          threshold: result.threshold,
          confidence: result.confidence,
          reason: result.reason
        });
      }
      
      // Notify UI of state change to show last check info
      this.notifyStateChange();
      
      // Schedule next check for tomorrow
      await this.scheduleNextAlarmCheck();
      
    } catch (error) {
      // Record the error
      this.alarmState.lastCheckTime = new Date();
      this.alarmState.lastCheckResult = 'error';
      this.alarmState.lastCheckWindSpeed = null;
      this.notifyStateChange();
      
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
      
      // Cancel background notification if scheduled
      if (this.scheduledNotificationId) {
        await alarmNotificationService.cancelAlarmNotification(this.scheduledNotificationId);
        this.scheduledNotificationId = null;
        AlarmLogger.info('Cancelled background notification');
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
      
      // Load last check information if available
      if (criteria.lastCheckTime) {
        this.alarmState.lastCheckTime = new Date(criteria.lastCheckTime);
      }
      if (criteria.lastCheckResult) {
        this.alarmState.lastCheckResult = criteria.lastCheckResult;
      }
      if (criteria.lastCheckWindSpeed !== undefined) {
        this.alarmState.lastCheckWindSpeed = criteria.lastCheckWindSpeed;
      }
      
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
        alarmTime: this.alarmState.alarmTime,
        lastCheckTime: this.alarmState.lastCheckTime?.toISOString() || null,
        lastCheckResult: this.alarmState.lastCheckResult,
        lastCheckWindSpeed: this.alarmState.lastCheckWindSpeed
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

  /**
   * Schedule a background notification for the alarm check
   * This notification will wake up the app to run the wind check and alarm
   */
  private async scheduleBackgroundNotification(alarmTime: Date): Promise<void> {
    try {
      const now = new Date();
      const msUntilAlarm = alarmTime.getTime() - now.getTime();
      
      // Safety check: don't schedule notifications too close to current time
      if (msUntilAlarm < 30000) { // Less than 30 seconds
        AlarmLogger.warning(`⚠️ Skipping notification scheduling - alarm time too close (${Math.round(msUntilAlarm/1000)} seconds away). Use foreground timer only.`);
        return;
      }
      
      AlarmLogger.info(`📱 Scheduling background notification for ${alarmTime.toLocaleString()} (${Math.round(msUntilAlarm/1000/60)} minutes away)`);
      
      const notificationId = await alarmNotificationService.scheduleAlarmNotification(
        alarmTime,
        '🌊 Dawn Patrol Wind Check',
        'Time to check wind conditions for your dawn patrol session!',
        {
          type: 'wind_alarm',
          scheduledTime: alarmTime.toISOString(),
          scheduledForFuture: true
        }
      );

      if (notificationId) {
        this.scheduledNotificationId = notificationId;
        AlarmLogger.success(`✅ Background alarm notification scheduled with ID: ${notificationId}`);
      } else {
        AlarmLogger.warning('⚠️ Failed to schedule background notification - will rely on foreground timer only');
      }
    } catch (error) {
      AlarmLogger.error('❌ Error scheduling background notification:', error);
      // Don't throw - let foreground timer handle if notification fails
    }
  }

  /**
   * Set up notification listeners to handle background alarm notifications
   */
  private setupNotificationListeners(): void {
    try {
      AlarmLogger.info('🔔 Setting up notification listeners for background alarm support...');

      // Listen for notifications received while app is in foreground
      this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived.bind(this)
      );

      // Listen for notification taps (when app is opened from background)
      this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      AlarmLogger.success('✅ Notification listeners set up successfully');
    } catch (error) {
      AlarmLogger.error('❌ Error setting up notification listeners:', error);
    }
  }

  /**
   * Clean up notification listeners
   */
  private cleanupNotificationListeners(): void {
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
      AlarmLogger.info('Cleaned up notification received listener');
    }

    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
      AlarmLogger.info('Cleaned up notification response listener');
    }
  }

  /**
   * Handle notification received while app is in foreground
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    try {
      const { categoryIdentifier, title, body } = notification.request.content;
      const notificationId = notification.request.identifier;

      AlarmLogger.info('🔔 Notification received (app in foreground):', {
        categoryIdentifier,
        title,
        body,
        identifier: notificationId
      });

      // Check if this is our alarm notification
      if (categoryIdentifier === 'wind-alarm') {
        // Additional safety check: make sure we're actually at or past the scheduled alarm time
        const now = new Date();
        const [hours, minutes] = this.alarmState.alarmTime.split(':').map(Number);
        const expectedAlarmTime = new Date();
        expectedAlarmTime.setHours(hours, minutes, 0, 0);
        
        // If the expected alarm time is in the future (more than 1 minute), this might be a premature firing
        const msUntilExpected = expectedAlarmTime.getTime() - now.getTime();
        if (msUntilExpected > 60000) { // More than 1 minute early
          AlarmLogger.warning(`⚠️ Notification fired too early! Expected at ${expectedAlarmTime.toLocaleString()}, but it's only ${now.toLocaleString()}. Ignoring.`);
          return;
        }
        
        AlarmLogger.info('⏰ Alarm notification received - triggering alarm check');
        await this.performAlarmCheck();
      }
    } catch (error) {
      AlarmLogger.error('Error handling received notification:', error);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const { categoryIdentifier, title, body } = response.notification.request.content;

      AlarmLogger.info('🔔 Notification tapped (app opened from background):', {
        categoryIdentifier,
        title,
        body
      });

      // Check if this is our alarm notification
      if (categoryIdentifier === 'wind-alarm') {
        // Additional safety check: make sure we're actually at or past the scheduled alarm time
        const now = new Date();
        const [hours, minutes] = this.alarmState.alarmTime.split(':').map(Number);
        const expectedAlarmTime = new Date();
        expectedAlarmTime.setHours(hours, minutes, 0, 0);
        
        // If the expected alarm time is in the future (more than 1 minute), this might be a premature firing
        const msUntilExpected = expectedAlarmTime.getTime() - now.getTime();
        if (msUntilExpected > 60000) { // More than 1 minute early
          AlarmLogger.warning(`⚠️ Notification response too early! Expected at ${expectedAlarmTime.toLocaleString()}, but it's only ${now.toLocaleString()}. Ignoring.`);
          return;
        }
        
        AlarmLogger.info('⏰ User opened app from alarm notification - triggering alarm check');
        await this.performAlarmCheck();
      }
    } catch (error) {
      AlarmLogger.error('Error handling notification response:', error);
    }
  }

  /**
   * Cleanup method (call when service is destroyed)
   */
  async cleanup(): Promise<void> {
    try {
      await this.emergencyStop();
      this.cleanupNotificationListeners();
      AlarmLogger.info('Unified Alarm Manager cleanup completed');
    } catch (error) {
      AlarmLogger.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const unifiedAlarmManager = new UnifiedAlarmManager();
