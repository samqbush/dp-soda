import { debugSettings } from '@/services/debugSettings';
import { globalCrashHandler } from '@/services/globalCrashHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DebugInfo {
  timestamp: string;
  platform: string;
  buildInfo: any;
  storageTest: string;
  renderCount: number;
  memoryWarnings: number;
  lastError: string | null;
}

interface AndroidDebuggerProps {
  enabled?: boolean;
}

/**
 * Android Debugger - Helps debug issues on Android devices
 * This component provides insights into the device, platform, and runtime environment
 */
export function AndroidDebugger({ enabled = false }: AndroidDebuggerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isComponentEnabled, setIsComponentEnabled] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    timestamp: new Date().toISOString(),
    platform: Platform.OS,
    buildInfo: {
      version: Constants.expoConfig?.version || 'Unknown',
      environment: __DEV__ ? 'development' : 'production'
    },
    storageTest: 'not run',
    renderCount: 0,
    memoryWarnings: 0,
    lastError: null
  });

  const gatherDebugInfo = useCallback(async () => {
    try {
      // Update render count
      const currentRenderCount = renderCount + 1;
      setRenderCount(currentRenderCount);
      
      // Test AsyncStorage
      let storageTest = 'failed';
      try {
        await AsyncStorage.setItem('debug_test', 'working');
        storageTest = await AsyncStorage.getItem('debug_test') || 'not found';
      } catch (e) {
        storageTest = `error: ${e instanceof Error ? e.message : String(e)}`;
      }
      
      // Get build info
      const buildInfo = {
        version: Constants.expoConfig?.version || 'Unknown',
        environment: __DEV__ ? 'development' : 'production'
      };
      
      // Get last error from global handler
      const lastError = globalCrashHandler.getLastError();
      
      setDebugInfo({
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        buildInfo,
        storageTest,
        renderCount: currentRenderCount,
        memoryWarnings: globalCrashHandler.getMemoryWarningCount(),
        lastError: lastError ? `${lastError.message} (${lastError.time})` : null
      });
    } catch (error) {
      console.error('Error gathering debug info:', error);
    }
  }, [renderCount]);

  // Single unified useEffect for both visibility checking and initialization
  useEffect(() => {
    // Only relevant on Android
    if (Platform.OS !== 'android') return;

    const checkVisibilityAndInit = async () => {
      try {
        // Check if this component should be shown based on props or debug settings
        const shouldShow = enabled || await debugSettings.isComponentVisible('showAndroidDebugger');
        console.log('🔍 AndroidDebugger visibility:', shouldShow ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(shouldShow);
        
        if (shouldShow) {
          await gatherDebugInfo();
        }
      } catch (error) {
        console.error('Failed to check AndroidDebugger visibility:', error);
      }
    };
    
    checkVisibilityAndInit();
    
    // Subscribe to visibility changes
    const unsubscribe = debugSettings.subscribeToVisibilityChanges('showAndroidDebugger', 
      async (isVisible) => {
        console.log('🔄 AndroidDebugger visibility changed:', isVisible ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(isVisible);
        
        if (isVisible) {
          await gatherDebugInfo();
        }
      }
    );
    
    // Also check when app returns to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkVisibilityAndInit();
      }
    });
    
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [enabled, gatherDebugInfo]);

  // Don't render if not enabled or not on Android
  if (Platform.OS !== 'android' || !isComponentEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.toggleText}>🔧 Debug Info</Text>
      </TouchableOpacity>
      
      {isVisible && debugInfo && (
        <ScrollView style={styles.infoPanel}>
          <View style={styles.section}>
            <Text style={styles.label}>Platform:</Text>
            <Text style={styles.value}>{debugInfo.platform}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.label}>Build:</Text>
            <Text style={styles.value}>
              v{debugInfo.buildInfo.version} ({debugInfo.buildInfo.environment})
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Storage Test:</Text>
            <Text style={[styles.value, { 
              color: debugInfo.storageTest === 'working' ? 'green' : 'red' 
            }]}>
              {debugInfo.storageTest}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Render Count:</Text>
            <Text style={styles.value}>{debugInfo.renderCount}</Text>
          </View>

          {debugInfo.lastError && (
            <View style={styles.section}>
              <Text style={styles.label}>Last Error:</Text>
              <Text style={[styles.value, { color: 'red' }]}>
                {debugInfo.lastError}
              </Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Timestamp:</Text>
            <Text style={styles.value}>
              {new Date(debugInfo.timestamp).toLocaleTimeString()}
            </Text>
          </View>

          {/* Only show crash testing in developer mode */}
          <View style={styles.section}>
            <Text style={styles.label}>Crash Testing:</Text>
            <TouchableOpacity 
              style={styles.testButton}
              onPress={() => globalCrashHandler.reportTestCrash('AndroidDebugger', 'Test crash triggered')}
            >
              <Text style={styles.testButtonText}>🧪 Test Crash</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    zIndex: 1000,
  },
  toggleButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  toggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    marginTop: 5,
    padding: 15,
    borderRadius: 10,
    maxHeight: 300,
    minWidth: 250,
  },
  section: {
    marginBottom: 10,
  },
  label: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  value: {
    color: 'white',
    fontSize: 12,
    marginTop: 2,
  },
  testButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 5,
  },
  testButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
