import { enhancedAlarmService } from '@/services/enhancedAlarmService';
import { alarmNotificationService } from '@/services/alarmNotificationService';

/**
 * Test script for background alarm functionality
 * Run this in the app to verify notifications work
 */
export const testBackgroundAlarms = async () => {
  console.log('🧪 Testing background alarm functionality...');
  
  try {
    // Test 1: Check if notifications are supported
    console.log('📱 Platform support check...');
    const isSupported = alarmNotificationService.isNotificationSupported();
    console.log(`✅ Notifications supported: ${isSupported}`);
    
    if (!isSupported) {
      console.log('⚠️ Background alarms not supported on this platform');
      return {
        success: false,
        message: 'Background alarms not supported on this platform'
      };
    }
    
    // Test 2: Request permissions
    console.log('🔐 Requesting permissions...');
    const hasPermissions = await alarmNotificationService.requestPermissions();
    console.log(`✅ Permissions granted: ${hasPermissions}`);
    
    if (!hasPermissions) {
      return {
        success: false,
        message: 'Notification permissions not granted'
      };
    }
    
    // Test 3: Schedule a test notification
    console.log('📅 Scheduling test notification...');
    
    const notificationId = await alarmNotificationService.scheduleImmediateTestNotification(
      1, // 1 minute from now
      '🧪 Test Alarm',
      'This is a test notification to verify background alarms work!'
    );
    
    if (notificationId) {
      console.log(`✅ Test notification scheduled with ID: ${notificationId}`);
      return {
        success: true,
        message: `Test notification scheduled for 1 minute from now. You should receive it shortly.`,
        notificationId
      };
    } else {
      return {
        success: false,
        message: 'Failed to schedule test notification'
      };
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Test the enhanced alarm service
 */
export const testEnhancedAlarmService = async () => {
  console.log('🧪 Testing enhanced alarm service...');
  
  try {
    // Initialize the service
    await enhancedAlarmService.initialize();
    
    // Get current status
    const status = enhancedAlarmService.getAlarmStatus();
    console.log('📊 Alarm status:', status);
    
    // Test scheduling an immediate alarm
    const result = await enhancedAlarmService.scheduleAlarm({
      alarmTime: '05:00',
      useBackgroundNotifications: true,
      immediateCheck: false
    });
    
    console.log('📅 Schedule result:', result);
    
    return {
      success: result.success,
      message: result.message,
      usingBackground: result.usingBackgroundNotifications,
      status
    };
    
  } catch (error) {
    console.error('❌ Enhanced alarm service test failed:', error);
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Cancel all test notifications
 */
export const cancelTestNotifications = async () => {
  console.log('🧹 Cancelling all test notifications...');
  
  try {
    await alarmNotificationService.cancelAllAlarmNotifications();
    await enhancedAlarmService.cancelAllAlarms();
    
    console.log('✅ All test notifications cancelled');
    return { success: true, message: 'All test notifications cancelled' };
    
  } catch (error) {
    console.error('❌ Failed to cancel notifications:', error);
    return {
      success: false,
      message: `Failed to cancel: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};
