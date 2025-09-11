// Import polyfills first to ensure they're available for all dependencies
import '@/services/polyfills';

import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, LogBox, Platform, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AndroidSafeWrapper } from '@/components/AndroidSafeWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SafeAppLoader } from '@/components/SafeAppLoader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { prepareSplashScreen } from '@/services/androidSplash';
import { getGlobalSessionId } from '@/utils/sessionUtils';

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
prepareSplashScreen().catch(error => console.log('Error setting up splash screen:', error));

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
  
  // Initialize app services (simplified - no AsyncStorage complexity)
  useEffect(() => {
    const setupApp = () => {
      console.log('🚀 App initialization starting...');
      try {
        console.log('✅ Storage initialization skipped (using in-memory only)');
        setIsStorageInitialized(true);
        
        // Initialize global session for component remount persistence
        getGlobalSessionId();
        
        console.log('✅ App initialization complete');
      } catch (e) {
        console.error('❌ Fatal error during app setup:', e);
        setInitError(`Setup error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    };
    
    setupApp();
  }, []);
  
  // Ensure splash screen hides when resources are ready
  useEffect(() => {
    const hideSplash = async () => {
      try {
        if (loaded && isStorageInitialized) {
          // Normal flow - both conditions met
          console.log('✅ Resources loaded - hiding splash screen normally');
          setTimeout(async () => {
            await SplashScreen.hideAsync();
          }, Platform.OS === 'android' ? 300 : 200);
        }
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
