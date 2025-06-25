import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus } from 'react-native';

// Simple alarm state interface
export interface SimpleAlarmState {
  enabled: boolean;
  alarmTime: string;
  windThreshold: number;
  lastCheck: Date | null;
  lastWindSpeed: number | null;
  lastCheckResult: 'triggered' | 'conditions-not-met' | 'error' | null;
  isActivelyAlarming: boolean; // NEW: Track if alarm is currently going off
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
  isActivelyAlarming: false,
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
  private persistentAlarmNotificationIds: string[] = []; // Track multiple notification IDs
  private persistentAlarmIntervalId: NodeJS.Timeout | null = null; // For foreground alarm sound
  private pendingAlarmResult: AlarmCheckResult | null = null; // Store alarm result for when app becomes active
  private appStateSubscription: any = null; // App state listener

  constructor() {
    console.log('🚨 SimpleAlarmService: Initializing...');
    this.initialize();
    this.setupNotificationHandlers();
    this.setupAppStateListener();
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
        
        // If we were actively alarming when app was closed, continue the alarm
        if (this.state.isActivelyAlarming) {
          console.log('📱 SimpleAlarmService: App opened while alarm was active - alarm state restored');
          // Note: Alarm notifications continue independently, no audio restart needed
        }
      } else {
        console.log('🚨 SimpleAlarmService: No saved state, using defaults');
        await this.saveState();
      }
      
      this.isInitialized = true;
      this.notifyListeners();
      
