import { Alert } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';
import { alarmNotificationService } from './alarmNotificationService';
import { alarmAudio } from './alarmAudioService';
import type { WindAnalysis } from './windService';

export interface EnhancedAlarmOptions {
  alarmTime: string;
  useBackgroundNotifications: boolean;
  immediateCheck?: boolean;
}

export interface AlarmScheduleResult {
  success: boolean;
  usingBackgroundNotifications: boolean;
  scheduledTime?: Date;
  notificationId?: string;
  message: string;
}

/**
 * Enhanced Alarm Service
 * 
 * Provides both foreground (app open) and background (notifications) alarm capabilities.
 * Automatically falls back to notifications when the app is not in the foreground.
 */
class EnhancedAlarmService {
  private foregroundTimer: NodeJS.Timeout | null = null;
  private scheduledNotificationId: string | null = null;
  private isAppInForeground: boolean = true;

  /**
   * Initialize the service and request necessary permissions
   */
  async initialize(): Promise<void> {
    try {
      AlarmLogger.info('Initializing Enhanced Alarm Service...');
      
      // Request notification permissions
      const hasNotificationPermissions = await alarmNotificationService.requestPermissions();
      
      if (!hasNotificationPermissions) {
        AlarmLogger.warning('Notification permissions not granted - only foreground alarms will work');
      }

      // Set up notification channels
      await alarmNotificationService.setupNotificationChannels();
      
      AlarmLogger.success('Enhanced Alarm Service initialized');
    } catch (error) {
      AlarmLogger.error('Error initializing Enhanced Alarm Service:', error);
    }
  }

