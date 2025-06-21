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
    // iOS and Android always support notifications
    return true;
  }

  /**
   * Request notification permissions (if not already granted)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      AlarmLogger.info('🔔 Checking notification permissions...');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      AlarmLogger.info(`📋 Current permission status: ${existingStatus}`);
      let finalStatus = existingStatus;

      // Only ask for permissions if we don't already have them
      if (existingStatus !== 'granted') {
        AlarmLogger.info('📱 Requesting notification permissions from user...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        AlarmLogger.info(`📋 Permission request result: ${status}`);
      } else {
        AlarmLogger.info('✅ Notification permissions already granted');
      }

      const hasPermission = finalStatus === 'granted';
      AlarmLogger.info(`🔔 Final permission status: ${hasPermission ? 'GRANTED' : 'DENIED'}`);
      return hasPermission;
    } catch (error) {
      AlarmLogger.error('❌ Error requesting notification permissions:', error);
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
      AlarmLogger.info(`📅 Scheduling notification: "${title}" for ${triggerDate.toLocaleString()}`);

      if (!this.isNotificationSupported()) {
        AlarmLogger.error('❌ Notifications not supported on this platform');
        return null;
      }

      const now = new Date();
      const msUntilTrigger = triggerDate.getTime() - now.getTime();
      
      if (msUntilTrigger <= 0) {
        AlarmLogger.warning(`⚠️ Cannot schedule notification for past date: ${triggerDate.toLocaleString()}`);
        return null;
      }

      const secondsUntilTrigger = Math.ceil(msUntilTrigger / 1000);
      AlarmLogger.info(`⏰ Scheduling notification for ${secondsUntilTrigger} seconds from now`);

      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: false, // Silent by default for general notifications (false = no sound)
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

      AlarmLogger.success(`✅ General notification scheduled successfully with ID: ${identifier}`);
      return identifier;
    } catch (error) {
      AlarmLogger.error('❌ Failed to schedule general notification:', error);
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
          enableVibrate: false,
          showBadge: false,
        });

        // Weather refresh channel
        await Notifications.setNotificationChannelAsync('weather-refresh-channel', {
          name: 'Weather Data Refresh',
          description: 'Automatic weather data updates for wind predictions',
          importance: Notifications.AndroidImportance.DEFAULT,
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