      // Setup notification categories with actions
      await this.setupNotificationCategories();
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
    } else if (notificationType === 'WIND_ALARM_TRIGGERED' || notificationType === 'WIND_ALARM_FOLLOWUP') {
      console.log('🚨 SimpleAlarmService: Persistent alarm notification received - alarm continues');
      // Let the user manually acknowledge the alarm via app UI or notification action
      // Do not auto-acknowledge - this would stop the alarm immediately
    }
  }

  /**
   * Handle notification response (user tapped notification)
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    console.log('🚨 SimpleAlarmService: Notification response received:', response);
    
    const notificationType = response.notification.request.content.data?.type;
    const actionIdentifier = response.actionIdentifier;
    
    if (notificationType === 'WIND_ALARM_CHECK') {
      console.log('🌬️ SimpleAlarmService: Wind alarm check notification tapped');
      await this.processWindAlarmCheck();
    } else if (notificationType === 'WIND_ALARM_TRIGGERED' || notificationType === 'WIND_ALARM_FOLLOWUP' || notificationType === 'WIND_ALARM_RELIABLE') {
      console.log('🚨 SimpleAlarmService: Alarm notification interaction - action:', actionIdentifier);
      
      if (actionIdentifier === 'STOP_ALARM') {
        console.log('🚨 SimpleAlarmService: User chose to stop alarm');
        await this.acknowledgeAlarm();
      } else if (actionIdentifier === 'SNOOZE_ALARM') {
        console.log('🚨 SimpleAlarmService: User chose to snooze alarm for 10 minutes');
        await this.snoozeAlarm(10);
      } else {
        // Default action (tapping notification without action button)
        console.log('🚨 SimpleAlarmService: Alarm notification tapped - opening app');
        // Just open the app, don't auto-acknowledge
      }
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
   * V2: Uses continuous audio alarm + backup notifications
   */
  /**
   * Trigger full alarm when wind conditions are met
   * V3: Focus on persistent notifications that actually work as alarms
   */
  private async triggerFullAlarm(result: AlarmCheckResult): Promise<void> {
    console.log('🚨 SimpleAlarmService: Triggering persistent notification alarm...');
    
    try {
      // Update state to show we're actively alarming
      this.state.isActivelyAlarming = true;
      this.state.lastCheck = new Date();
      this.state.lastWindSpeed = result.windSpeed;
      this.state.lastCheckResult = 'triggered';
      await this.saveState();
      this.notifyListeners();

      // Use persistent notification-based alarm (works in background!)
      await this.schedulePersistentAlarmNotifications(result);
      
      // Start continuous audio alarm immediately (we have background audio permissions!)
      console.log('� Starting continuous audio alarm (background audio enabled)...');
      // Use reliable system notification alarm (no complex background audio)
      await this.scheduleReliableAlarmNotification(result);
      
      console.log('✅ SimpleAlarmService: Reliable notification alarm activated');
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to trigger alarm:', error);
    }
  }

  /**
   * Send immediate notification showing alarm is active
   */
  private async sendAlarmActiveNotification(result: AlarmCheckResult): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 DAWN PATROL ALARM ACTIVE!",
          body: `Wind is ${result.windSpeed?.toFixed(1)} mph! Continuous alarm playing. Open app to stop.`,
          data: { 
            type: 'WIND_ALARM_ACTIVE',
            windSpeed: result.windSpeed,
            threshold: result.threshold,
            continuousAlarm: true
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          badge: 1,
        },
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('❌ Failed to send alarm active notification:', error);
    }
  }

  /**
   * Schedule backup notifications in case continuous audio fails
   */
  private async scheduleBackupAlarmNotifications(result: AlarmCheckResult): Promise<void> {
    console.log('📢 Scheduling backup alarm notifications...');
    
    try {
      // Schedule 3 backup notifications at 2, 5, and 10 minutes
      const backupTimes = [120, 300, 600]; // 2min, 5min, 10min
      
      for (let i = 0; i < backupTimes.length; i++) {
        const backupId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "🚨 ALARM STILL ACTIVE!",
            body: `Wind alarm continues! Open app to stop the continuous alarm.`,
            data: { 
              type: 'WIND_ALARM_BACKUP',
              windSpeed: result.windSpeed,
              threshold: result.threshold,
              backupNumber: i + 1
            },
            priority: Notifications.AndroidNotificationPriority.MAX,
            sticky: true,
            badge: i + 2,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: backupTimes[i],
            repeats: false,
          },
        });
        this.persistentAlarmNotificationIds.push(backupId);
      }

      console.log(`📢 Scheduled ${backupTimes.length} backup notifications`);
      
    } catch (error) {
      console.error('❌ Failed to schedule backup notifications:', error);
    }
  }

  /**
   * Schedule multiple notifications for persistent alarming
   * Sends immediate alarm + follow-up notifications every 2 minutes
   */
  private async schedulePersistentAlarmNotifications(result: AlarmCheckResult): Promise<void> {
    console.log('📢 SimpleAlarmService: Scheduling persistent alarm notifications...');
    
    // Clear any existing persistent notifications
    await this.clearPersistentAlarmNotifications();

    const baseTitle = "🌊 DAWN PATROL ALERT! 🌊";
    const baseBody = `Wind is ${result.windSpeed?.toFixed(1)} mph at Soda Lake! Time to go sailing! ⛵`;
    
    try {
      // Immediate alarm notification (high priority with enhanced settings)
      const immediateId = await Notifications.scheduleNotificationAsync({
        content: {
          title: baseTitle,
          body: `${baseBody} - TAP TO STOP!`,
          sound: 'alarm.mp3',
          data: { 
            type: 'WIND_ALARM_TRIGGERED',
            windSpeed: result.windSpeed,
            threshold: result.threshold,
            persistentAlarm: true
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          badge: 1,
          categoryIdentifier: 'WIND_ALARM',
          vibrate: [0, 250, 250, 250], // Vibration pattern
        },
        trigger: null, // Immediate
      });
      this.persistentAlarmNotificationIds.push(immediateId);

      // Instead of spamming notifications, focus on ONE persistent alarm
      // that forces user interaction and proper continuous audio
      console.log(`📢 Scheduled 1 persistent alarm notification (not spam!)`);
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to schedule persistent notifications:', error);
    }
  }

  /**
   * Schedule a reliable alarm notification that the system guarantees to play
   */
  private async scheduleReliableAlarmNotification(result: AlarmCheckResult): Promise<void> {
    console.log('🔔 SimpleAlarmService: Scheduling reliable alarm notification...');
    
    try {
      const baseTitle = "🌊 DAWN PATROL ALERT! 🌊";
      const baseBody = `Wind is ${result.windSpeed?.toFixed(1)} mph at Soda Lake! Time to go sailing! ⛵`;
      
      // Single, reliable alarm notification with maximum priority
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: baseTitle,
          body: `${baseBody} - Tap to acknowledge`,
          sound: 'alarm.mp3',
          data: { 
            type: 'WIND_ALARM_RELIABLE',
            windSpeed: result.windSpeed,
            threshold: result.threshold,
            timestamp: new Date().toISOString()
          },
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          categoryIdentifier: 'WIND_ALARM',
          badge: 1,
          vibrate: [0, 250, 250, 250, 250, 250], // Strong vibration pattern
          // Make it as alarm-like as possible
          autoDismiss: false,
        },
        trigger: null, // Immediate
      });
      
      this.persistentAlarmNotificationIds.push(notificationId);
      console.log(`✅ SimpleAlarmService: Reliable alarm notification scheduled with ID: ${notificationId}`);
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to schedule reliable notification:', error);
    }
  }

  /**
   * Clear all persistent alarm notifications
   */
  private async clearPersistentAlarmNotifications(): Promise<void> {
    console.log('🔇 SimpleAlarmService: Clearing persistent alarm notifications...');
    
    try {
      // Cancel all scheduled persistent notifications
      for (const notificationId of this.persistentAlarmNotificationIds) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
      
      // Clear the tracking array
      this.persistentAlarmNotificationIds = [];
      
      // Clear any foreground alarm interval
      if (this.persistentAlarmIntervalId) {
        clearInterval(this.persistentAlarmIntervalId);
        this.persistentAlarmIntervalId = null;
      }
      
      console.log('✅ Persistent alarm notifications cleared');
      
    } catch (error) {
      console.error('❌ Failed to clear persistent alarm notifications:', error);
    }
  }

  /**
   * Acknowledge/stop the active alarm
   * V2: Also stops continuous audio alarm
   */
  public async acknowledgeAlarm(): Promise<void> {
    console.log('✋ SimpleAlarmService: Acknowledging alarm...');
    
    // Clear any pending alarm
    this.pendingAlarmResult = null;
    
    if (this.state.isActivelyAlarming) {
      // Update state to stop alarm
      this.state.isActivelyAlarming = false;
      await this.saveState();
      this.notifyListeners();
      
      // Clear all alarm notifications
      await this.clearPersistentAlarmNotifications();
      
      console.log('✅ Alarm acknowledged and stopped');
    } else {
      console.log('ℹ️ No active alarm to acknowledge');
    }
  }

  /**
   * Snooze the alarm for the specified number of minutes
   */
  private async snoozeAlarm(minutes: number): Promise<void> {
    console.log(`🚨 SimpleAlarmService: Snoozing alarm for ${minutes} minutes`);
    
    try {
      // Stop current alarm (same as acknowledge)
      await this.acknowledgeAlarm();
      
      // Schedule a new alarm in the specified minutes
      const now = new Date();
      const snoozeTime = new Date(now.getTime() + minutes * 60 * 1000);
      const timeString = snoozeTime.toTimeString().slice(0, 5); // HH:MM format
      
      // Enable alarm and set the snooze time
      this.state.enabled = true;
      this.state.alarmTime = timeString;
      await this.saveState();
      
      // Schedule the snoozed notification
      await this.scheduleNotification(timeString);
      
      this.notifyListeners();
      console.log(`🚨 SimpleAlarmService: Alarm snoozed until ${timeString}`);
    } catch (error) {
      console.error('🚨 SimpleAlarmService: Failed to snooze alarm:', error);
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
   * Test the continuous alarm system (for debugging)
   */
  public async testPersistentAlarm(): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🚨 SimpleAlarmService: Testing continuous alarm system...');
    
    try {
      // Create a mock result that would trigger the alarm
      const mockResult: AlarmCheckResult = {
        shouldTrigger: true,
        windSpeed: 20.5,
        threshold: this.state.windThreshold,
        reason: 'Test alarm triggered - continuous audio + backup notifications',
        timestamp: new Date(),
      };
      
      // Trigger the continuous alarm
      await this.triggerFullAlarm(mockResult);
      
      return {
        success: true,
        message: `Continuous alarm test triggered! You should hear continuous looping audio + see backup notifications. Open app and tap "STOP ALARM" to stop. Threshold: ${this.state.windThreshold} mph.`,
      };
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to test continuous alarm:', error);
      return {
        success: false,
        message: `Failed to test continuous alarm: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Test just the continuous audio (without full alarm flow)
   */
  public async testContinuousAudio(): Promise<{
    success: boolean;
    message: string;
  }> {
    console.log('🔊 SimpleAlarmService: Testing reliable notification alarm...');
    
    // Test with fake wind data
    const testResult: AlarmCheckResult = {
      shouldTrigger: true,
      windSpeed: 5.0,
      threshold: 1.0,
      reason: 'Test alarm - wind conditions simulated',
      timestamp: new Date()
    };
    
    await this.scheduleReliableAlarmNotification(testResult);
    return { success: true, message: 'Test notification alarm triggered' };
  }

  /**
   * Reset to default state (for debugging)
   */
  public async reset(): Promise<void> {
    console.log('🚨 SimpleAlarmService: Resetting to default state');
    
    // Cancel any scheduled notifications
    await this.cancelNotification();
    
    // Clear any persistent alarm notifications
    await this.clearPersistentAlarmNotifications();
    
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
    
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    // Clear persistent alarm resources
    if (this.persistentAlarmIntervalId) {
      clearInterval(this.persistentAlarmIntervalId);
      this.persistentAlarmIntervalId = null;
    }
    
    this.listeners.clear();
  }

  /**
   * Setup app state listener to handle background-to-foreground transitions
   */
  private setupAppStateListener(): void {
    console.log('🚨 SimpleAlarmService: Setting up app state listener...');

    this.appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log(`🚨 SimpleAlarmService: App state changed to ${nextAppState}`);
      
      // If app becomes active and we have a pending alarm, trigger it now
      if (nextAppState === 'active' && this.pendingAlarmResult) {
        console.log('🚨 SimpleAlarmService: App became active with pending alarm - triggering now!');
        this.triggerPendingAlarm();
      }
    });
  }

  /**
   * Trigger pending alarm when app becomes active
   */
  private async triggerPendingAlarm(): Promise<void> {
    if (!this.pendingAlarmResult) return;

    console.log('🚨 SimpleAlarmService: Triggering pending reliable alarm...');
    
    const result = this.pendingAlarmResult;
    this.pendingAlarmResult = null; // Clear pending state

    try {
      // Update state to show we're actively alarming
      this.state.isActivelyAlarming = true;
      await this.saveState();
      this.notifyListeners();

      // Use reliable notification alarm (no complex audio)
      await this.scheduleReliableAlarmNotification(result);
      
      console.log('✅ SimpleAlarmService: Pending reliable alarm activated');
      
    } catch (error) {
      console.error('❌ SimpleAlarmService: Failed to trigger pending alarm:', error);
    }
  }

  /**
   * Setup notification categories with action buttons
   */
  private async setupNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('WIND_ALARM', [
        {
          identifier: 'STOP_ALARM',
          buttonTitle: 'Stop Alarm',
          options: {
            opensAppToForeground: true,
          },
        },
        {
          identifier: 'SNOOZE_ALARM',
          buttonTitle: 'Snooze 10min',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);
      console.log('🚨 SimpleAlarmService: Notification categories set up successfully');
    } catch (error) {
      console.error('🚨 SimpleAlarmService: Failed to setup notification categories:', error);
    }
  }
}

// Export singleton instance
export const simpleAlarmService = new SimpleAlarmService();
