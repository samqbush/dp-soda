/**
 * Special handling for Android's splash screen
 * 
 * This module ensures that Android displays the splash screen correctly
 * and provides a smooth transition to the app content
 */
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Platform } from 'react-native';

/**
 * Keep the splash screen visible until hideAsync is called
 * This should be called at the entry point of your app
 */
export const prepareSplashScreen = async () => {
  if (Platform.OS === 'android') {
    try {
      await SplashScreen.preventAutoHideAsync();
    } catch (e) {
      console.warn('Failed to prevent auto hide of splash screen:', e);
    }
  }
};

/**
 * Hide the splash screen with a proper transition
 * Call this when your app is ready to be shown
 */
export const hideSplashScreen = async () => {
  if (Platform.OS === 'android') {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn('Failed to hide splash screen:', e);
    }
  }
};

/**
 * Force hide the splash screen after a timeout
 * Use this as a safety mechanism
 */
export const setupSplashScreenTimeout = (timeoutMs = 5000) => {
  if (Platform.OS === 'android') {
    setTimeout(() => {
      SplashScreen.hideAsync().catch(e => 
        console.warn('Failed to force hide splash screen:', e)
      );
    }, timeoutMs);
  }
};

/**
 * Hook that handles splash screen in a component
 */
export const useSplashScreen = (autoHide = true, timeoutMs = 3000) => {
  React.useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        hideSplashScreen();
      }, Platform.OS === 'android' ? timeoutMs : 500);
      
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoHide, timeoutMs]);

  return {
    hide: hideSplashScreen
  };
};
