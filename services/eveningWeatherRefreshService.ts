import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
    if (this.isInitialized) return;

    try {
      AlarmLogger.info('Initializing Evening Weather Refresh Service...');

      // Initialize the general notification service first
      await generalNotificationService.initialize();

      // Set up notification response listener for weather refresh notifications
      this.setupNotificationResponseListener();

      // Schedule today's 6 PM refresh if it hasn't happened yet
      await this.scheduleEveningRefresh();

      this.isInitialized = true;
      AlarmLogger.success('Evening Weather Refresh Service initialized');
    } catch (error) {
      AlarmLogger.error('Error initializing Evening Weather Refresh Service:', error);
    }
  }

  /**
   * Schedule the evening weather refresh for 6 PM today or tomorrow
   */
  async scheduleEveningRefresh(): Promise<boolean> {
    try {
      // Check if notifications are supported
      if (!generalNotificationService.isNotificationSupported()) {
        AlarmLogger.warning('Evening refresh not supported on web - data will refresh on app open');
        return false;
      }

      // Clear any existing scheduled refresh
      if (this.scheduledRefreshId) {
        await this.cancelEveningRefresh();
      }

      // Calculate next 6 PM
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(18, 0, 0, 0); // 6:00 PM

      // If it's already past 6 PM today, schedule for tomorrow
      if (now.getTime() >= targetTime.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      AlarmLogger.info(`Scheduling evening weather refresh for ${targetTime.toLocaleString()}`);
      AlarmLogger.info(`Time until refresh: ${((targetTime.getTime() - now.getTime()) / (1000 * 60 * 60)).toFixed(2)} hours`);

      // Use the general notification service to schedule the refresh
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
        AlarmLogger.success(`Evening weather refresh scheduled with ID: ${identifier}`);
        return true;
      } else {
        AlarmLogger.error('Failed to schedule evening weather refresh');
        return false;
      }
    } catch (error) {
      AlarmLogger.error('Error scheduling evening weather refresh:', error);
      return false;
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
