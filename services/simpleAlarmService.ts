import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Simple alarm state interface
export interface SimpleAlarmState {
  enabled: boolean;
  alarmTime: string;
  windThreshold: number;
  lastCheck: Date | null;
  lastWindSpeed: number | null;
  lastCheckResult: 'triggered' | 'conditions-not-met' | 'error' | null;
}

// Result of wind condition check
export interface AlarmCheckResult {
  shouldTrigger: boolean;
  windSpeed: number | null;
  threshold: number;
  reason: string;
  timestamp: Date;
}

// Storage keys
const STORAGE_KEYS = {
  ALARM_STATE: 'simple_alarm_state',
} as const;

// Default state
const DEFAULT_STATE: SimpleAlarmState = {
  enabled: false,
  alarmTime: '05:00',
  windThreshold: 15,
  lastCheck: null,
  lastWindSpeed: null,
  lastCheckResult: null,
};

/**
 * Simple Alarm Service
 * 
 * Single source of truth for alarm functionality.
 * Replaces the complex unifiedAlarmManager with a simple, reliable service.
 */
class SimpleAlarmService {
  private state: SimpleAlarmState = { ...DEFAULT_STATE };
  private listeners: Set<(state: SimpleAlarmState) => void> = new Set();
  private isInitialized = false;
  private scheduledNotificationId: string | null = null;
  private notificationReceivedListener: Notifications.Subscription | null = null;
  private notificationResponseListener: Notifications.Subscription | null = null;

  constructor() {
    console.log('🚨 SimpleAlarmService: Initializing...');
    this.initialize();
    this.setupNotificationHandlers();
  }

