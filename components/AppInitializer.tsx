import { prepareNotifications } from '@/services/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface AppInitializerProps {
  onInitialized: () => void;
  fallbackTimeoutMs?: number;
}

/**
 * Component that helps manage initialization and splash screen transition
 * Ensures the app continues loading even if initialization fails or takes too long
 */
export function AppInitializer({ 
  onInitialized, 
  fallbackTimeoutMs = 3000 
}: AppInitializerProps) {
  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    // Set a fallback timeout to ensure app continues loading
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Initialization timeout reached, continuing with app');
      setTimeoutReached(true);
      onInitialized();
    }, fallbackTimeoutMs);

    // Initialize notification system
    prepareNotifications().catch(err => {
      console.warn('⚠️ Failed to initialize notifications', err);
    });

    return () => clearTimeout(timeoutId);
  }, [fallbackTimeoutMs, onInitialized]);

  // Try to hide the splash screen when this component renders
  useEffect(() => {
    // One final attempt to hide splash screen
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (err) {
        console.log('Error hiding splash screen from AppInitializer', err);
      }
    };

    hideSplash();
  }, []);

  // Return a progress indicator while waiting
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>
        {timeoutReached 
          ? 'Continuing with limited functionality...' 
          : 'Loading your app...'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  text: {
    marginTop: 10,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});
