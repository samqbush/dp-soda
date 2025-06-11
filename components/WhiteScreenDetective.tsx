import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

/**
 * White Screen Detective - helps identify what's causing white screen issues
 */
export function WhiteScreenDetective() {
  const [checks, setChecks] = useState<{ [key: string]: boolean | string }>({});
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: { [key: string]: boolean | string } = {};

      // Check 1: Basic platform info
      try {
        results.platform = `${Platform.OS} ${Platform.Version}`;
        results.platformCheck = true;
      } catch (e) {
        console.log('Platform check failed:', e);
        results.platformCheck = false;
      }

      // Check 2: Build config
      try {
        const expoConfig = Constants.expoConfig;
        const version = expoConfig?.version || 'Unknown';
        const environment = __DEV__ ? 'development' : 'production';
        results.buildConfig = `v${version} (${environment})`;
        results.buildConfigCheck = true;
      } catch (e) {
        console.log('Build config check failed:', e);
        results.buildConfigCheck = false;
      }

      // Check 3: AsyncStorage
      try {
        await AsyncStorage.setItem('detective_test', 'working');
        const result = await AsyncStorage.getItem('detective_test');
        await AsyncStorage.removeItem('detective_test');
        results.storageCheck = result === 'working';
      } catch (e) {
        console.log('Storage check failed:', e);
        results.storageCheck = false;
      }

      // Check 4: Memory pressure
      try {
        // Simple memory check - create and discard some objects
        const testArray = new Array(1000).fill('test');
        testArray.length = 0;
        results.memoryCheck = true;
      } catch (e) {
        console.log('Memory check failed:', e);
        results.memoryCheck = false;
      }

      // Check 5: JavaScript execution
      try {
        const testFunction = () => Promise.resolve('working');
        const result = await testFunction();
        results.jsExecutionCheck = result === 'working';
      } catch (e) {
        console.log('JS execution check failed:', e);
        results.jsExecutionCheck = false;
      }

      setChecks(results);
      setIsRunning(false);

      // Report any failures
      const failures = Object.entries(results).filter(([key, value]) => 
        key.endsWith('Check') && value === false
      );

      if (failures.length > 0) {
        console.error('🚨 White Screen Detective found issues:', failures);
      } else {
        console.log('✅ White Screen Detective: All checks passed');
      }
    };

    runDiagnostics();
  }, []);

  // Only show on Android and if we detect issues
  if (Platform.OS !== 'android') {
    return null;
  }

  const hasIssues = Object.entries(checks).some(([key, value]) => 
    key.endsWith('Check') && value === false
  );

  if (!hasIssues && !isRunning) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔍 White Screen Detective</Text>
      
      {isRunning ? (
        <Text style={styles.status}>Running diagnostics...</Text>
      ) : (
        <View>
          {Object.entries(checks).map(([key, value]) => {
            if (!key.endsWith('Check')) return null;
            
            const label = key.replace('Check', '');
            const status = value === true ? '✅' : value === false ? '❌' : '❓';
            
            return (
              <View key={key} style={styles.checkRow}>
                <Text style={styles.checkLabel}>{label}:</Text>
                <Text style={styles.checkStatus}>{status}</Text>
              </View>
            );
          })}
          
          {hasIssues && (
            <Text style={styles.warning}>
              Issues detected! Check console for details.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    maxWidth: 200,
    zIndex: 1001,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  status: {
    fontSize: 12,
    color: '#666',
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  checkLabel: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  checkStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  warning: {
    fontSize: 11,
    color: 'red',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default WhiteScreenDetective;
