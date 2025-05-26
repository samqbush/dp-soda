import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const NOTIFICATION_SETTINGS_KEY = 'wind_notification_settings';
const LAST_NOTIFIED_KEY = 'wind_last_notified';

// Define notification types
export type NotificationType = 'alarm' | 'verification' | 'dataUpdate' | 'error';

export interface NotificationSettings {
  enabled: boolean;
  alarmNotifications: boolean;
  verificationNotifications: boolean;
  dataUpdateNotifications: boolean;
  errorNotifications: boolean;
  quietHoursStart: string; // 24hr format "HH:MM"
  quietHoursEnd: string; // 24hr format "HH:MM"
  quietHoursEnabled: boolean;
}

// Default notification settings
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  alarmNotifications: true,
  verificationNotifications: true,
  dataUpdateNotifications: false,
  errorNotifications: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  quietHoursEnabled: true,
};

/**
 * Get the current notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const settingsJson = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (settingsJson) {
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(settingsJson) };
    }
    return DEFAULT_NOTIFICATION_SETTINGS;
  } catch (error) {
    console.error('Error getting notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
  try {
    const current = await getNotificationSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error saving notification settings:', error);
    return false;
  }
}

/**
 * Check if we're in quiet hours
 */
export function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHoursEnabled) return false;
  
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;
  
  const [startHours, startMinutes] = settings.quietHoursStart.split(':').map(Number);
  const [endHours, endMinutes] = settings.quietHoursEnd.split(':').map(Number);
  
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  } else {
    return currentTime >= startTime && currentTime < endTime;
  }
}

/**
 * Check if notification should be shown
 */
export async function shouldShowNotification(type: NotificationType): Promise<boolean> {
  try {
    const settings = await getNotificationSettings();
    
    // Check if notifications are enabled
    if (!settings.enabled) return false;
    
    // Check quiet hours
    if (isInQuietHours(settings)) return false;
    
    // Check notification type
    switch (type) {
      case 'alarm':
        return settings.alarmNotifications;
      case 'verification':
        return settings.verificationNotifications;
      case 'dataUpdate':
        return settings.dataUpdateNotifications;
      case 'error':
        return settings.errorNotifications;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return false;
  }
}

/**
 * Record last notification time
 */
export async function recordNotification(type: NotificationType): Promise<void> {
  try {
    const now = new Date().toISOString();
    await AsyncStorage.setItem(`${LAST_NOTIFIED_KEY}_${type}`, now);
  } catch (error) {
    console.error('Error recording notification:', error);
  }
}

/**
 * Get time of last notification by type
 */
export async function getLastNotificationTime(type: NotificationType): Promise<Date | null> {
  try {
    const timestamp = await AsyncStorage.getItem(`${LAST_NOTIFIED_KEY}_${type}`);
    return timestamp ? new Date(timestamp) : null;
  } catch (error) {
    console.error('Error getting last notification time:', error);
    return null;
  }
}

/**
 * Check if we can send a notification (throttle)
 * Prevents sending too many notifications of the same type
 */
export async function canSendNotification(type: NotificationType, minInterval: number = 60 * 60 * 1000): Promise<boolean> {
  try {
    const lastTime = await getLastNotificationTime(type);
    if (!lastTime) return true;
    
    const now = new Date();
    return (now.getTime() - lastTime.getTime()) >= minInterval;
  } catch (error) {
    console.error('Error checking notification throttle:', error);
    return false;
  }
}

/**
 * Prepare for future push notification support
 * Can be extended with actual push notification registration later
 */
export async function prepareNotifications(): Promise<boolean> {
  try {
    // This is a placeholder for future push notification setup
    // Currently just ensures settings are initialized
    const settings = await getNotificationSettings();
    
    // Return true if we're ready for notifications
    return settings.enabled;
  } catch (error) {
    console.error('Error preparing notifications:', error);
    return false;
  }
}

/**
 * Helper to format a notification message
 */
export function formatNotificationMessage(
  title: string,
  body: string,
  data?: Record<string, any>
): { title: string; body: string; data?: Record<string, any> } {
  return {
    title, 
    body,
    data
  };
}
