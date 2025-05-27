import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { LogBox, Platform, Text, TouchableOpacity, View } from 'react-native';
// Import React explicitly to ensure consistent version usage
import React from 'react';
// Import helper to ensure single React instance
import { ensureSingleReactInstance } from '@/services/reactHelper';
import 'react-native-reanimated';

import { AndroidSafeWrapper } from '@/components/AndroidSafeWrapper';
import { AppInitializer } from '@/components/AppInitializer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SafeAppLoader } from '@/components/SafeAppLoader';
import { useColorScheme } from '@/hooks/useColorScheme';
import { initializeStorage } from '@/services/storageService';

// Ignore specific warnings in production builds
if (!__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'ViewPropTypes will be removed',
    'AsyncStorage has been extracted from react-native',
  ]);
}

// Import our specialized Android splash handler
import { prepareSplashScreen, setupSplashScreenTimeout } from '@/services/androidSplash';

// Keep the splash screen visible while we fetch resources
// And set a safety timeout to ensure it doesn't get stuck
prepareSplashScreen().then(() => {
  // Always set a safety timeout to hide splash screen
  setupSplashScreenTimeout(6000);
}).catch(error => console.log('Error setting up splash screen:', error));

export default function RootLayout() {
  // Ensure we're using a single consistent React instance
  ensureSingleReactInstance();
  
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Initialize storage and other critical services
  useEffect(() => {
    const setupApp = async () => {
      try {
        // Initialize AsyncStorage
        const storageReady = await initializeStorage();
        setIsStorageInitialized(storageReady);
        
        if (!storageReady) {
          console.warn('⚠️ Storage initialization failed');
          setInitError('Storage initialization failed');
        }
        
      } catch (e) {
        console.error('❌ Fatal error during app setup:', e);
        setInitError(`Setup error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    };
    
    setupApp();
  }, []);
  
  // Track app lifecycle to prevent navigation issue on re-activation
  const [appReady, setAppReady] = useState(false);
  const [appHasMounted, setAppHasMounted] = useState(false);
  
  // One-time flag to track if app has ever been initialized
  // This helps prevent re-initialization issues
  useEffect(() => {
    setAppHasMounted(true);
  }, []);

  // Ensure splash screen hides even if initialization takes too long
  useEffect(() => {
    const hideSplash = async () => {
      try {
        // Introduce deliberate loading sequence to prevent race conditions
        if (loaded) {
          console.log('✅ Fonts loaded');
          
          // Wait a moment before checking storage
          await new Promise(resolve => setTimeout(resolve, Platform.OS === 'android' ? 300 : 100));
          
          if (isStorageInitialized) {
            console.log('✅ Storage initialized');
            
            // Add a small delay for smoother transition
            await new Promise(resolve => setTimeout(resolve, Platform.OS === 'android' ? 300 : 100));
            
            console.log('✅ All resources loaded - hiding splash screen normally');
            try {
              await SplashScreen.hideAsync();
              console.log('✅ Splash screen hidden successfully');
              
              // Mark app as fully ready AFTER splash is hidden
              setTimeout(() => {
                setAppReady(true);
              }, 100);
            } catch (e) {
              console.warn('Error hiding splash normally:', e);
              setAppReady(true); // Continue anyway
            }
          }
        }
        
        // Set a maximum timeout to ensure splash screen doesn't stay forever
        const MAXIMUM_SPLASH_TIME = 5000; // 5 seconds max
        
        setTimeout(async () => {
          // If we're still showing splash after timeout, force hide it
          if (!appReady) {
            console.warn('⚠️ Force hiding splash screen after timeout');
            try {
              await SplashScreen.hideAsync();
              
              // If we had to force hide, set all initialized flags to true
              setIsStorageInitialized(true);
              setAppReady(true);
            } catch (e) {
              console.error('Failed to force hide splash:', e);
              setAppReady(true); // Continue anyway
            }
          }
        }, MAXIMUM_SPLASH_TIME);
      } catch (e) {
        console.warn('Error in splash screen management:', e);
        // Last resort - try to hide splash screen directly and continue
        SplashScreen.hideAsync().catch(err => console.error('Final splash hide attempt failed:', err));
        setAppReady(true); // Continue anyway
      }
    };
    
    hideSplash();
  }, [loaded, isStorageInitialized]);

  // Callback for when initialization completes (either normally or via timeout)
  const handleInitialized = useCallback(() => {
    if (!isStorageInitialized) {
      setIsStorageInitialized(true);
    }
  }, [isStorageInitialized]);
  
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
  if (!loaded || !isStorageInitialized || !minimumLoadingComplete) {
    // Use SafeAppLoader for Android, AppInitializer for iOS
    return Platform.OS === 'android' 
      ? <SafeAppLoader /> 
      : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <AppInitializer onInitialized={handleInitialized} />
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
          Wind Trend Analyzer
        </Text>
        <Text style={{ fontSize: 16, marginBottom: 20, textAlign: 'center' }}>
          Something went wrong during app initialization
        </Text>
        <Text style={{ fontSize: 14, color: 'red', textAlign: 'center', marginBottom: 20 }}>
          {initError}
        </Text>
        <TouchableOpacity 
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8
          }}
          onPress={async () => {
            try {
              // For Android, try to clear storage on error
              if (Platform.OS === 'android') {
                await AsyncStorage.clear();
              }
              // Force reload app by resetting state
              setInitError(null);
              setIsStorageInitialized(false);
              // Try initialization again with a delay
              setTimeout(() => {
                setIsStorageInitialized(true);
              }, 300);
            } catch (e) {
              console.error('Error in recovery:', e);
            }
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AndroidSafeWrapper>
      <ErrorBoundary>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </AndroidSafeWrapper>
  );
}
