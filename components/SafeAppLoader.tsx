import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EmergencyRecovery } from './EmergencyRecovery';
import { WhiteScreenDetective } from './WhiteScreenDetective';

/**
 * A component that renders while the app is loading,
 * but will force progress after a timeout to prevent
 * the app from appearing to hang
 */
export function SafeAppLoader() {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [forceReload, setForceReload] = useState(0);
  
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
          setForceReload(prev => prev + 1);
        }
        
        return newVal;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [forceReload]);
  
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
      <WhiteScreenDetective />
      
      <ActivityIndicator
        size="large"
        color={Platform.OS === 'android' ? '#4CAF50' : '#007AFF'}
        style={styles.spinner}
      />
      <Text style={styles.loadingText}>{message}</Text>
      
      {timeElapsed > 8 && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            console.log('User initiated force reload');
            setTimeElapsed(0);
            setForceReload(prev => prev + 1);
          }}
        >
          <Text style={styles.retryButtonText}>Force Reload</Text>
        </TouchableOpacity>
      )}
      
      <Text style={styles.timeElapsed}>
        Loading for {timeElapsed} seconds...
      </Text>
      
      {timeElapsed > 12 && <EmergencyRecovery />}
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeElapsed: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
});

export default SafeAppLoader;
