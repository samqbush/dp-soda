/**
 * Memory Manager Service
 * 
 * This service helps prevent memory issues and app crashes by:
 * 1. Proactively cleaning up resources
 * 2. Detecting potential memory leaks
 * 3. Providing emergency cleanup when memory pressure is detected
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Maximum size of wind data cache (in characters)
const MAX_CACHE_SIZE = 500000; // 500KB

// Keys that should be preserved during cleanup
const PRESERVED_KEYS = ['alarmCriteria'];

/**
 * Attempts to clean up memory when the app is detected to be under pressure
 * or preventatively based on usage patterns
 */
export const performMemoryCleanup = async (aggressive: boolean = false): Promise<boolean> => {
  console.log(`🧹 Performing ${aggressive ? 'aggressive' : 'standard'} memory cleanup...`);
  
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    
    // Find large data entries to clean
    const keysToClean = keys.filter(key => {
      // Always preserve important settings
      if (PRESERVED_KEYS.includes(key)) {
        return false;
      }
      
      // Clean out error logs, old wind data, and temporary data
      return key.includes('Error') || 
             key.includes('wind') || 
             key.includes('temp') ||
             key.includes('cache');
    });
    
    if (aggressive) {
      // In aggressive mode, clean everything except preserved keys
      const keysToRemove = keys.filter(key => !PRESERVED_KEYS.includes(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
        console.log(`✅ Aggressively removed ${keysToRemove.length} keys`);
      }
    } else {
      // In standard mode, only clean selected keys
      if (keysToClean.length > 0) {
        await AsyncStorage.multiRemove(keysToClean);
        console.log(`✅ Cleaned ${keysToClean.length} keys`);
      }
    }
    
    // Return success
    return true;
  } catch (error) {
    console.error('❌ Memory cleanup failed:', error);
    return false;
  }
};

/**
 * Checks if wind data cache is too large and trims it if needed
 */
export const checkAndTrimCache = async (): Promise<boolean> => {
  try {
    // Check wind data cache size
    const windData = await AsyncStorage.getItem('windData');
    if (!windData) return true; // No data to trim
    
    // If cache is too large, trim it
    if (windData.length > MAX_CACHE_SIZE) {
      console.log(`⚠️ Wind data cache too large (${windData.length} chars), trimming...`);
      
      try {
        // Parse data, take only most recent entries
        const data = JSON.parse(windData);
        if (Array.isArray(data) && data.length > 20) {
          // Keep only 20 most recent entries
          const trimmed = data.slice(-20);
          await AsyncStorage.setItem('windData', JSON.stringify(trimmed));
          console.log(`✅ Trimmed wind data cache from ${data.length} to ${trimmed.length} entries`);
        } else {
          // If parsing succeeded but format is unexpected, clear it
          await AsyncStorage.removeItem('windData');
          console.log('✅ Cleared invalid wind data cache');
        }
      } catch (parseError) {
        // If parsing failed, cache is corrupted - remove it
        console.error('❌ Wind data cache corrupted, removing:', parseError);
        await AsyncStorage.removeItem('windData');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Cache trim check failed:', error);
    return false;
  }
};

/**
 * Clears all cached data during app startup as a last resort
 * Only use this when serious problems are detected
 */
export const performEmergencyCleanup = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true; // Only needed on Android
  
  console.warn('🚨 Performing emergency memory cleanup...');
  
  try {
    // Clear all data except critical settings
    const keys = await AsyncStorage.getAllKeys();
    const keysToPreserve = [...PRESERVED_KEYS];
    
    const keysToRemove = keys.filter(key => !keysToPreserve.includes(key));
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`✅ Emergency cleanup removed ${keysToRemove.length} keys`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    // Last resort - try to clear everything
    try {
      await AsyncStorage.clear();
      console.log('✅ Cleared all data in last-resort cleanup');
      return true;
    } catch (clearError) {
      console.error('💥 Complete data clear failed:', clearError);
      return false;
    }
  }
};

export default {
  performMemoryCleanup,
  checkAndTrimCache,
  performEmergencyCleanup
};
