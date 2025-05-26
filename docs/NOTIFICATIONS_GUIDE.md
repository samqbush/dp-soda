# Wind Trend Analyzer Notification System

## Overview

The notification system in the Wind Trend Analyzer app provides users with timely alerts about wind conditions at Bear Creek Lake. This document explains how the notification system works, its configuration options, and how to extend it for push notifications in the future.

## Current Implementation

The notification system currently provides in-app alerts about:

1. **Alarm Notifications**: When wind conditions in the 3am-5am window are favorable for wake-up
2. **Verification Notifications**: When actual conditions in the 6am-8am window match predictions
3. **Data Update Notifications**: When new wind data is fetched (optional)
4. **Error Notifications**: When critical errors occur that require user attention

### Components

- **`notificationService.ts`**: Core service that manages notification settings and logic
- **`NotificationSettings.tsx`**: UI component for configuring notification preferences
- **`useWindData.ts`**: Integration with wind data processing to trigger notifications

### Features

- **User Configurable**: Users can enable/disable different notification types
- **Quiet Hours**: Notifications can be suppressed during specified hours
- **Throttling**: Prevents duplicate notifications in quick succession
- **Persistence**: Settings are saved and restored between app sessions

## User Configuration

Users can configure notifications through the "Settings" screen, where they can:

1. Enable or disable notifications entirely
2. Choose which notification types to receive
3. Set quiet hours when notifications will be suppressed
4. Reset all notification settings to defaults

## Technical Implementation

### Settings Storage

Notification settings are stored in AsyncStorage with these keys:
- `wind_notification_settings` - User preferences
- `wind_last_notified_{type}` - Timestamp of last notification by type

### Notification Flow

1. **Trigger Event**: Wind data is analyzed or an error occurs
2. **Check Settings**: System checks if notifications are enabled for this event type
3. **Check Quiet Hours**: System checks if we're in quiet hours
4. **Check Throttling**: System ensures we haven't sent a similar notification too recently
5. **Display Notification**: Alert is shown to the user
6. **Record Notification**: System records that notification was displayed

### Helper Functions

- `getNotificationSettings()` - Retrieves current settings
- `saveNotificationSettings()` - Saves user preferences
- `isInQuietHours()` - Checks if current time is within quiet hours
- `shouldShowNotification()` - Determines if a notification should be displayed
- `canSendNotification()` - Checks throttling rules
- `recordNotification()` - Records when notifications are sent
- `formatNotificationMessage()` - Formats notification content

## Future Push Notification Integration

The system is designed for easy extension to support push notifications:

### Steps to Implement Push Notifications

1. Add Expo Notifications package:
   ```bash
   expo install expo-notifications
   ```

2. Request notification permissions in `notificationService.ts`:
   ```typescript
   import * as Notifications from 'expo-notifications';

   async function registerForPushNotifications() {
     const { status } = await Notifications.requestPermissionsAsync();
     return status === 'granted';
   }
   ```

3. Update the `prepareNotifications()` function to register for push:
   ```typescript
   export async function prepareNotifications(): Promise<boolean> {
     try {
       const settings = await getNotificationSettings();
       if (settings.enabled) {
         await registerForPushNotifications();
       }
       return settings.enabled;
     } catch (error) {
       console.error('Error preparing notifications:', error);
       return false;
     }
   }
   ```

4. Add a function to send push notifications:
   ```typescript
   export async function sendPushNotification(
     title: string,
     body: string,
     data?: Record<string, any>
   ) {
     await Notifications.scheduleNotificationAsync({
       content: {
         title,
         body,
         data
       },
       trigger: null // Send immediately
     });
   }
   ```

5. Update the `handleWindNotifications` function in `useWindData.ts` to use push notifications when appropriate.

### Remote Notifications

For remote notifications (server-triggered), you would need to:

1. Set up a server that can send notifications
2. Implement Expo push tokens storage
3. Register the device with your server
4. Handle incoming notifications in the app

## Best Practices

1. **Respect User Preferences**: Always check settings before sending notifications
2. **Be Conservative**: Don't send too many notifications
3. **Provide Value**: Only notify for meaningful events
4. **Be Clear**: Use descriptive titles and helpful content
5. **Allow Control**: Make it easy to disable or customize notifications

## Troubleshooting

- **Notifications not showing**: Check if notifications are enabled in app settings
- **Too many notifications**: Adjust throttling parameters
- **Notifications at wrong times**: Verify quiet hours settings
- **Notification settings not saving**: Check AsyncStorage permissions

## References

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [User Notification Best Practices](https://material.io/design/communication/notifications.html)
