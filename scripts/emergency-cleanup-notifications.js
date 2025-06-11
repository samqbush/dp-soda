/**
 * Emergency script to cancel all scheduled notifications
 * 
 * This script helps clean up notification spam by cancelling all scheduled notifications.
 * Run this in the app console or add a button to trigger it.
 */

import { alarmNotificationService } from '../services/alarmNotificationService';
import { enhancedAlarmService } from '../services/enhancedAlarmService';

export const emergencyCleanupNotifications = async () => {
  console.log('🚨 EMERGENCY CLEANUP: Cancelling all notifications...');
  
  try {
    // Cancel all notifications via the alarm notification service
    await alarmNotificationService.cancelAllNotifications();
    
    // Cancel all alarms via the enhanced alarm service
    await enhancedAlarmService.cancelAllAlarms();
    
    console.log('✅ Emergency cleanup completed - all notifications cancelled');
    
    return {
      success: true,
      message: 'All notifications and alarms have been cancelled'
    };
    
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    
    return {
      success: false,
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// If running as a standalone script
if (typeof window !== 'undefined') {
  // Add to global scope for console access
  window.emergencyCleanupNotifications = emergencyCleanupNotifications;
  console.log('🧹 Emergency cleanup function added to window.emergencyCleanupNotifications()');
}
