import { Platform } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';
import { alarmNotificationService } from './alarmNotificationService';
import { alarmAudio } from './alarmAudioService';
import { notificationListeners } from './notificationListeners';
import { fetchWindData, analyzeWindData, getAlarmCriteria, checkSimplifiedAlarmConditions, type AlarmCriteria, type WindAnalysis } from './windService';

export interface AlarmState {
  isEnabled: boolean;
  isActive: boolean;
  isPlaying: boolean;
  alarmTime: string;
  nextCheckTime: Date | null;
  hasBackgroundSupport: boolean;
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
 * - Alarm scheduling (foreground timers + background notifications)
 * - Audio playback and vibration
 * - Push notifications
 * - Test functionality
 */
class UnifiedAlarmManager {
  private foregroundTimer: NodeJS.Timeout | null = null;
  private scheduledNotificationId: string | null = null;
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
    hasBackgroundSupport: false
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
      
      // Request notification permissions for background support
      const hasNotificationPermissions = await alarmNotificationService.requestPermissions();
      this.alarmState.hasBackgroundSupport = hasNotificationPermissions;
      
      if (!hasNotificationPermissions && Platform.OS !== 'web') {
        AlarmLogger.warning('Notification permissions not granted - only foreground alarms will work');
      }

      // Set up notification channels
      await alarmNotificationService.setupNotificationChannels();
      
      // Initialize notification listeners with callback to prevent circular dependency
      AlarmLogger.info('🔧 Initializing notification listeners with callback...');
      await notificationListeners.initialize(() => {
        AlarmLogger.warning('🚨 NOTIFICATION CALLBACK TRIGGERED - this should only happen for valid alarm notifications!');
        AlarmLogger.info('🔍 Callback stack trace:', new Error().stack?.split('\n').slice(0, 8).join('\n'));
        return this.testAlarmWithCurrentConditions();
      });
      
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
        // When user explicitly enables alarm, schedule with full notification support
        await this.scheduleNextAlarmCheck(false); // NOT silent - user action
        AlarmLogger.info('Alarm system enabled - notifications scheduled');
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
        // When user changes time, schedule with full notification support
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
   * Test the alarm with current wind conditions
   */
  async testAlarmWithCurrentConditions(): Promise<{ triggered: boolean; analysis: any }> {
    try {
      // DEBUG: Log the call stack to see what's calling this method
      const stack = new Error().stack;
      AlarmLogger.info('🔍 testAlarmWithCurrentConditions called!', {
        timestamp: new Date().toISOString(),
        callStack: stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack trace
      });
      
      AlarmLogger.info('Testing alarm with current simplified conditions...');
      
      const result = await checkSimplifiedAlarmConditions();
      
      if (result.shouldTrigger) {
        const message = `🧪 Test alarm - current conditions are favorable!\n` +
          `Current: ${result.currentSpeed?.toFixed(1) || 'N/A'} mph, ` +
          `Average: ${result.averageSpeed?.toFixed(1) || 'N/A'} mph ` +
          `(threshold: ${result.threshold} mph)`;
        
        await this.triggerAlarm(message);
        return { triggered: true, analysis: result };
      } else {
        AlarmLogger.info('Test completed - current conditions do not meet alarm criteria');
        return { triggered: false, analysis: result };
      }
    } catch (error) {
      AlarmLogger.error('Error testing alarm with current conditions:', error);
      throw error;
    }
  }

  /**
   * Test the alarm with ideal wind conditions
   */
  async testAlarmWithIdealConditions(): Promise<{ triggered: boolean; analysis: any }> {
    try {
      AlarmLogger.info('Testing alarm with ideal wind conditions...');
      
      // Create mock ideal conditions for simplified system
      const idealResult = {
        shouldTrigger: true,
        currentSpeed: 15.5,
        averageSpeed: 14.2,
        threshold: 10,
        confidence: 'high' as const,
        reason: 'Test conditions: Ideal wind conditions simulated - perfect for dawn patrol!'
      };
      
      const message = `🧪 Test alarm - ideal conditions simulated!\n` +
        `Current: ${idealResult.currentSpeed} mph, ` +
        `Average: ${idealResult.averageSpeed} mph ` +
        `(threshold: ${idealResult.threshold} mph)`;
      
      await this.triggerAlarm(message);
      return { triggered: true, analysis: idealResult };
    } catch (error) {
      AlarmLogger.error('Error testing alarm with ideal conditions:', error);
      throw error;
    }
  }

  /**
   * Test the alarm after a specified delay (for background testing)
   */
  async testAlarmWithDelay(delaySeconds: number): Promise<{ scheduled: boolean; triggerTime: Date }> {
    try {
      const triggerTime = new Date(Date.now() + (delaySeconds * 1000));
      AlarmLogger.info(`Scheduling delayed test alarm for ${triggerTime.toLocaleString()}`);
      
      // Schedule a timer for the test
      setTimeout(async () => {
        try {
          const message = `🧪 Delayed Test Alarm!\nThis alarm was scheduled ${delaySeconds} seconds ago to test background functionality.`;
          await this.triggerAlarm(message);
          
          AlarmLogger.success('Delayed test alarm triggered successfully');
        } catch (error) {
          AlarmLogger.error('Error triggering delayed test alarm:', error);
        }
      }, delaySeconds * 1000);
      
      // Also schedule a background notification as backup
      if (this.alarmState.hasBackgroundSupport) {
        await alarmNotificationService.scheduleAlarmNotification(
          triggerTime,
          '🧪 Test Alarm - Background Check!',
          `This is a test alarm scheduled ${delaySeconds} seconds ago. If you see this, background alarms are working!`,
          { deepLink: '/(tabs)/' } // Deep link to DP alarm page
        );
      }
      
      AlarmLogger.info(`Delayed test alarm scheduled for ${delaySeconds} seconds from now`);
      return { scheduled: true, triggerTime };
      
    } catch (error) {
      AlarmLogger.error('Error scheduling delayed test alarm:', error);
      throw error;
    }
  }

