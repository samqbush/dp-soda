/**
 * Special handling for Android's splash screen
 * 
 * This module ensures that Android displays the splash screen correctly
 * and provides a smooth transition to the app content
 * 
 * Enhanced to handle the "brief display then white screen" issue
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as React from 'react';
import { Platform } from 'react-native';

// Guard against multiple hide attempts
let hasHiddenSplash = false;
let splashTimer: NodeJS.Timeout | null = null;

/**
 * Reset splash screen state - useful for testing
 */
export const resetSplashState = () => {
  hasHiddenSplash = false;
  if (splashTimer) {
    clearTimeout(splashTimer);
    splashTimer = null;
  }
};

/**
 * Keep the splash screen visible until hideAsync is called
 * This should be called at the entry point of your app
 * 
 * Enhanced to check if we need recovery from previous crashes
 */
export const prepareSplashScreen = async () => {
  if (Platform.OS === 'android') {
    try {
      resetSplashState();
      
      // Check if we had a previous crash
      try {
        const lastError = await AsyncStorage.getItem('lastError');
        if (lastError) {
          const errorData = JSON.parse(lastError);
          const errorTime = new Date(errorData.date || 0);
          const now = new Date();
          
          // If error was recent (last 10 minutes), this might be a restart after crash
          if ((now.getTime() - errorTime.getTime()) < 10 * 60 * 1000) {
            console.log('🚨 Recent crash detected, preparing for recovery mode');
            // Clear the error immediately to prevent loops
            await AsyncStorage.removeItem('lastError');
            
            // Also try to clear any corrupted wind data
            await AsyncStorage.removeItem('windData');
          }
        }
      } catch (e) {
        // Don't let this block the app startup
        console.warn('Error checking for previous crashes:', e);
      }
      
      await SplashScreen.preventAutoHideAsync();
    } catch (e) {
      console.warn('Failed to prevent auto hide of splash screen:', e);
    }
  }
};

/**
 * Hide the splash screen with a proper transition
 * Call this when your app is ready to be shown
 * 
 * Enhanced with retry logic and safety checks
 */
export const hideSplashScreen = async () => {
  if (Platform.OS === 'android' && !hasHiddenSplash) {
    console.log('🎬 Attempting to hide splash screen...');
    hasHiddenSplash = true; // Prevent multiple hide attempts
    
    try {
      await SplashScreen.hideAsync();
      console.log('✅ Splash screen hidden successfully');
    } catch (e) {
      console.warn('⚠️ Failed to hide splash screen, will retry once:', e);
      
      // Give it one more try after a short delay
      setTimeout(() => {
        SplashScreen.hideAsync().catch(retryErr => 
          console.error('❌ Final splash hide attempt failed:', retryErr)
        );
      }, 500);
    }
  }
};

/**
 * Force hide the splash screen after a timeout
 * Use this as a safety mechanism to prevent the splash screen from being stuck forever
 * 
 * Enhanced with multiple fallback attempts
 */
export const setupSplashScreenTimeout = (timeoutMs = 5000) => {
  if (Platform.OS === 'android') {
    // Clear any existing timeout
    if (splashTimer) {
      clearTimeout(splashTimer);
    }
    
    // Set up tiered timeouts for hiding splash screen
    splashTimer = setTimeout(() => {
      if (!hasHiddenSplash) {
        console.warn('⚠️ Force hiding splash screen after timeout');
        hideSplashScreen().catch(e => {
          console.error('❌ Failed to force hide splash screen:', e);
          
          // Final desperate attempt - this is a known issue with some React Native versions
          setTimeout(() => {
            if (!hasHiddenSplash) {
              SplashScreen.hideAsync().catch(() => {
                console.error('💥 All splash hide attempts failed');
              });
            }
          }, 1000);
        });
      }
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