  /**
   * Schedule an alarm with both foreground and background support
   */
  async scheduleAlarm(options: EnhancedAlarmOptions): Promise<AlarmScheduleResult> {
    const { alarmTime, useBackgroundNotifications, immediateCheck = false } = options;

    try {
      AlarmLogger.info(`Scheduling alarm for ${alarmTime}`, { useBackgroundNotifications, immediateCheck });

      // Clear any existing alarms
      await this.cancelAllAlarms();

      // If immediate check requested, trigger alarm logic now
      if (immediateCheck) {
        return this.handleImmediateAlarmCheck();
      }

      // Parse alarm time
      const [hours, minutes] = alarmTime.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      const now = new Date();
      if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      // Calculate time until alarm
      const msUntilAlarm = scheduledTime.getTime() - now.getTime();
      const hoursUntilAlarm = msUntilAlarm / (1000 * 60 * 60);

      // For alarms more than 12 hours away, always use notifications
      // For alarms within 12 hours, use foreground timer if app is open, otherwise notifications
      const shouldUseNotifications = useBackgroundNotifications || hoursUntilAlarm > 12;

      if (shouldUseNotifications && alarmNotificationService.isNotificationSupported()) {
        return await this.scheduleBackgroundAlarm(alarmTime, scheduledTime);
      } else {
        return await this.scheduleForegroundAlarm(scheduledTime);
      }

    } catch (error) {
      AlarmLogger.error('Error scheduling alarm:', error);
      return {
        success: false,
        usingBackgroundNotifications: false,
        message: `Failed to schedule alarm: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Schedule a background notification alarm
   */
  private async scheduleBackgroundAlarm(alarmTime: string, scheduledTime: Date): Promise<AlarmScheduleResult> {
    try {
      const notificationId = await alarmNotificationService.scheduleAlarmNotification(
        scheduledTime, // Pass the actual scheduled time instead of just the time string
        '🌊 Dawn Patrol Alert!',
        'Wind conditions look favorable - time to check if you should wake up!'
      );

      if (notificationId) {
        this.scheduledNotificationId = notificationId;
        
        AlarmLogger.success(`Background alarm scheduled for ${scheduledTime.toLocaleString()}`);
        
        return {
          success: true,
          usingBackgroundNotifications: true,
          scheduledTime,
          notificationId,
          message: `Background alarm set for ${scheduledTime.toLocaleTimeString()}. You'll receive a notification even if the app is closed.`
        };
      } else {
        // Fall back to foreground alarm
        AlarmLogger.warning('Failed to schedule background notification, falling back to foreground alarm');
        return await this.scheduleForegroundAlarm(scheduledTime);
      }
    } catch (error) {
      AlarmLogger.error('Error scheduling background alarm:', error);
      return await this.scheduleForegroundAlarm(scheduledTime);
    }
  }

  /**
   * Schedule a foreground timer alarm (requires app to stay open)
   */
  private async scheduleForegroundAlarm(scheduledTime: Date): Promise<AlarmScheduleResult> {
    try {
      const now = new Date();
      const msUntilAlarm = scheduledTime.getTime() - now.getTime();

      // Clear any existing timer
      if (this.foregroundTimer) {
        clearTimeout(this.foregroundTimer);
      }

      // Set up the timer
      this.foregroundTimer = setTimeout(async () => {
        await this.triggerAlarmCheck();
      }, msUntilAlarm);

      AlarmLogger.success(`Foreground alarm scheduled for ${scheduledTime.toLocaleString()}`);

      return {
        success: true,
        usingBackgroundNotifications: false,
        scheduledTime,
        message: `Foreground alarm set for ${scheduledTime.toLocaleTimeString()}. Keep the app open for the alarm to work.`
      };
    } catch (error) {
      AlarmLogger.error('Error scheduling foreground alarm:', error);
      return {
        success: false,
        usingBackgroundNotifications: false,
        message: `Failed to schedule foreground alarm: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Handle immediate alarm check (for testing or manual triggers)
   */
  private async handleImmediateAlarmCheck(): Promise<AlarmScheduleResult> {
    try {
      await this.triggerAlarmCheck();
      
      return {
        success: true,
        usingBackgroundNotifications: false,
        message: 'Immediate alarm check triggered'
      };
    } catch (error) {
      AlarmLogger.error('Error with immediate alarm check:', error);
      return {
        success: false,
        usingBackgroundNotifications: false,
        message: `Failed to trigger immediate alarm: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Trigger the actual alarm check and play alarm if conditions are met
   */
  private async triggerAlarmCheck(): Promise<void> {
    try {
      AlarmLogger.info('Triggering alarm check...');

      // Here you would check wind conditions
      // For now, we'll just play the alarm sound
      // In the actual implementation, you'd integrate with your wind analysis logic

      // Play alarm sound if app is in foreground
      if (this.isAppInForeground) {
        await alarmAudio.play(0.7);
        AlarmLogger.success('Alarm triggered - playing audio');
      } else {
        AlarmLogger.info('App in background - alarm notification should have been shown');
      }

    } catch (error) {
      AlarmLogger.error('Error triggering alarm check:', error);
    }
  }

  /**
   * Cancel all scheduled alarms (both foreground and background)
   */
  async cancelAllAlarms(): Promise<void> {
    try {
      // Cancel foreground timer
      if (this.foregroundTimer) {
        clearTimeout(this.foregroundTimer);
        this.foregroundTimer = null;
        AlarmLogger.info('Cancelled foreground alarm timer');
      }

      // Cancel background notifications
      if (this.scheduledNotificationId) {
        await alarmNotificationService.cancelAlarmNotification(this.scheduledNotificationId);
        this.scheduledNotificationId = null;
      } else {
        // Cancel all notifications as fallback
        await alarmNotificationService.cancelAllAlarmNotifications();
      }

      AlarmLogger.info('All alarms cancelled');
    } catch (error) {
      AlarmLogger.error('Error cancelling alarms:', error);
    }
  }

  /**
   * Stop any currently playing alarm
   */
  async stopAlarm(): Promise<void> {
    try {
      await alarmAudio.stop();
      AlarmLogger.info('Alarm stopped');
    } catch (error) {
      AlarmLogger.error('Error stopping alarm:', error);
    }
  }

  /**
   * Update app foreground state (call this from app state change handlers)
   */
  setAppForegroundState(isInForeground: boolean): void {
    this.isAppInForeground = isInForeground;
    AlarmLogger.info(`App foreground state changed: ${isInForeground ? 'foreground' : 'background'}`);
  }

  /**
   * Get current alarm status
   */
  getAlarmStatus(): {
    hasForegroundTimer: boolean;
    hasBackgroundNotification: boolean;
    isAppInForeground: boolean;
  } {
    return {
      hasForegroundTimer: this.foregroundTimer !== null,
      hasBackgroundNotification: this.scheduledNotificationId !== null,
      isAppInForeground: this.isAppInForeground,
    };
  }

  /**
   * Show user-friendly alarm setup explanation
   */
  async showAlarmSetupInfo(): Promise<void> {
    const hasNotificationPermissions = await alarmNotificationService.requestPermissions();
    
    const message = hasNotificationPermissions
      ? "✅ Background alarms are enabled! You'll receive notifications even when the app is closed.\n\n" +
        "The app will automatically choose the best alarm method:\n" +
        "• Background notifications for alarms more than 12 hours away\n" +
        "• Foreground timers for immediate or near-term alarms\n\n" +
        "You can now close the app and still receive your dawn patrol alerts!"
      : "⚠️ Background notifications are not available.\n\n" +
        "To receive alarms, you'll need to:\n" +
        "• Keep the app open and in the foreground\n" +
        "• Enable notifications in your device settings for full functionality\n\n" +
        "Go to Settings > Notifications to enable background alarms.";

    Alert.alert(
      hasNotificationPermissions ? "🎉 Background Alarms Ready!" : "📱 Foreground Alarms Only",
      message,
      [{ text: "Got it!", style: "default" }]
    );
  }
}

// Export singleton instance
export const enhancedAlarmService = new EnhancedAlarmService();
