import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { LogBox, Platform, Text, View } from 'react-native';
import 'react-native-reanimated';

import { ErrorBoundary } from '@/components/ErrorBoundary';
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

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()
  .catch(error => console.log('Error preventing splash screen auto hide:', error));

export default function RootLayout() {
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
  
  // Handle splash screen hiding
  useEffect(() => {
    const hideSplash = async () => {
      // Only hide splash when fonts are loaded and storage is initialized
      if (loaded && isStorageInitialized) {
        try {
          // Small delay for smoother transition
          setTimeout(async () => {
            await SplashScreen.hideAsync();
            console.log('✅ Splash screen hidden');
          }, Platform.OS === 'android' ? 500 : 200);
        } catch (e) {
          console.warn('Error hiding splash screen:', e);
        }
      }
    };
    
    hideSplash();
  }, [loaded, isStorageInitialized]);

  // Show loading screen while resources are initializing
  if (!loaded || !isStorageInitialized) {
    return null; // Keep splash screen visible
  }
  
  // Handle initialization errors
  if (initError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
          Something went wrong during app initialization
        </Text>
        <Text style={{ fontSize: 14, color: 'red', textAlign: 'center' }}>
          {initError}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
