import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';

/**
 * General Notification Service
 * 
 * Handles non-alarm notifications like weather updates, app updates, etc.
 * Separate from AlarmNotificationService to maintain clear separation of concerns.
 */
class GeneralNotificationService {
  private static instance: GeneralNotificationService;

  private constructor() {}

  public static getInstance(): GeneralNotificationService {
    if (!GeneralNotificationService.instance) {
      GeneralNotificationService.instance = new GeneralNotificationService();
    }
    return GeneralNotificationService.instance;
  }

  /**
   * Check if notifications are supported on this platform
   */
  isNotificationSupported(): boolean {
    return Platform.OS !== 'web';
  }

  /**
   * Request notification permissions (if not already granted)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        AlarmLogger.warning('Notifications not supported on web platform');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask for permissions if we don't already have them
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (error) {
      AlarmLogger.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a general notification
   */
  async scheduleNotification(
    triggerDate: Date,
    title: string,
    body: string,
    channelId: string = 'general-notifications',
    data?: any
  ): Promise<string | null> {
    try {
      if (!this.isNotificationSupported()) {
        return null;
      }

      const now = new Date();
      const msUntilTrigger = triggerDate.getTime() - now.getTime();
      
      if (msUntilTrigger <= 0) {
        AlarmLogger.warning(`Cannot schedule notification for past date: ${triggerDate.toLocaleString()}`);
        return null;
      }

      const secondsUntilTrigger = Math.ceil(msUntilTrigger / 1000);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: undefined, // Silent by default for general notifications
          priority: 'normal',
          data: {
            ...data,
            scheduledTime: triggerDate.toISOString(),
          },
        },
        trigger: {
          seconds: secondsUntilTrigger,
          channelId: channelId,
        },
      });

      AlarmLogger.info(`General notification scheduled with ID: ${identifier}`);
      return identifier;
    } catch (error) {
      AlarmLogger.error('Error scheduling general notification:', error);
      return null;
    }
  }

  /**
   * Cancel a specific notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      AlarmLogger.info(`Cancelled notification: ${identifier}`);
    } catch (error) {
      AlarmLogger.error('Error cancelling notification:', error);
    }
  }

  /**
   * Set up general notification channels (Android only)
   */
  async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        // General notifications channel
        await Notifications.setNotificationChannelAsync('general-notifications', {
          name: 'General Notifications',
          description: 'General app notifications and updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: undefined, // Silent
          enableVibrate: false,
          showBadge: false,
        });

        // Weather refresh channel
        await Notifications.setNotificationChannelAsync('weather-refresh-channel', {
          name: 'Weather Data Refresh',
          description: 'Automatic weather data updates for wind predictions',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: undefined, // Silent
          enableVibrate: false,
          showBadge: false,
        });
        
        AlarmLogger.info('General notification channels created');
      } catch (error) {
        AlarmLogger.error('Error setting up general notification channels:', error);
      }
    }
  }

  /**
   * Initialize the general notification service
   */
  async initialize(): Promise<void> {
    try {
      AlarmLogger.info('Initializing general notification service...');
      
      // Set up notification channels
      await this.setupNotificationChannels();
      
      // Request permissions (but don't require them - many general notifications can work without)
      const hasPermissions = await this.requestPermissions();
      
      if (!hasPermissions) {
        AlarmLogger.warning('Notification permissions not granted - some background features may not work');
      }
      
      AlarmLogger.success('General notification service initialized');
    } catch (error) {
      AlarmLogger.error('Error initializing general notification service:', error);
    }
  }
}

// Export singleton instance
export const generalNotificationService = GeneralNotificationService.getInstance();
