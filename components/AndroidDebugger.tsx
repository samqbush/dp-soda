import { getBuildConfig } from '@/config/buildConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
 * Only shows in development or when explicitly enabled
 */
export function AndroidDebugger({ enabled = false }: { enabled?: boolean }) {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [renderCount, setRenderCount] = useState(0);
  const [visible, setVisible] = useState(false);

  // Only show on Android and when enabled or in development
  const shouldShow = Platform.OS === 'android' && (enabled || __DEV__);

  useEffect(() => {
    if (!shouldShow) return;

    setRenderCount(prev => prev + 1);

    const gatherDebugInfo = async () => {
      try {
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
          lastError = errorData ? JSON.parse(errorData).message : null;
        } catch (e) {
          console.log('Error getting last error:', e);
        }

        const info: DebugInfo = {
          timestamp: new Date().toISOString(),
          platform: `${Platform.OS} ${Platform.Version}`,
          buildInfo: getBuildConfig(),
          storageTest,
          renderCount,
          memoryWarnings: 0, // Could be enhanced with memory monitoring
          lastError
        };

        setDebugInfo(info);
      } catch (e) {
        console.error('Failed to gather debug info:', e);
      }
    };

    gatherDebugInfo();
  }, [shouldShow, renderCount]);

  if (!shouldShow || !debugInfo) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={() => setVisible(!visible)}
      >
        <Text style={styles.toggleText}>
          {visible ? '📱 Hide Debug' : '🐛 Debug Info'}
        </Text>
      </TouchableOpacity>

      {visible && (
        <ScrollView style={styles.debugPanel}>
          <Text style={styles.title}>Android Debug Info</Text>
          
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
  debugPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    marginTop: 5,
    padding: 15,
    borderRadius: 10,
    maxHeight: 300,
    minWidth: 250,
  },
  title: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  section: {
    marginBottom: 8,
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
});
