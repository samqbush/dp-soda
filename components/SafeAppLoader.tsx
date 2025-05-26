import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

/**
 * A component that renders while the app is loading,
 * but will force progress after a timeout to prevent
 * the app from appearing to hang
 */
export function SafeAppLoader() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  useEffect(() => {
    // Try to hide splash screen as soon as this component mounts
    const hideSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding splash from SafeAppLoader:', e);
      }
    };
    
    hideSplash();
    
    // Update elapsed time counter
    const interval = setInterval(() => {
      setTimeElapsed(prev => {
        const newVal = prev + 1;
        
        // Extra safety - if we're stuck for 10 seconds, force reload
        if (newVal >= 10 && Platform.OS === 'android') {
          console.log('🔄 Loader timeout - attempting force refresh');
          // This is a last resort measure - the app should never get here
          try {
            if (typeof window !== 'undefined') {
              // @ts-ignore - using raw DOM API as last resort
              window.location?.reload?.();
            }
          } catch (e) {
            console.error('Failed force refresh attempt', e);
          }
        }
        
        return newVal;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Message based on how long we've been loading
  let message = 'Loading app...';
  if (timeElapsed > 3) {
    message = 'Still loading...';
  }
  if (timeElapsed > 5) {
    message = 'Almost there...';
  }
  if (timeElapsed > 7) {
    message = 'Loading is taking longer than expected...';
  }
  
  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={Platform.OS === 'android' ? '#4CAF50' : '#007AFF'}
        style={styles.spinner}
      />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
});

export default SafeAppLoader;
