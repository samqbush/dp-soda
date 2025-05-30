import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Clear all stored data and reset the app state
 */
export const clearAppStorage = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing all app storage...');
    await AsyncStorage.clear();
    console.log('✅ Storage cleared successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error clearing app storage:', error);
    return Promise.reject(error);
  }
};

/**
 * Clear only wind data cache
 */
export const clearWindDataCache = async (): Promise<void> => {
  try {
    console.log('🗑️ Clearing wind data cache...');
    await AsyncStorage.removeItem('windData');
    console.log('✅ Wind data cache cleared successfully');
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error clearing wind data cache:', error);
    return Promise.reject(error);
  }
};

/**
 * Initialize AsyncStorage with error handling
 * This can help prevent issues on first app launch
 */
export const initializeStorage = async (): Promise<boolean> => {
  try {
    console.log('🔄 Initializing app storage...');
    
    // Use promise with timeout for Android
    const testAsyncStorage = async () => {
      try {
        await AsyncStorage.setItem('storageTest', 'testValue');
        const testValue = await AsyncStorage.getItem('storageTest');
        
        const isValid = testValue === 'testValue';
        
        // Clean up test
        await AsyncStorage.removeItem('storageTest');
        return isValid;
      } catch (e) {
        console.error('AsyncStorage test failed with error:', e);
        return false;
      }
    };
    
    // Add timeout protection for Android
    const storagePromise = new Promise<boolean>(async (resolve) => {
      if (Platform.OS === 'android') {
        // On Android, sometimes AsyncStorage initialization can hang
        setTimeout(() => {
          console.warn('⚠️ AsyncStorage test timed out - assuming failure');
          resolve(false);
        }, 5000); // Increased timeout from 3000ms to 5000ms
      }
      
      const result = await testAsyncStorage();
      resolve(result);
    });
    
    const isStorageWorking = await storagePromise;
    
    if (!isStorageWorking) {
      console.warn('⚠️ AsyncStorage test failed - value mismatch or timeout');
      return false;
    }
    
    // Set default values if needed
    try {
      const hasInitialized = await AsyncStorage.getItem('hasInitialized');
      if (!hasInitialized) {
        // Set default preferences
        const defaultPrefs = {
          initialized: true,
          version: '1.0.0',
          platform: Platform.OS,
          firstRun: new Date().toISOString(),
        };
        
        await AsyncStorage.setItem('hasInitialized', JSON.stringify(defaultPrefs));
        console.log('✅ Storage initialized with defaults');
      }
    } catch (e) {
      console.warn('⚠️ Failed to set initialization value, but continuing:', e);
      // Continue anyway since basic storage is working
    }
    
    console.log('✅ Storage initialization successful');
    return true;
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    return false;
  }
};
