import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlarmLogger } from './alarmDebugLogger';
import { hybridWeatherService } from './hybridWeatherService';
import { generalNotificationService } from './generalNotificationService';

/**
 * Evening Weather Refresh Service
 * 
 * Ensures weather data is automatically refreshed at 6 PM for accurate overnight prediction analysis.
 * This addresses the issue where pressure change and temperature differential show 0.0 values
 * because weather data wasn't updated during the critical 6 PM transition period.
 */
class EveningWeatherRefreshService {
  private static instance: EveningWeatherRefreshService;
  private scheduledRefreshId: string | null = null;
  private isInitialized: boolean = false;
  private readonly STORAGE_KEY = 'evening_refresh_notification_id';

  private constructor() {}

  public static getInstance(): EveningWeatherRefreshService {
    if (!EveningWeatherRefreshService.instance) {
      EveningWeatherRefreshService.instance = new EveningWeatherRefreshService();
    }
    return EveningWeatherRefreshService.instance;
  }

  /**
   * Initialize the service and set up notification handlers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      AlarmLogger.info('🔄 Evening Weather Refresh Service already initialized - skipping');
      return;
    }

    try {
      AlarmLogger.info('🌅 Starting Evening Weather Refresh Service initialization...');

      // Initialize the general notification service first
      AlarmLogger.info('🔔 Initializing general notification service...');
      await generalNotificationService.initialize();
      AlarmLogger.info('✅ General notification service initialized');

      // Restore any previously scheduled notification ID from storage
      AlarmLogger.info('💾 Restoring scheduled notification ID from storage...');
      await this.restoreScheduledNotificationId();

      // Verify if the restored notification is still valid and scheduled
      AlarmLogger.info('🔍 Verifying and rescheduling if needed...');
      await this.verifyAndRescheduleIfNeeded();

      // Set up notification response listener for weather refresh notifications
      AlarmLogger.info('👂 Setting up notification response listeners...');
      this.setupNotificationResponseListener();

      this.isInitialized = true;
      AlarmLogger.success('✅ Evening Weather Refresh Service fully initialized and ready!');
      
      // Log current status for debugging
      const status = this.getRefreshStatus();
      AlarmLogger.info(`📊 Current refresh status: {isScheduled: ${status.isScheduled}, nextRefresh: ${status.nextRefreshTime?.toLocaleString() || 'N/A'}}`);
    } catch (error) {
      AlarmLogger.error('❌ Critical error initializing Evening Weather Refresh Service:', error);
      // Mark as failed initialization
      this.isInitialized = false;
    }
  }

  /**
   * Schedule the evening weather refresh for 6 PM today or tomorrow
   */
  async scheduleEveningRefresh(): Promise<boolean> {
    try {
      AlarmLogger.info('🗓️ Starting evening refresh scheduling...');

      // Clear any existing scheduled refresh
      if (this.scheduledRefreshId) {
        AlarmLogger.info(`🗑️ Clearing existing scheduled refresh: ${this.scheduledRefreshId}`);
        await this.cancelEveningRefresh();
      }

      // Calculate next 6 PM
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(18, 0, 0, 0); // 6:00 PM

      // If it's already past 6 PM today, schedule for tomorrow
      if (now.getTime() >= targetTime.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
        AlarmLogger.info('⏭️ Past 6 PM today, scheduling for tomorrow');
      } else {
        AlarmLogger.info('⏰ Before 6 PM today, scheduling for today');
      }

      AlarmLogger.info(`🎯 Target time: ${targetTime.toLocaleString()}`);
      AlarmLogger.info(`⏳ Hours until refresh: ${((targetTime.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(2)}`);

      // Use the general notification service to schedule the refresh
      AlarmLogger.info('📱 Requesting notification scheduling from general service...');
      const identifier = await generalNotificationService.scheduleNotification(
        targetTime,
        'Weather Data Update',
        'Updating weather data for overnight wind analysis...',
        'weather-refresh-channel',
        {
          type: 'evening_weather_refresh',
          scheduledTime: targetTime.toISOString(),
          action: 'refresh_weather_data'
        }
      );

      if (identifier) {
        this.scheduledRefreshId = identifier;
        AlarmLogger.info(`📝 Received notification identifier: ${identifier}`);
        
        // Store the identifier in AsyncStorage for persistence across app restarts
        AlarmLogger.info('💾 Storing notification ID in AsyncStorage...');
        await this.storeScheduledNotificationId(identifier);
        
        AlarmLogger.success(`✅ Evening weather refresh successfully scheduled with ID: ${identifier}`);
        return true;
      } else {
        AlarmLogger.error('❌ General notification service returned null identifier - scheduling failed');
        return false;
      }
    } catch (error) {
      AlarmLogger.error('❌ Critical error during evening refresh scheduling:', error);
      return false;
    }
  }

  /**
   * Store the scheduled notification ID in AsyncStorage
   */
  private async storeScheduledNotificationId(id: string): Promise<void> {
    try {
      AlarmLogger.info(`💾 Storing notification ID "${id}" with key "${this.STORAGE_KEY}"`);
      await AsyncStorage.setItem(this.STORAGE_KEY, id);
      AlarmLogger.success(`✅ Successfully stored evening refresh notification ID: ${id}`);
    } catch (error) {
      AlarmLogger.error('❌ Failed to store notification ID in AsyncStorage:', error);
    }
  }

