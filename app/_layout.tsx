// Import polyfills first to ensure they're available for all dependencies
import '@/services/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, LogBox, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AndroidSafeWrapper } from '@/components/AndroidSafeWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SafeAppLoader } from '@/components/SafeAppLoader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { prepareSplashScreen, setupSplashScreenTimeout } from '@/services/androidSplash';
import { initializeStorage } from '@/services/storageService';

import { SettingsProvider } from '@/contexts/SettingsContext';

// Ignore specific warnings in production builds
if (!__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'ViewPropTypes will be removed',
    'AsyncStorage has been extracted from react-native',
  ]);
}

// Keep the splash screen visible while we fetch resources
// And set a safety timeout to ensure it doesn't get stuck
prepareSplashScreen().then(() => {
  // Always set a safety timeout to hide splash screen
  setupSplashScreenTimeout(6000);
}).catch(error => console.log('Error setting up splash screen:', error));

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [appStartTime] = useState(Date.now());
  const [isStuck, setIsStuck] = useState(false);
  
  // Monitor app state to detect if we're stuck
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const timeElapsed = Date.now() - appStartTime;
        // If we've been trying to load for more than 15 seconds and are still stuck
        if (timeElapsed > 15000 && (!loaded || !isStorageInitialized)) {
          console.warn('🚨 App appears to be stuck - forcing initialization');
          setIsStuck(true);
          setIsStorageInitialized(true);
        }
      }
    });

    return () => subscription?.remove();
  }, [loaded, isStorageInitialized, appStartTime]);
  
  // Initialize storage and other critical services
  useEffect(() => {
    const setupApp = async () => {
      console.log('🚀 App initialization starting...');
      try {
        console.log('💾 Initializing storage...');
        // Initialize AsyncStorage
        const storageReady = await initializeStorage();
        console.log('💾 Storage initialization result:', storageReady);
        setIsStorageInitialized(storageReady);
        
        if (!storageReady) {
          console.warn('⚠️ Storage initialization failed');
          setInitError('Storage initialization failed');
        } else {
          console.log('✅ Storage initialization successful');
        }
        
      } catch (e) {
        console.error('❌ Fatal error during app setup:', e);
        setInitError(`Setup error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    };
    
    setupApp();
  }, []);
  
  // Ensure splash screen hides even if initialization takes too long
  useEffect(() => {
    const hideSplash = async () => {
      try {
        if (loaded && isStorageInitialized) {
          // Normal flow - both conditions met
          console.log('✅ Resources loaded - hiding splash screen normally');
          setTimeout(async () => {
            await SplashScreen.hideAsync();
          }, Platform.OS === 'android' ? 300 : 200);
          return;
        }
        
        // Set a maximum timeout to ensure splash screen doesn't stay forever
        const MAXIMUM_SPLASH_TIME = 5000; // 5 seconds max
        
        setTimeout(async () => {
          // If we're still showing splash after timeout, force hide it
          if (!loaded || !isStorageInitialized) {
            console.warn('⚠️ Force hiding splash screen after timeout');
            try {
              await SplashScreen.hideAsync();
              
              // If we had to force hide, set initialized to true anyway
              // to let the app continue loading
              if (!isStorageInitialized) {
                setIsStorageInitialized(true);
              }
            } catch (e) {
              console.error('Failed to force hide splash:', e);
            }
          }
        }, MAXIMUM_SPLASH_TIME);
      } catch (e) {
        console.warn('Error in splash screen management:', e);
        // Last resort - try to hide splash screen directly
        SplashScreen.hideAsync().catch(err => console.error('Final splash hide attempt failed:', err));
      }
    };
    
    hideSplash();
  }, [loaded, isStorageInitialized]);

  // Minimum loading delay to ensure smooth transitions
  const [minimumLoadingComplete, setMinimumLoadingComplete] = useState(false);
  useEffect(() => {
    // Ensure a minimum loading time to avoid flickers
    const timer = setTimeout(() => {
      setMinimumLoadingComplete(true);
    }, Platform.OS === 'android' ? 800 : 200);
    return () => clearTimeout(timer);
  }, []);

  // Normal initialization state - loading resources
  if ((!loaded || !isStorageInitialized || !minimumLoadingComplete) && !isStuck) {
    // Use SafeAppLoader for Android, simple loading for iOS
    return Platform.OS === 'android' 
      ? <SafeAppLoader /> 
      : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Loading...</Text>
        </View>
      );
  }
  
  // Emergency fallback UI if app is stuck
  if (isStuck) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: '#ffffff' 
      }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          Dawn Patrol Alarm
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
          Loading took longer than expected. Continuing anyway...
        </Text>
      </View>
    );
  }
  
  // Handle initialization errors with friendly recovery UI
  if (initError) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 20, 
        backgroundColor: Platform.OS === 'android' ? '#ffffff' : undefined 
      }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          Dawn Patrol Alarm
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
          Something went wrong during app initialization
        </Text>
        <Text style={{ fontSize: 14, color: 'red', textAlign: 'center', marginBottom: 20 }}>
          {initError}
        </Text>
        <View style={{
          backgroundColor: '#007AFF',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            Try Again
          </Text>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AndroidSafeWrapper>
        <ErrorBoundary>
          <SettingsProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </SettingsProvider>
        </ErrorBoundary>
      </AndroidSafeWrapper>
    </GestureHandlerRootView>
  );
}
