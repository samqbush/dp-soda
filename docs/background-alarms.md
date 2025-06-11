# Background Alarm Implementation Guide

This document describes the new background alarm functionality implemented for the Dawn Patrol Alarm app.

## Overview

The app now supports background notifications on mobile devices, allowing users to receive wind condition alerts even when the app is closed or running in the background.

## Architecture

### Components

1. **alarmNotificationService.ts** - Core notification service using Expo Notifications
2. **enhancedAlarmService.ts** - High-level alarm orchestration service  
3. **backgroundAlarmTester.ts** - Development testing utilities
4. **WindDataDisplay.tsx** - Updated UI with background alarm integration
5. **settings.tsx** - Added background alarm testing interface (dev mode only)

### Key Features

- **Cross-platform Support**: Works on iOS and Android via Expo Notifications
- **Permission Handling**: Automatic notification permission requests
- **Fallback System**: Gracefully falls back to foreground-only alarms on unsupported platforms
- **Smart Scheduling**: Combines immediate app-based checks with background notification backups
- **User-friendly Setup**: Automatic background alarm setup with informative alerts

## User Experience

### First Time Setup

1. User enables alarm in settings
2. App automatically requests notification permissions
3. Success alert confirms background alarm capability
4. Fallback message shown if permissions denied

### Daily Operation

1. App schedules both foreground timer and background notification
2. Foreground check runs when app is active (immediate response)
3. Background notification triggers as backup when app is closed
4. User receives notification with wind condition alert

### Settings Integration

- Updated settings page shows background alarm support status
- Developer testing interface available in dev builds
- Clear messaging about background vs foreground alarm modes

## Implementation Details

### Notification Service (`alarmNotificationService.ts`)

```typescript
// Core capabilities
- Platform detection (mobile vs web)
- Permission request and management
- Notification scheduling with time-based triggers
- Notification cancellation and cleanup
```

### Enhanced Alarm Service (`enhancedAlarmService.ts`)

```typescript
// High-level orchestration
- Combines foreground timers with background notifications
- Handles app state tracking (foreground/background)
- Provides unified alarm scheduling interface
- Manages alarm status and configuration
```

### Testing Utilities

The app includes comprehensive testing tools accessible in development mode:

- **Background Alarm Tester**: Schedule test notifications to verify background functionality
- **Test Scenarios**: Predefined test cases for different alarm conditions
- **Permission Testing**: Verify notification permissions are properly granted
- **Cancellation Testing**: Ensure test notifications can be properly cleaned up

## Testing Instructions

### Manual Testing

1. Go to Settings tab
2. Find "Background Alarm Testing" section  
3. Tap "🧪 Test Background Alarm"
4. Close the app immediately after scheduling
5. Wait 1 minute for test notification
6. Verify notification appears in device notification center

### Automated Testing

Use the testing service programmatically:

```typescript
import { testBackgroundAlarms } from '@/services/backgroundAlarmTester';

const result = await testBackgroundAlarms();
console.log(result.success ? 'Test passed' : 'Test failed');
```

## Configuration

### App Configuration (`app.config.js`)

Background alarms require the Expo Notifications plugin:

```javascript
plugins: [
  [
    "expo-notifications",
    {
      icon: "./assets/images/notification-icon.png",
      color: "#ffffff",
      sounds: ["./assets/sounds/notification.wav"]
    }
  ]
  // ... other plugins
]
```

### Permissions

The app automatically requests these permissions:
- iOS: User notification permissions via UNUserNotificationCenter
- Android: POST_NOTIFICATIONS permission (API level 33+)

## Error Handling

The implementation includes comprehensive error handling:

- **Permission Denied**: Falls back to foreground-only alarms
- **Platform Unsupported**: Graceful degradation to timer-based alarms
- **Notification Scheduling Errors**: Logs errors and continues with fallback
- **Service Initialization Failures**: App continues to function with reduced features

## Debugging

### Development Tools

1. **Console Logging**: Detailed logs for alarm scheduling and execution
2. **Alert Messages**: User-friendly setup status notifications  
3. **Test Interface**: Manual testing tools in settings
4. **Status Reporting**: Real-time alarm status in UI

### Common Issues

1. **Permissions Not Granted**: User sees foreground-only message
2. **Platform Not Supported**: Web users see foreground-only behavior
3. **Notification Not Received**: Check device notification settings

## Future Enhancements

Potential improvements for future versions:

- **Rich Notifications**: Include wind speed and direction in notification content
- **Custom Notification Sounds**: Allow users to select alarm sounds
- **Multiple Alarms**: Support for different alarm times
- **Notification Actions**: Add "Snooze" or "View Conditions" actions
- **Smart Frequency**: Adjust notification frequency based on success rate

## Support Notes

- Background alarms work on iOS 10+ and Android API 21+
- Requires Expo SDK 49+ with Expo Notifications
- Web platform shows foreground-only behavior (expected)
- Device notification settings may override app permissions
