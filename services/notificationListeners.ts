import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { AlarmLogger } from './alarmDebugLogger';
import { isNotificationRecentlyScheduled } from './alarmNotificationService';

/**
 * Notification Event Listeners
 * 
 * Handles notification events when the app is in background or foreground.
 * This is the critical missing piece for background alarm functionality.
 */
class NotificationListeners {
  private notificationReceivedListener: Notifications.Subscription | null = null;
  private notificationResponseListener: Notifications.Subscription | null = null;
  private isInitialized: boolean = false;
  private alarmTriggerCallback: (() => Promise<any>) | null = null;
  private callbackCallCount: number = 0; // Track how many times callback is called
  private isInitializing: boolean = false; // Track if we're still initializing
  private instanceId: string = Math.random().toString(36).substr(2, 9); // Unique instance ID
  private initializationTime: number = 0; // Track when initialization started
  
  // Static tracking to prevent multiple instances from processing the same notification
  private static lastProcessedNotificationId: string | null = null;
  private static lastProcessedTime: number = 0;
  private static globalInitTime: number = Date.now(); // Global init time for all instances

  constructor() {
    AlarmLogger.info(`🆔 NotificationListeners instance created: ${this.instanceId}`);
  }

  /**
   * Initialize notification event listeners
   * CRITICAL: This must be called at app startup
   */
  async initialize(alarmTriggerCallback?: () => Promise<any>): Promise<void> {
    try {
      if (this.isInitialized) {
        AlarmLogger.info('Notification listeners already initialized');
        return;
      }

      this.isInitializing = true; // Mark as initializing
      this.initializationTime = Date.now(); // Record initialization start time
      AlarmLogger.info(`Setting up notification event listeners for instance ${this.instanceId}...`);

      // REMOVED: Do not cancel notifications during initialization as this can trigger unwanted callbacks
      // The canceling process can trigger notification events that then execute the alarm callback
      // This was causing automatic alarm tests during app navigation to settings tab
      // Instead, notifications will be managed by the unified alarm manager as needed
      AlarmLogger.info('📝 Skipping notification clearing during initialization to prevent unwanted callback triggers');

      // Store the callback for triggering alarms
      if (alarmTriggerCallback) {
        this.alarmTriggerCallback = alarmTriggerCallback;
        this.callbackCallCount = 0; // Reset counter
        AlarmLogger.info('📞 Alarm trigger callback registered');
      } else {
        AlarmLogger.warning('⚠️ No alarm trigger callback provided');
      }

      // Listen for notifications received while app is in foreground
      this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived.bind(this)
      );

      // Listen for user interactions with notifications (taps, actions)
      this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      this.isInitialized = true;
      this.isInitializing = false; // Done initializing
      AlarmLogger.success('Notification listeners initialized successfully');
      
      // Add a small delay and then check if callback was called during initialization
      setTimeout(() => {
        if (this.callbackCallCount > 0) {
          AlarmLogger.warning(`🚨 CALLBACK WAS CALLED ${this.callbackCallCount} TIMES DURING INITIALIZATION - THIS SHOULD NOT HAPPEN!`);
        } else {
          AlarmLogger.info('✅ Callback was not called during initialization - this is correct behavior');
        }
        
        // Reset initialization protection after 5 seconds
        AlarmLogger.info('🔓 Initialization time protection period ended - normal callback execution now allowed');
      }, 5000); // Extended to 5 seconds to match time protection
      
    } catch (error) {
      this.isInitializing = false;
      AlarmLogger.error('Failed to initialize notification listeners:', error);
    }
  }

  /**
   * Handle notification received (when app is in foreground)
   * CRITICAL: This automatically triggers the alarm check when the scheduled notification fires
   */
  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    try {
      const { categoryIdentifier, title, body, data } = notification.request.content;
      const notificationId = notification.request.identifier;
      
      AlarmLogger.info('🔔 NOTIFICATION RECEIVED (app in foreground):', {
        categoryIdentifier,
        title,
        body,
        identifier: notificationId,
        data,
        timestamp: new Date().toISOString()
      });

      // Check if this is a wind alarm notification that should trigger alarm logic
      if (categoryIdentifier === 'wind-alarm' || categoryIdentifier === 'wind-alarm-test') {
        
        // RECENTLY SCHEDULED CHECK: Block notifications that were just scheduled (likely bugs)
        if (isNotificationRecentlyScheduled(notificationId)) {
          AlarmLogger.warning('🚫 BLOCKED: Notification was recently scheduled and is likely firing due to a bug, ignoring!', {
            notificationId,
            instanceId: this.instanceId
          });
          return;
        }
        
        // METADATA VALIDATION: Check if this is a real scheduled notification
        if (data && data.scheduledForFuture && data.scheduledTime) {
          const scheduledTime = new Date(data.scheduledTime as string);
          const now = new Date();
          const timeDifference = Math.abs(now.getTime() - scheduledTime.getTime());
          
          // If the notification is firing way before its scheduled time, it's likely a bug
          if (timeDifference > 60000) { // More than 1 minute difference
            AlarmLogger.warning('🚫 BLOCKED: Notification firing at wrong time - likely a scheduling bug, ignoring!', {
              scheduledTime: scheduledTime.toISOString(),
              actualTime: now.toISOString(),
              timeDifference: `${timeDifference}ms`,
              notificationId,
              instanceId: this.instanceId
            });
            return;
          }
        }
        
        // GLOBAL DEDUPLICATION: Prevent multiple instances from processing the same notification
        if (NotificationListeners.lastProcessedNotificationId === notificationId) {
          AlarmLogger.warning('🚫 BLOCKED: Notification already processed by another instance, skipping!', {
            notificationId,
            instanceId: this.instanceId
          });
          return;
        }
        
        // GLOBAL TIMING SAFEGUARD: Use global init time to prevent notifications that fire too soon
        const timeSinceGlobalInit = Date.now() - NotificationListeners.globalInitTime;
        if (timeSinceGlobalInit < 15000) { // 15 seconds global protection
          AlarmLogger.warning('🚫 BLOCKED: Notification received too soon after app initialization - likely a scheduling bug, ignoring!', {
            timeSinceGlobalInit: `${timeSinceGlobalInit}ms`,
            categoryIdentifier,
            identifier: notificationId,
            instanceId: this.instanceId
          });
          return;
        }
        
        // INSTANCE TIMING SAFEGUARD: Additional per-instance protection
        const timeSinceInstanceInit = Date.now() - this.initializationTime;
        if (timeSinceInstanceInit < 10000) { // 10 seconds per instance
          AlarmLogger.warning('🚫 BLOCKED: Notification received too soon after instance initialization - likely a scheduling bug, ignoring!', {
            timeSinceInstanceInit: `${timeSinceInstanceInit}ms`,
            categoryIdentifier,
            identifier: notificationId,
            instanceId: this.instanceId
          });
          return;
        }
        
        // Mark this notification as processed
        NotificationListeners.lastProcessedNotificationId = notificationId;
        NotificationListeners.lastProcessedTime = Date.now();
        
        AlarmLogger.info('⏰ VALID ALARM NOTIFICATION: Auto-triggering wind condition check');
        
        // CRITICAL: This should trigger immediately when the scheduled notification fires
        // This is the main alarm mechanism for when the app is open
        await this.triggerAlarmFromNotification(title || 'Dawn Patrol Alarm', body || 'Wind conditions check');
      } else {
        AlarmLogger.info(`🚫 IGNORING NOTIFICATION: Category '${categoryIdentifier}' is not a wind alarm (expected 'wind-alarm' or 'wind-alarm-test')`);
      }
    } catch (error) {
      AlarmLogger.error('Error handling received notification:', error);
    }
  }

  /**
   * Handle notification response (when user taps notification)
   * This is called when the app is opened from a notification tap
   * CRITICAL: This handles the alarm check when app was closed/backgrounded
   */
  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const { categoryIdentifier, title, body, data } = response.notification.request.content;
      const { actionIdentifier } = response;
      
      AlarmLogger.info('🔔 NOTIFICATION TAPPED (app opened from notification):', {
        categoryIdentifier,
        title,
        body,
        actionIdentifier,
        data
      });

      // Check if this is a wind alarm notification
      if (categoryIdentifier === 'wind-alarm' || categoryIdentifier === 'wind-alarm-test') {
        
        // GLOBAL TIMING SAFEGUARD: Use global init time to prevent notifications that fire too soon
        const timeSinceGlobalInit = Date.now() - NotificationListeners.globalInitTime;
        if (timeSinceGlobalInit < 15000) { // 15 seconds global protection
          AlarmLogger.warning('🚫 BLOCKED: Notification tapped too soon after app initialization - likely a scheduling bug, ignoring!', {
            timeSinceGlobalInit: `${timeSinceGlobalInit}ms`,
            categoryIdentifier,
            actionIdentifier,
            instanceId: this.instanceId
          });
          return;
        }
        
        // INSTANCE TIMING SAFEGUARD: Additional per-instance protection
        const timeSinceInstanceInit = Date.now() - this.initializationTime;
        if (timeSinceInstanceInit < 10000) { // 10 seconds per instance
          AlarmLogger.warning('🚫 BLOCKED: Notification tapped too soon after instance initialization - likely a scheduling bug, ignoring!', {
            timeSinceInstanceInit: `${timeSinceInstanceInit}ms`,
            categoryIdentifier,
            actionIdentifier,
            instanceId: this.instanceId
          });
          return;
        }
        
        // Handle deep link navigation if present
        if (data && data.deepLink && typeof data.deepLink === 'string') {
          AlarmLogger.info('🔗 Deep link detected in notification:', data.deepLink);
          try {
            router.push(data.deepLink as any); // Cast to satisfy Expo Router types
            AlarmLogger.success('✅ Successfully navigated to deep link:', data.deepLink);
          } catch (deepLinkError) {
            AlarmLogger.error('❌ Failed to navigate to deep link:', deepLinkError);
          }
        }
        
        if (actionIdentifier === 'CHECK_CONDITIONS') {
          AlarmLogger.info('⏰ User tapped "Check Conditions" - triggering alarm check');
          await this.triggerAlarmFromNotification(title || 'Dawn Patrol Alarm', body || 'Wind conditions check');
        } else if (actionIdentifier === 'SNOOZE') {
          AlarmLogger.info('😴 User tapped "Snooze" - scheduling snooze');
          // TODO: Implement snooze functionality
        } else {
          // Default action (user tapped notification)
          AlarmLogger.info('⏰ ALARM TIME: User opened app from notification - triggering alarm check');
          await this.triggerAlarmFromNotification(title || 'Dawn Patrol Alarm', body || 'Wind conditions check');
        }
      }
    } catch (error) {
      AlarmLogger.error('Error handling notification response:', error);
    }
  }

  /**
   * Trigger the actual alarm logic when a notification is received/tapped
   * This is the core function that checks wind conditions and plays the alarm
   * SHOULD ONLY BE CALLED FROM NOTIFICATION EVENTS, NOT DIRECTLY
   */
  private async triggerAlarmFromNotification(title: string, body: string): Promise<void> {
    try {
      // STRONG PROTECTION: Don't execute during initialization or if not properly initialized
      if (this.isInitializing || !this.isInitialized) {
        AlarmLogger.warning('🚫 BLOCKED: triggerAlarmFromNotification called during initialization or before proper setup - ignoring!', {
          isInitializing: this.isInitializing,
          isInitialized: this.isInitialized,
          instanceId: this.instanceId
        });
        return;
      }

      // ADDITIONAL PROTECTION: Don't execute within first 5 seconds of initialization
      const timeSinceInit = Date.now() - this.initializationTime;
      if (timeSinceInit < 5000) {
        AlarmLogger.warning('🚫 BLOCKED: triggerAlarmFromNotification called too soon after initialization - ignoring!', {
          timeSinceInit: `${timeSinceInit}ms`,
          instanceId: this.instanceId
        });
        return;
      }

      // DEBUG: Log the call stack to see what's calling this method
      const stack = new Error().stack;
      AlarmLogger.info(`🔍 triggerAlarmFromNotification called on instance ${this.instanceId}!`, {
        title, 
        body,
        source: 'notification_event',
        timestamp: new Date().toISOString(),
        callStack: stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack trace
      });
      
      AlarmLogger.info('🌊 ALARM NOTIFICATION TRIGGERED: Checking wind conditions...', { 
        title, 
        body,
        source: 'notification_event',
        timestamp: new Date().toISOString()
      });

      // Use the callback to trigger alarm check if available
      if (this.alarmTriggerCallback) {
        // PROTECTION: Don't call callback during initialization
        if (this.isInitializing) {
          AlarmLogger.warning('🚫 BLOCKED: Attempted to call alarm callback during initialization - ignoring!');
          return;
        }
        
        this.callbackCallCount++; // Track callback calls
        AlarmLogger.info(`📞 Calling alarm trigger callback (call #${this.callbackCallCount})...`);
        const result = await this.alarmTriggerCallback();
        
        if (result && result.triggered) {
          AlarmLogger.success('🚨 ALARM RINGING: Favorable wind conditions detected - WAKE UP!');
          
          // Send a status notification to show the alarm is ringing
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 WAKE UP! 🌊',
              body: `Great wind conditions! Your alarm is ringing. Current: ${result.analysis?.currentSpeed?.toFixed(1) || 'N/A'} mph`,
              sound: 'default',
              priority: 'high',
              categoryIdentifier: 'alarm-active',
            },
            trigger: null, // Immediate notification
          });
        } else {
          AlarmLogger.info('😴 SLEEP IN: Wind conditions not favorable today');
          
          // Send sleep-in notification with details
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '😴 Sleep In Today',
              body: `Wind conditions checked - not favorable for dawn patrol. Current: ${result.analysis?.currentSpeed?.toFixed(1) || 'N/A'} mph`,
              sound: 'default',
              priority: 'low',
              categoryIdentifier: 'sleep-in',
            },
            trigger: null, // Immediate notification
          });
        }
      } else {
        AlarmLogger.error('❌ ALARM SYSTEM ERROR: No alarm trigger callback available');
        
        // Show error notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ Alarm System Error',
            body: 'Unable to check wind conditions automatically. Please open the app to check manually.',
            sound: 'default',
            priority: 'high',
            categoryIdentifier: 'alarm-error',
          },
          trigger: null, // Immediate notification
        });
      }
    } catch (error) {
      AlarmLogger.error('❌ ERROR during alarm trigger:', error);
      
      // Show error notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⚠️ Alarm Check Failed',
          body: 'Unable to check wind conditions due to error. Please open the app to check manually.',
          sound: 'default',
          priority: 'high',
          categoryIdentifier: 'alarm-error',
        },
        trigger: null, // Immediate notification
      });
    }
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    if (this.notificationReceivedListener) {
      this.notificationReceivedListener.remove();
      this.notificationReceivedListener = null;
    }

    if (this.notificationResponseListener) {
      this.notificationResponseListener.remove();
      this.notificationResponseListener = null;
    }

    this.isInitialized = false;
    AlarmLogger.info('Notification listeners cleaned up');
  }
}

// Export singleton instance
export const notificationListeners = new NotificationListeners();