  /**
   * Test the alarm with ideal conditions after a specified delay (for background testing)
   */
  async testAlarmWithDelayedIdealConditions(delaySeconds: number): Promise<{ scheduled: boolean; triggerTime: Date }> {
    try {
      const triggerTime = new Date(Date.now() + (delaySeconds * 1000));
      AlarmLogger.info(`Scheduling delayed ideal conditions test alarm for ${triggerTime.toLocaleString()}`);
      
      // Schedule a timer for the test
      setTimeout(async () => {
        try {
          const message = `⭐ Delayed Ideal Conditions Test!\nThis alarm was scheduled ${delaySeconds} seconds ago with simulated perfect wind conditions - wake up for great wind!`;
          await this.triggerAlarm(message);
          
          AlarmLogger.success('Delayed ideal conditions test alarm triggered successfully');
        } catch (error) {
          AlarmLogger.error('Error triggering delayed ideal conditions test alarm:', error);
        }
      }, delaySeconds * 1000);
      
      // Also schedule a background notification as backup
      if (this.alarmState.hasBackgroundSupport) {
        await alarmNotificationService.scheduleAlarmNotification(
          triggerTime,
          '⭐ Ideal Conditions Test!',
          `Perfect wind conditions detected! This delayed test simulates ideal dawn patrol conditions.`,
          { deepLink: '/(tabs)/' } // Deep link to DP alarm page
        );
      }
      
      AlarmLogger.info(`Delayed ideal conditions test alarm scheduled for ${delaySeconds} seconds from now`);
      return { scheduled: true, triggerTime };
      
    } catch (error) {
      AlarmLogger.error('Error scheduling delayed ideal conditions test alarm:', error);
      throw error;
    }
  }

  /**
   * Manually schedule notifications (for user testing purposes)
   * This can be called from test buttons to verify notification scheduling works
   */
  async scheduleNotificationForTesting(): Promise<boolean> {
    try {
      if (!this.alarmState.isEnabled) {
        AlarmLogger.warning('Cannot schedule notification - alarm is not enabled');
        return false;
      }

      if (!this.alarmState.hasBackgroundSupport) {
        AlarmLogger.warning('Cannot schedule notification - no background support');
        return false;
      }

      // Schedule with normal notification support (not silent)
      await this.scheduleNextAlarmCheck(false);
      AlarmLogger.success('✅ Manual notification scheduling completed for testing');
      return true;
    } catch (error) {
      AlarmLogger.error('Error manually scheduling notification:', error);
      return false;
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
      
      // Cancel all timers and notifications
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
   * Uses hybrid approach: foreground timer + background notification
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
      
      // Skip notification scheduling if in silent mode (initialization)
      if (silent) {
        AlarmLogger.info('🔇 Silent mode: Skipping notification scheduling to prevent unwanted notifications during initialization');
      } else {
        // ALWAYS schedule the background notification as the primary mechanism
        // The JavaScript timer is just a backup for when the app is in foreground
        if (this.alarmState.hasBackgroundSupport) {
          this.scheduledNotificationId = await alarmNotificationService.scheduleAlarmNotification(
            nextCheckTime,
            '🌊 DAWN PATROL ALARM!',
            'Checking wind conditions now... Tap to see if you should wake up! 🏄‍♂️'
          );
          AlarmLogger.success('Background notification scheduled as primary alarm mechanism');
        } else {
          AlarmLogger.warning('No notification permissions - alarm will only work in foreground');
        }
      }
      
      // Schedule foreground timer as backup (only works when app is active)
      this.foregroundTimer = setTimeout(async () => {
        AlarmLogger.info('Foreground timer triggered - performing alarm check');
        await this.performAlarmCheck();
      }, msUntilAlarm);
      
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
   * Trigger the alarm (audio + notification)
   * This method plays the alarm sound and sends convenience notifications
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
        // Continue with notification even if audio fails
      }
      
      // Send immediate notification to help user access the app
      // This is a convenience feature - the alarm should already be audible
      if (this.alarmState.hasBackgroundSupport) {
        await alarmNotificationService.scheduleAlarmNotification(
          new Date(Date.now() + 1000), // Send after 1 second
          '🚨 ALARM RINGING!',
          `${message}\n\nYour alarm is playing! Tap to open app and stop alarm.`,
          { deepLink: '/(tabs)/' } // Deep link to DP alarm page
        );
        AlarmLogger.info('📱 Convenience notification sent to help user access app with deep link to DP alarm page');
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
      
      // Cancel specific background notification if we have the ID
      if (this.scheduledNotificationId) {
        await alarmNotificationService.cancelAlarmNotification(this.scheduledNotificationId);
        this.scheduledNotificationId = null;
        AlarmLogger.info('Cancelled specific scheduled notification');
      }
      
      // Also cancel ALL notifications as a safety measure to prevent conflicts
      await alarmNotificationService.cancelAllAlarmNotifications();
      AlarmLogger.info('Cancelled all alarm notifications as safety measure');
      
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
      // NEVER schedule notifications during initialization to prevent unwanted popups
      if (this.alarmState.isEnabled) {
        await this.scheduleNextAlarmCheck(true);
        
        AlarmLogger.info('🔇 INITIALIZATION: Alarm is enabled but skipping all notification scheduling during initialization');
        AlarmLogger.info('📝 To schedule notifications, user must manually toggle alarm settings or app must restart');
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
