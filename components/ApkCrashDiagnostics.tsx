import { debugSettings } from '@/services/debugSettings';
import { productionCrashDetector } from '@/services/productionCrashDetector';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    AppState,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface DiagnosticResult {
  test: string;
  result: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

/**
 * Android Crash Diagnostics - Helps identify crashes in Expo Go and APKs
 * Runs system health checks to identify root causes of crashes
 * Only visible when enabled through Developer Mode settings
 */
export function ApkCrashDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isComponentEnabled, setIsComponentEnabled] = useState(false);
  const [autoRan, setAutoRan] = useState(false);

  useEffect(() => {
    const checkVisibilityAndRun = async () => {
      try {
        if (Platform.OS !== 'android') return; // Only relevant on Android
        
        // Check if this component should be shown
        const shouldShow = await debugSettings.isComponentVisible('showApkDiagnostics');
        console.log('🔍 ApkCrashDiagnostics visibility:', shouldShow ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(shouldShow);
        
        // Only run diagnostics if visible and not already run
        if (shouldShow && !autoRan) {
          setAutoRan(true);
          setTimeout(() => {
            runDiagnostics();
          }, 3000); // Wait a bit for app to settle
        }
      } catch (error) {
        console.error('Failed to check ApkCrashDiagnostics visibility:', error);
      }
    };

    checkVisibilityAndRun();

    // Subscribe to visibility changes
    const unsubscribe = debugSettings.subscribeToVisibilityChanges('showApkDiagnostics', 
      (isVisible) => {
        console.log('🔄 ApkCrashDiagnostics visibility changed:', isVisible ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(isVisible);
        
        if (isVisible && !autoRan) {
          setAutoRan(true);
          setTimeout(() => {
            runDiagnostics();
          }, 1000);
        }
      }
    );

    // Also check when app comes back to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkVisibilityAndRun();
      }
    });
    
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, [autoRan]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    try {
      // Test 1: AsyncStorage accessibility
      try {
        await AsyncStorage.setItem('diagnostic_test', 'test_value');
        const retrieved = await AsyncStorage.getItem('diagnostic_test');
        await AsyncStorage.removeItem('diagnostic_test');
        
        results.push({
          test: 'AsyncStorage',
          result: retrieved === 'test_value' ? 'pass' : 'fail',
          message: retrieved === 'test_value' ? 'Working correctly' : 'Read/write failed'
        });
      } catch (error) {
        results.push({
          test: 'AsyncStorage',
          result: 'fail',
          message: `Error: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 2: Memory availability
      try {
        const memoryTest = new Array(1000).fill('test');
        results.push({
          test: 'Memory',
          result: 'pass',
          message: 'Basic memory allocation successful',
          details: { arrayLength: memoryTest.length }
        });
      } catch (error) {
        results.push({
          test: 'Memory',
          result: 'fail',
          message: `Memory allocation failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 3: JSON parsing
      try {
        const testObj = { test: true, array: [1, 2, 3], nested: { value: 'test' } };
        const jsonString = JSON.stringify(testObj);
        const parsed = JSON.parse(jsonString);
        
        results.push({
          test: 'JSON Processing',
          result: parsed.test === true ? 'pass' : 'fail',
          message: 'JSON stringify/parse working'
        });
      } catch (error) {
        results.push({
          test: 'JSON Processing',
          result: 'fail',
          message: `JSON error: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 4: Network availability (basic)
      try {
        // Just test if fetch exists, don't actually make a request
        if (typeof fetch === 'function') {
          results.push({
            test: 'Network API',
            result: 'pass',
            message: 'Fetch API available'
          });
        } else {
          results.push({
            test: 'Network API',
            result: 'fail',
            message: 'Fetch API not available'
          });
        }
      } catch (error) {
        results.push({
          test: 'Network API',
          result: 'fail',
          message: `Network test failed: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 5: React Native APIs
      try {
        const platformInfo = {
          OS: Platform.OS,
          Version: Platform.Version,
          isPad: Platform.OS === 'ios' && 'isPad' in Platform ? (Platform as any).isPad : false,
          isTV: Platform.isTV
        };
        
        results.push({
          test: 'Platform APIs',
          result: 'pass',
          message: 'Platform information accessible',
          details: platformInfo
        });
      } catch (error) {
        results.push({
          test: 'Platform APIs',
          result: 'fail',
          message: `Platform API error: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 6: Crash detector status
      try {
        const crashData = await productionCrashDetector.getCrashData();
        results.push({
          test: 'Crash Detection',
          result: crashData.crashes.length > 0 ? 'warning' : 'pass',
          message: crashData.crashes.length > 0 
            ? `${crashData.crashes.length} previous crashes detected` 
            : 'No previous crashes',
          details: crashData.summary
        });
      } catch (error) {
        results.push({
          test: 'Crash Detection',
          result: 'fail',
          message: `Crash detector error: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Test 7: Component rendering
      try {
        // Test basic React functionality without using hooks outside component
        const isReactAvailable = typeof React !== 'undefined' && typeof React.createElement === 'function';
        if (isReactAvailable) {
          results.push({
            test: 'React Rendering',
            result: 'pass',
            message: 'React is available and functioning'
          });
        } else {
          results.push({
            test: 'React Rendering',
            result: 'fail',
            message: 'React is not properly available'
          });
        }
      } catch (error) {
        results.push({
          test: 'React Rendering',
          result: 'fail',
          message: `React error: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      setDiagnostics(results);
      
      // Log results for debugging
      console.log('🔍 APK Diagnostics completed:', results);
      
      // If there are failures, show the panel
      if (results.some(r => r.result === 'fail')) {
        setIsVisible(true);
      }

    } catch (error) {
      console.error('Diagnostics failed:', error);
      setDiagnostics([{
        test: 'Diagnostic System',
        result: 'fail',
        message: `Diagnostic system crashed: ${error instanceof Error ? error.message : String(error)}`
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const exportDiagnostics = async () => {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        platform: `${Platform.OS} ${Platform.Version}`,
        buildType: __DEV__ ? 'development' : 'production',
        diagnostics: diagnostics,
        crashData: await productionCrashDetector.getCrashData()
      };

      const reportText = JSON.stringify(report, null, 2);
      console.log('📋 Diagnostic Report:', reportText);
      
      Alert.alert(
        'Diagnostic Report',
        'Report has been logged to console. In a production app, this would be exported or shared.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', `Failed to export diagnostics: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Don't render if not enabled or not on Android
  if (Platform.OS !== 'android' || !isComponentEnabled) {
    return null;
  }

  const failedTests = diagnostics.filter(d => d.result === 'fail').length;
  const warningTests = diagnostics.filter(d => d.result === 'warning').length;
  const passedTests = diagnostics.filter(d => d.result === 'pass').length;

  const getStatusColor = () => {
    if (failedTests > 0) return '#F44336';
    if (warningTests > 0) return '#FF9800';
    return '#4CAF50';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.statusButton, { backgroundColor: getStatusColor() }]}
        onPress={() => {
          try {
            console.log('🔧 APK diagnostics toggle clicked');
            setIsVisible(!isVisible);
          } catch (error) {
            console.error('❌ APK diagnostics toggle failed:', error);
          }
        }}
      >
        <Text style={styles.statusText}>
          🔧 {failedTests > 0 ? `${failedTests} Fail` : passedTests > 0 ? `${passedTests} Pass` : 'Test'}
        </Text>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>APK Diagnostics</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity 
              style={[styles.button, isRunning && styles.buttonDisabled]} 
              onPress={runDiagnostics}
              disabled={isRunning}
            >
              <Text style={styles.buttonText}>
                {isRunning ? '⏳ Running...' : '🔄 Run Tests'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={exportDiagnostics}>
              <Text style={styles.buttonText}>📤 Export</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsList}>
            {diagnostics.length === 0 ? (
              <Text style={styles.noResults}>No diagnostics run yet</Text>
            ) : (
              diagnostics.map((diagnostic, index) => (
                <View key={index} style={[
                  styles.resultItem,
                  diagnostic.result === 'fail' && styles.resultFail,
                  diagnostic.result === 'warning' && styles.resultWarning,
                  diagnostic.result === 'pass' && styles.resultPass
                ]}>
                  <Text style={styles.resultTest}>{diagnostic.test}</Text>
                  <Text style={styles.resultMessage}>{diagnostic.message}</Text>
                  {diagnostic.details && (
                    <Text style={styles.resultDetails}>
                      {JSON.stringify(diagnostic.details, null, 2)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 10,
    zIndex: 9998,
  },
  statusButton: {
    padding: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  panel: {
    position: 'absolute',
    top: 40,
    right: 0,
    width: 350,
    maxHeight: 500,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 20,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  resultsList: {
    maxHeight: 300,
    padding: 10,
  },
  noResults: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  resultItem: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
  },
  resultPass: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4CAF50',
  },
  resultWarning: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#FF9800',
  },
  resultFail: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#F44336',
  },
  resultTest: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultMessage: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  resultDetails: {
    fontSize: 10,
    color: '#888',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
