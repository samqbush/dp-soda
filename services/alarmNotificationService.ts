import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface AlarmNotificationService {
  requestPermissions(): Promise<boolean>;
  scheduleAlarmNotification(
    triggerDate: Date,
    title: string,
    body: string
  ): Promise<string | null>;
  scheduleImmediateTestNotification(
    delayMinutes: number,
    title: string,
    body: string
  ): Promise<string | null>;
  cancelAlarmNotification(identifier: string): Promise<void>;
  cancelAllAlarmNotifications(): Promise<void>;
  cancelAllNotifications(): Promise<void>; // Emergency method
  isNotificationSupported(): boolean;
}

class AlarmNotificationServiceImpl implements AlarmNotificationService {
  private scheduledNotificationId: string | null = null;

  /**
   * Request notification permissions from the user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      AlarmLogger.info('Requesting notification permissions...');
      
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

      if (finalStatus !== 'granted') {
        AlarmLogger.error('Notification permissions denied');
        return false;
      }

      AlarmLogger.success('Notification permissions granted');
      return true;
    } catch (error) {
      AlarmLogger.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule an alarm notification for a specific time
   */
  async scheduleAlarmNotification(
    triggerDate: Date,
    title: string,
    body: string,
    data?: any
  ): Promise<string | null> {
    try {
      if (!this.isNotificationSupported()) {
        AlarmLogger.warning('Notifications not supported on this platform');
        return null;
      }

      AlarmLogger.info(`Scheduling alarm notification for ${triggerDate.toLocaleString()}`);
      
      // DEBUG: Check if the date is in the future
      const now = new Date();
      const msUntilTrigger = triggerDate.getTime() - now.getTime();
      const hoursUntilTrigger = msUntilTrigger / (1000 * 60 * 60);
      
      AlarmLogger.info(`🔍 DEBUG: Notification date check:`, {
        triggerDate: triggerDate.toISOString(),
        now: now.toISOString(),
        msUntilTrigger,
        hoursUntilTrigger: hoursUntilTrigger.toFixed(2),
        isInFuture: msUntilTrigger > 0
      });
      
      // If the date is not in the future, don't schedule it
      if (msUntilTrigger <= 0) {
        AlarmLogger.warning(`⚠️ Cannot schedule notification for past date: ${triggerDate.toLocaleString()}`);
        return null;
      }

      // Cancel any existing notification
      if (this.scheduledNotificationId) {
        await this.cancelAlarmNotification(this.scheduledNotificationId);
      }

      // Schedule the new notification
      // Try seconds-based trigger as alternative to date-based trigger for reliability
      const secondsUntilTrigger = Math.ceil(msUntilTrigger / 1000);
      
      AlarmLogger.info(`🔍 DEBUG: Using seconds-based trigger: ${secondsUntilTrigger} seconds from now`);
      
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: 'high',
          categoryIdentifier: 'wind-alarm',
          data: data || {},
        },
        trigger: {
          seconds: secondsUntilTrigger,
          channelId: 'wind-alarm-channel',
        },
      });

      this.scheduledNotificationId = identifier;
      AlarmLogger.success(`Alarm notification scheduled with ID: ${identifier}`);
      
      return identifier;
    } catch (error) {
      AlarmLogger.error('Error scheduling alarm notification:', error);
      return null;
    }
  }

  /**
   * Cancel a specific alarm notification
   */
  async cancelAlarmNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      
      if (this.scheduledNotificationId === identifier) {
        this.scheduledNotificationId = null;
      }
      
      AlarmLogger.info(`Cancelled alarm notification: ${identifier}`);
    } catch (error) {
      AlarmLogger.error('Error cancelling alarm notification:', error);
    }
  }

  /**
   * Cancel all scheduled alarm notifications
   */
  async cancelAllAlarmNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotificationId = null;
      AlarmLogger.info('Cancelled all alarm notifications');
    } catch (error) {
      AlarmLogger.error('Error cancelling all alarm notifications:', error);
    }
  }

  /**
   * Emergency method to cancel ALL scheduled notifications (including test notifications)
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.scheduledNotificationId = null;
      AlarmLogger.info('🧹 EMERGENCY: Cancelled ALL scheduled notifications');
    } catch (error) {
      AlarmLogger.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Check if notifications are supported on this platform
   */
  isNotificationSupported(): boolean {
    return Platform.OS !== 'web';
  }

  /**
   * Set up notification channels (Android only)
   */
  async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('wind-alarm-channel', {
          name: 'Wind Alarm',
          description: 'Notifications for wind condition alarms',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          sound: 'default',
          enableLights: true,
          lightColor: '#FF0000',
          enableVibrate: true,
        });
        
        AlarmLogger.info('Android notification channel created');
      } catch (error) {
        AlarmLogger.error('Error setting up notification channels:', error);
      }
    }
  }

  /**
   * Get the current scheduled notification ID
   */
  getScheduledNotificationId(): string | null {
    return this.scheduledNotificationId;
  }

  /**
   * Schedule an immediate test notification (for testing purposes)
   */
  async scheduleImmediateTestNotification(
    delayMinutes: number,
    title: string,
    body: string
  ): Promise<string | null> {
    try {
      if (!this.isNotificationSupported()) {
        AlarmLogger.warning('Notifications not supported on this platform');
        return null;
      }

      // Create trigger time for the specified delay from now
      const triggerDate = new Date();
      triggerDate.setMinutes(triggerDate.getMinutes() + delayMinutes);

      AlarmLogger.info(`Scheduling test notification for ${triggerDate.toLocaleString()}`);

      // Schedule the test notification (don't cancel existing alarms)
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: 'high',
          categoryIdentifier: 'wind-alarm-test',
        },
        trigger: {
          date: triggerDate,
          channelId: 'wind-alarm-channel',
        },
      });

      AlarmLogger.success(`Test notification scheduled with ID: ${identifier}`);
      
      return identifier;
    } catch (error) {
      AlarmLogger.error('Error scheduling test notification:', error);
      return null;
    }
  }
}

// Export singleton instance
export const alarmNotificationService = new AlarmNotificationServiceImpl();

/**
 * Initialize notification service (call this at app startup)
 */
export const initializeNotificationService = async (): Promise<void> => {
  try {
    AlarmLogger.info('Initializing notification service...');
    
    // Set up notification channels for Android
    await alarmNotificationService.setupNotificationChannels();
    
    // Request permissions
    const hasPermissions = await alarmNotificationService.requestPermissions();
    
    if (!hasPermissions) {
      AlarmLogger.warning('Notification permissions not granted - background alarms will not work');
    }
    
    AlarmLogger.success('Notification service initialized');
  } catch (error) {
    AlarmLogger.error('Error initializing notification service:', error);
  }
};

/**
 * Create notification categories for interactive notifications (iOS)
 */
export const setupNotificationCategories = async (): Promise<void> => {
  if (Platform.OS === 'ios') {
    try {
      await Notifications.setNotificationCategoryAsync('wind-alarm', [
        {
          identifier: 'CHECK_CONDITIONS',
          buttonTitle: 'Check Conditions',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SNOOZE',
          buttonTitle: 'Snooze 15 min',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      
      AlarmLogger.info('iOS notification categories set up');
    } catch (error) {
      AlarmLogger.error('Error setting up notification categories:', error);
    }
  }
};