  /**
   * Restore the scheduled notification ID from AsyncStorage
   */
  private async restoreScheduledNotificationId(): Promise<void> {
    try {
      AlarmLogger.info(`💾 Attempting to restore notification ID from key "${this.STORAGE_KEY}"`);
      const storedId = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedId) {
        this.scheduledRefreshId = storedId;
        AlarmLogger.success(`✅ Restored evening refresh notification ID: ${storedId}`);
      } else {
        AlarmLogger.info('ℹ️ No stored evening refresh notification ID found (fresh install or first run)');
      }
    } catch (error) {
      AlarmLogger.error('❌ Failed to restore notification ID from AsyncStorage:', error);
    }
  }

  /**
   * Verify that the stored notification is still scheduled and reschedule if needed
   */
  private async verifyAndRescheduleIfNeeded(): Promise<void> {
    try {
      if (!this.scheduledRefreshId) {
        AlarmLogger.info('No stored notification ID - scheduling new evening refresh');
        await this.scheduleEveningRefresh();
        return;
      }

      // Get all scheduled notifications to check if our ID still exists
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const ourNotification = scheduledNotifications.find(n => n.identifier === this.scheduledRefreshId);

      if (!ourNotification) {
        AlarmLogger.info(`Stored notification ${this.scheduledRefreshId} no longer exists - rescheduling`);
        this.scheduledRefreshId = null;
        await AsyncStorage.removeItem(this.STORAGE_KEY);
        await this.scheduleEveningRefresh();
      } else {
        // Check if the notification is for today's 6 PM or later
        const notificationData = ourNotification.content.data;
        const scheduledTime = notificationData?.scheduledTime && typeof notificationData.scheduledTime === 'string' 
          ? new Date(notificationData.scheduledTime) 
          : null;
        const now = new Date();
        
        if (!scheduledTime || scheduledTime.getTime() <= now.getTime()) {
          AlarmLogger.info(`Stored notification is for past time - rescheduling`);
          await this.cancelEveningRefresh();
          await this.scheduleEveningRefresh();
        } else {
          AlarmLogger.success(`Existing evening refresh notification verified: ${scheduledTime.toLocaleString()}`);
        }
      }
    } catch (error) {
      AlarmLogger.error('Error verifying scheduled notification:', error);
      // If verification fails, just reschedule to be safe
      await this.scheduleEveningRefresh();
    }
  }

  /**
   * Cancel the scheduled evening refresh
   */
  async cancelEveningRefresh(): Promise<void> {
    if (this.scheduledRefreshId) {
      try {
        await generalNotificationService.cancelNotification(this.scheduledRefreshId);
        AlarmLogger.info(`Cancelled evening weather refresh: ${this.scheduledRefreshId}`);
        this.scheduledRefreshId = null;
        // Remove from storage
        await AsyncStorage.removeItem(this.STORAGE_KEY);
      } catch (error) {
        AlarmLogger.error('Error cancelling evening weather refresh:', error);
      }
    }
  }

  /**
   * Manually trigger the evening weather refresh
   */
  async triggerEveningRefresh(): Promise<boolean> {
    try {
      AlarmLogger.info('Manually triggering evening weather refresh...');
      
      // Clear cache and fetch fresh weather data
      await hybridWeatherService.clearCache();
      const refreshedData = await hybridWeatherService.fetchHybridWeatherData();
      
      if (refreshedData) {
        AlarmLogger.success('Evening weather refresh completed successfully');
        AlarmLogger.info('Refreshed weather data:', {
          morrisonDataPoints: refreshedData.morrison.hourlyForecast.length,
          mountainDataPoints: refreshedData.mountain.hourlyForecast.length,
          lastUpdated: new Date().toISOString()
        });
        
        // Schedule the next day's 6 PM refresh
        await this.scheduleEveningRefresh();
        
        return true;
      } else {
        AlarmLogger.error('Evening weather refresh failed: No data returned');
        return false;
      }
    } catch (error) {
      AlarmLogger.error('Error during evening weather refresh:', error);
      return false;
    }
  }

  /**
   * Set up notification response listener to handle weather refresh notifications
   */
  private setupNotificationResponseListener(): void {
    // Listen for notification responses (when user taps notification or when it's received)
    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      const data = notification.request.content.data;
      
      if (data?.type === 'evening_weather_refresh') {
        AlarmLogger.info('Evening weather refresh notification received');
        
        // Trigger the refresh in the background
        setTimeout(async () => {
          await this.triggerEveningRefresh();
        }, 100);
      }
    });

    // Also listen for when user interacts with the notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const data = response.notification.request.content.data;
      
      if (data?.type === 'evening_weather_refresh') {
        AlarmLogger.info('User interacted with evening weather refresh notification');
        await this.triggerEveningRefresh();
      }
    });

    AlarmLogger.info('Evening weather refresh notification listeners set up');
  }

  /**
   * Get the status of the evening refresh system
   */
  getRefreshStatus(): {
    isScheduled: boolean;
    nextRefreshTime: Date | null;
    isInitialized: boolean;
  } {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(18, 0, 0, 0);

    // If it's already past 6 PM today, next refresh is tomorrow
    if (now.getTime() >= targetTime.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    return {
      isScheduled: this.scheduledRefreshId !== null,
      nextRefreshTime: this.scheduledRefreshId ? targetTime : null,
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
export const eveningWeatherRefreshService = EveningWeatherRefreshService.getInstance();