  /**
   * Initialize the service by loading saved state
   */
  private async initialize(): Promise<void> {
    try {
      const savedState = await AsyncStorage.getItem(STORAGE_KEYS.ALARM_STATE);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Convert date strings back to Date objects
        if (parsed.lastCheck) {
          parsed.lastCheck = new Date(parsed.lastCheck);
        }
        this.state = { ...DEFAULT_STATE, ...parsed };
        console.log('🚨 SimpleAlarmService: Loaded saved state:', this.state);
      } else {
        console.log('🚨 SimpleAlarmService: No saved state, using defaults');
        await this.saveState();
      }
      
      this.isInitialized = true;
      this.notifyListeners();
    } catch (error) {
      console.error('🚨 SimpleAlarmService: Failed to initialize:', error);
      this.isInitialized = true;
      this.notifyListeners();
    }
  }

  /**
   * Setup notification handlers for background processing
   */
  private setupNotificationHandlers(): void {
    console.log('🚨 SimpleAlarmService: Setting up notification handlers...');

    // Handle notifications received while app is running
    this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived.bind(this)
    );

    // Handle notification responses (when user taps notification)
    this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );
  }

  /**
   * Handle notification received while app is running
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    console.log('🚨 SimpleAlarmService: Notification received:', notification);
    
    const notificationType = notification.request.content.data?.type;
    if (notificationType === 'WIND_ALARM_CHECK') {
      console.log('🌬️ SimpleAlarmService: Wind alarm check notification received');
      await this.processWindAlarmCheck();
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('🚨 SimpleAlarmService: Notification response received:', response);
    
    const notificationType = response.notification.request.content.data?.type;
    if (notificationType === 'WIND_ALARM_CHECK') {
      console.log('🌬️ SimpleAlarmService: Wind alarm check notification tapped');
      await this.processWindAlarmCheck();
    }
  }

  /**
   * Process wind alarm check (called from notification handlers)
   */
  private async processWindAlarmCheck(): Promise<void> {
    console.log('🌬️ SimpleAlarmService: Processing wind alarm check...');
    
    try {
      // Check wind conditions
      const result = await this.checkWindConditions();
      
      if (result.shouldTrigger) {
        console.log('🚨 SimpleAlarmService: Wind conditions met - triggering alarm!');
        await this.triggerFullAlarm(result);
      } else {
        console.log('😴 SimpleAlarmService: Wind conditions not met');
        await this.sendConditionsNotMetNotification(result);
      }
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Error processing wind alarm check:', error);
    }
  }

  /**
   * Trigger full alarm when wind conditions are met
   */
  private async triggerFullAlarm(result: AlarmCheckResult): Promise<void> {
    console.log('🚨 SimpleAlarmService: Triggering full alarm...');
    
    try {
      // Send alarm notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🌊 DAWN PATROL ALERT! 🌊",
          body: `Wind is ${result.windSpeed?.toFixed(1)} mph at Soda Lake! Time to go sailing! ⛵`,
          sound: 'alarm.mp3',
          data: { 
            type: 'WIND_ALARM_TRIGGERED',
            windSpeed: result.windSpeed,
            threshold: result.threshold
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
        },
        trigger: null, // Immediate
      });

      // TODO: Add vibration, sound, and other alarm features
      console.log('✅ SimpleAlarmService: Full alarm triggered successfully');
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to trigger full alarm:', error);
    }
  }

  /**
   * Send notification when conditions are not met
   */
  private async sendConditionsNotMetNotification(result: AlarmCheckResult): Promise<void> {
    console.log('😴 SimpleAlarmService: Sending conditions not met notification...');
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dawn Patrol Check Complete 😴",
          body: `Wind is ${result.windSpeed?.toFixed(1)} mph. Need ${result.threshold} mph. Maybe next time!`,
          data: { 
            type: 'WIND_ALARM_NOT_MET',
            windSpeed: result.windSpeed,
            threshold: result.threshold
          },
          priority: Notifications.AndroidNotificationPriority.LOW,
        },
        trigger: null, // Immediate
      });
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to send conditions not met notification:', error);
    }
  }

  /**
   * Save current state to persistent storage
   */
  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ALARM_STATE, JSON.stringify(this.state));
      console.log('🚨 SimpleAlarmService: State saved successfully');
    } catch (error) {
      console.error('🚨 SimpleAlarmService: Failed to save state:', error);
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener({ ...this.state });
      } catch (error) {
        console.error('🚨 SimpleAlarmService: Error notifying listener:', error);
      }
    });
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: (state: SimpleAlarmState) => void): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current state if initialized
    if (this.isInitialized) {
      listener({ ...this.state });
    }
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current alarm state
   */
  public getState(): SimpleAlarmState {
    return { ...this.state };
  }

  /**
   * Check if service is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Set alarm time and enable alarm
   */
  public async setAlarm(time: string): Promise<void> {
    console.log(`🚨 SimpleAlarmService: Setting alarm for ${time}`);
    
    try {
      // Update state
      this.state = {
        ...this.state,
        enabled: true,
        alarmTime: time,
      };

      // Schedule notification (placeholder for Phase 2)
      await this.scheduleNotification(time);
      
      // Save and notify
      await this.saveState();
      this.notifyListeners();
      
      console.log(`✅ SimpleAlarmService: Alarm set successfully for ${time}`);
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to set alarm:', error);
      throw error;
    }
  }

  /**
   * Disable the alarm
   */
  public async disable(): Promise<void> {
    console.log('🚨 SimpleAlarmService: Disabling alarm');
    
    try {
      // Update state
      this.state = {
        ...this.state,
        enabled: false,
      };

      // Cancel notification
      await this.cancelNotification();
      
      // Save and notify
      await this.saveState();
      this.notifyListeners();
      
      console.log('✅ SimpleAlarmService: Alarm disabled successfully');
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to disable alarm:', error);
      throw error;
    }
  }

  /**
   * Set wind threshold
   */
  public async setWindThreshold(mph: number): Promise<void> {
    console.log(`🚨 SimpleAlarmService: Setting wind threshold to ${mph} mph`);
    
    try {
      // Validate threshold
      if (mph < 1 || mph > 50) {
        throw new Error('Wind threshold must be between 1 and 50 mph');
      }

      // Update state
      this.state = {
        ...this.state,
        windThreshold: mph,
      };
      
      // Save and notify
      await this.saveState();
      this.notifyListeners();
      
      console.log(`✅ SimpleAlarmService: Wind threshold set to ${mph} mph`);
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to set wind threshold:', error);
      throw error;
    }
  }

  /**
   * Check current wind conditions (integrated with useSodaLakeWind)
   */
  public async checkWindConditions(): Promise<AlarmCheckResult> {
    console.log('🚨 SimpleAlarmService: Checking wind conditions...');
    
    try {
      // Import wind checking function from existing service
      const { fetchEcowittRealTimeWindData } = await import('./ecowittService');
      
      // Use the DP Soda Lakes device for Dawn Patrol alarm
      const deviceName = 'DP Soda Lakes';
      
      // Fetch current real-time wind data
      const currentResult = await fetchEcowittRealTimeWindData(deviceName);
      const currentConditions = currentResult.conditions;
      
      if (!currentConditions) {
        const errorResult: AlarmCheckResult = {
          shouldTrigger: false,
          windSpeed: null,
          threshold: this.state.windThreshold,
          reason: 'No current wind data available from DP Soda Lakes station',
          timestamp: new Date(),
        };

        // Update state with error
        this.state = {
          ...this.state,
          lastCheck: errorResult.timestamp,
          lastCheckResult: 'error',
        };

        await this.saveState();
        this.notifyListeners();
        return errorResult;
      }

      const currentSpeed = currentConditions.windSpeedMph;
      
      if (currentSpeed === null || currentSpeed === undefined) {
        const errorResult: AlarmCheckResult = {
          shouldTrigger: false,
          windSpeed: null,
          threshold: this.state.windThreshold,
          reason: 'Wind speed data not available from station',
          timestamp: new Date(),
        };

        this.state = {
          ...this.state,
          lastCheck: errorResult.timestamp,
          lastCheckResult: 'error',
        };

        await this.saveState();
        this.notifyListeners();
        return errorResult;
      }

      // Simple threshold check using current conditions
      const shouldTrigger = currentSpeed >= this.state.windThreshold;
      
      const result: AlarmCheckResult = {
        shouldTrigger,
        windSpeed: currentSpeed,
        threshold: this.state.windThreshold,
        reason: shouldTrigger 
          ? `Current wind speed (${currentSpeed.toFixed(1)} mph) meets your threshold (${this.state.windThreshold} mph) - Time to go! ⛵`
          : `Current wind speed (${currentSpeed.toFixed(1)} mph) below your threshold (${this.state.windThreshold} mph) - Not quite yet 😴`,
        timestamp: new Date(),
      };

      // Update state with check result
      this.state = {
        ...this.state,
        lastCheck: result.timestamp,
        lastWindSpeed: result.windSpeed,
        lastCheckResult: result.shouldTrigger ? 'triggered' : 'conditions-not-met',
      };

      await this.saveState();
      this.notifyListeners();

      console.log(`✅ SimpleAlarmService: Wind check complete - ${result.reason}`);
      return result;
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to check wind conditions:', error);
      
      const errorResult: AlarmCheckResult = {
        shouldTrigger: false,
        windSpeed: null,
        threshold: this.state.windThreshold,
        reason: `Error checking conditions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };

      // Update state with error
      this.state = {
        ...this.state,
        lastCheck: errorResult.timestamp,
        lastCheckResult: 'error',
      };

      await this.saveState();
      this.notifyListeners();

      return errorResult;
    }
  }

  /**
   * Schedule notification for alarm time
   */
  private async scheduleNotification(time: string): Promise<void> {
    console.log(`🚨 SimpleAlarmService: Scheduling notification for ${time}`);
    
    try {
      // Request notification permissions first
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      // Cancel any existing notifications
      await this.cancelNotification();

      // Parse the time string (format: "HH:MM")
      const [hours, minutes] = time.split(':').map(Number);
      
      // Schedule daily repeating notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Dawn Patrol Wind Check ⛵",
          body: "Checking wind conditions at Soda Lake...",
          sound: 'alarm.mp3',
          data: { 
            type: 'WIND_ALARM_CHECK',
            threshold: this.state.windThreshold,
            alarmTime: time
          },
          priority: Notifications.AndroidNotificationPriority.HIGH,
          sticky: false,
          autoDismiss: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      this.scheduledNotificationId = notificationId;
      console.log(`✅ SimpleAlarmService: Notification scheduled with ID: ${notificationId}`);
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to schedule notification:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notification
   */
  private async cancelNotification(): Promise<void> {
    console.log('🚨 SimpleAlarmService: Canceling notification');
    
    try {
      if (this.scheduledNotificationId) {
        await Notifications.cancelScheduledNotificationAsync(this.scheduledNotificationId);
        console.log(`✅ SimpleAlarmService: Canceled notification ${this.scheduledNotificationId}`);
        this.scheduledNotificationId = null;
      }
      
      // Also cancel all alarm-related notifications to be safe
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const alarmNotifications = scheduledNotifications.filter(
        notification => notification.content.data?.type === 'WIND_ALARM_CHECK'
      );
      
      for (const notification of alarmNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`✅ SimpleAlarmService: Canceled stale notification ${notification.identifier}`);
      }
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to cancel notification:', error);
    }
  }

  /**
   * Test the alarm system
   */
  public async testAlarm(): Promise<AlarmCheckResult> {
    console.log('🚨 SimpleAlarmService: Testing alarm...');
    return await this.checkWindConditions();
  }

  /**
   * Test notification permissions and system
   */
  public async testNotifications(): Promise<{
    hasPermission: boolean;
    canSchedule: boolean;
    error?: string;
  }> {
    console.log('🚨 SimpleAlarmService: Testing notification system...');
    
    try {
      // Check current permissions
      const { status } = await Notifications.getPermissionsAsync();
      console.log(`📱 Current notification permission status: ${status}`);
      
      if (status !== 'granted') {
        // Request permissions
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        console.log(`📱 Requested notification permissions: ${newStatus}`);
        
        if (newStatus !== 'granted') {
          return {
            hasPermission: false,
            canSchedule: false,
            error: 'Notification permissions not granted'
          };
        }
      }

      // Test scheduling a notification
      try {
        const testNotificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "🧪 Dawn Patrol Test",
            body: "Notification system working correctly!",
            data: { type: 'TEST_NOTIFICATION' }
          },
          trigger: { 
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 2 
          }
        });

        console.log(`✅ Test notification scheduled: ${testNotificationId}`);
        
        // Cancel the test notification after a delay
        setTimeout(async () => {
          try {
            await Notifications.cancelScheduledNotificationAsync(testNotificationId);
            console.log('✅ Test notification canceled');
          } catch (error) {
            console.log('⚠️ Could not cancel test notification:', error);
          }
        }, 5000);

        return {
          hasPermission: true,
          canSchedule: true
        };
        
      } catch (scheduleError) {
        return {
          hasPermission: true,
          canSchedule: false,
          error: `Cannot schedule notifications: ${scheduleError instanceof Error ? scheduleError.message : 'Unknown error'}`
        };
      }
      
    } catch (error) {
      return {
        hasPermission: false,
        canSchedule: false,
        error: `Notification test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Reset to default state (for debugging)
   */
  public async reset(): Promise<void> {
    console.log('🚨 SimpleAlarmService: Resetting to default state');
    
    // Cancel any scheduled notifications
    await this.cancelNotification();
    
    this.state = { ...DEFAULT_STATE };
    await this.saveState();
    this.notifyListeners();
  }

  /**
   * Cleanup method to dispose of notification listeners
   */
  public dispose(): void {
    console.log('🚨 SimpleAlarmService: Disposing...');
    
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
    }
    
    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
    }
    
    this.listeners.clear();
  }
}

// Export singleton instance
export const simpleAlarmService = new SimpleAlarmService();
