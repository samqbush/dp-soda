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
    
    // Test AsyncStorage functionality
    await AsyncStorage.setItem('storageTest', 'testValue');
    const testValue = await AsyncStorage.getItem('storageTest');
    
    if (testValue !== 'testValue') {
      console.warn('⚠️ AsyncStorage test failed - value mismatch');
      return false;
    }
    
    // Clean up test
    await AsyncStorage.removeItem('storageTest');
    
    // Set default values if needed
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
    
    console.log('✅ Storage initialization successful');
    return true;
  } catch (error) {
    console.error('❌ Storage initialization failed:', error);
    return false;
  }
};
