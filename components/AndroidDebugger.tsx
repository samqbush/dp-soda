import { getBuildConfig } from '@/config/buildConfig';
import { debugSettings } from '@/services/debugSettings';
import { globalCrashHandler } from '@/services/globalCrashHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
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

/**
 * Android-specific debugging component to help diagnose white screen issues
 * Only visible when enabled through Developer Mode settings
 */
export function AndroidDebugger({ enabled = false }: { enabled?: boolean }) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isComponentEnabled, setIsComponentEnabled] = useState(false);

  // Check visibility and initialize if enabled
  useEffect(() => {
    // Only relevant on Android
    if (Platform.OS !== 'android') return;

    const checkVisibilityAndInit = async () => {
      try {
        // Check if this component should be shown - only use debug settings
        const shouldShow = await debugSettings.isComponentVisible('showAndroidDebugger');
        console.log('🔍 AndroidDebugger visibility:', shouldShow ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(shouldShow);
        
        // Only initialize if component should be shown
        if (shouldShow) {
          await gatherDebugInfo();
        }
      } catch (error) {
        console.error('Failed to check AndroidDebugger visibility:', error);
      }
    };
    
    // Function to check if app appears to be stuck or crashed
    const isStuckOrCrashed = () => {
      // App has been running for more than 15 seconds without initializing
      const appStartTime = (global as any).__APP_START_TIME || Date.now();
      return (Date.now() - appStartTime) > 15000;
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
  }, [enabled]);

  const gatherDebugInfo = async () => {
    try {
      // Update render count
      const currentRenderCount = renderCount + 1;
      setRenderCount(currentRenderCount);
      
      // Test AsyncStorage
      let storageTest = 'failed';
      try {
        await AsyncStorage.setItem('debugTest', 'working');
        const result = await AsyncStorage.getItem('debugTest');
        storageTest = result === 'working' ? 'working' : 'failed';
        await AsyncStorage.removeItem('debugTest');
      } catch (e) {
        storageTest = `error: ${e}`;
      }

      // Get last error
      let lastError = null;
      try {
        const errorData = await AsyncStorage.getItem('lastError');
        if (errorData) {
          lastError = errorData;
        }
      } catch (e) {
        console.error('Error reading last error:', e);
      }

      // Set the debug info
      setDebugInfo({
        timestamp: new Date().toISOString(),
        platform: `${Platform.OS} ${Platform.Version}`,
        buildInfo: getBuildConfig(),
        storageTest,
        renderCount: currentRenderCount,
        memoryWarnings: 0,
        lastError
      });
    } catch (error) {
      console.error('Failed to gather debug info:', error);
    }
  };

  // Don't render if not enabled or not on Android
  if (Platform.OS !== 'android' || !isComponentEnabled) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setVisible(!visible)}
      >
        <Text style={styles.toggleText}>🔧 Debug Info</Text>
      </TouchableOpacity>
      
      {visible && debugInfo && (
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
