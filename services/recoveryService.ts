/**
 * Recovery Service
 * 
 * This service provides critical recovery functions for when the app encounters problems.
 * Especially focuses on fixing white screen issues on Android.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';
import { performMemoryCleanup } from './memoryManager';

/**
 * List of keys that should be preserved during recovery
 */
const PRESERVE_SETTINGS = ['alarmCriteria'];

/**
 * Perform a complete recovery when the app is having problems
 * Clears all non-essential data and resets app to a working state
 */
export const performFullRecovery = async (): Promise<boolean> => {
  console.log('🚑 Performing full app recovery...');
  
  try {
    // 1. Try to hide the splash screen if it's still showing
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn('Could not hide splash screen during recovery:', e);
    }
    
    // 2. Back up important settings
    const backups: Record<string, string> = {};
    
    try {
      for (const key of PRESERVE_SETTINGS) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          backups[key] = value;
        }
      }
    } catch (e) {
      console.warn('Could not backup settings during recovery:', e);
    }
    
    // 3. Clear all AsyncStorage data
    await AsyncStorage.clear();
    console.log('✅ Storage cleared during recovery');
    
    // 4. Restore important settings
    try {
      for (const [key, value] of Object.entries(backups)) {
        await AsyncStorage.setItem(key, value);
      }
      console.log('✅ Critical settings restored');
    } catch (e) {
      console.warn('Could not restore settings during recovery:', e);
    }
    
    // 5. Clean up any memory issues
    await performMemoryCleanup(true);
    
    console.log('✅ Recovery completed successfully');
    return true;
  } catch (error) {
    console.error('❌ Recovery failed:', error);
    
    // Last resort emergency clear - don't even try to preserve anything
    try {
      await AsyncStorage.clear();
      console.log('✅ Emergency clear successful');
      return true;
    } catch (e) {
      console.error('❌ Complete recovery failure:', e);
      return false;
    }
  }
};

/**
 * Try to recover from a white screen by clearing minimal data
 * Less aggressive than full recovery
 */
export const recoverFromWhiteScreen = async (): Promise<boolean> => {
  // Only needed on Android
  if (Platform.OS !== 'android') return true;
  
  console.log('🩹 Attempting white screen recovery...');
  
  try {
    // These keys are most likely to cause white screen issues
    const problematicKeys = ['windData', 'lastError', 'hasInitialized', 'appState'];
    
    try {
      await AsyncStorage.multiRemove(problematicKeys);
      console.log('✅ Removed potentially problematic data');
    } catch (e) {
      console.warn('Could not remove problematic keys:', e);
    }
    
    // Also try a memory cleanup
    await performMemoryCleanup(false);
    
    return true;
  } catch (error) {
    console.error('❌ White screen recovery failed:', error);
    
    // Escalate to full recovery if simple recovery failed
    return performFullRecovery();
  }
};

export default {
  performFullRecovery,
  recoverFromWhiteScreen
};
