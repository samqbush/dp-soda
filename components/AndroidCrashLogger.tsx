import { crashMonitor } from '@/services/crashMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface CrashLog {
  timestamp: string;
  error: string;
  stack?: string;
  context: string;
  buildType: 'development' | 'production';
  deviceInfo: {
    platform: string;
    version: string;
    model?: string;
  };
}

/**
 * Android Crash Logger - Helps debug crashes in Expo Go and production APKs
 * This component collects crash information and provides debugging tools
 * Available in both development (Expo Go) and production builds
 */
export function AndroidCrashLogger() {
  const [crashLogs, setCrashLogs] = useState<CrashLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [appState, setAppState] = useState<'loading' | 'ready' | 'crashed'>('loading');

  useEffect(() => {
    // Show on Android (both Expo Go and production APKs)
    if (Platform.OS !== 'android') return;

    initializeCrashLogger();
  }, []);

  const initializeCrashLogger = async () => {
    try {
      // Load existing crash logs
      const stored = await AsyncStorage.getItem('android_crash_logs');
      if (stored) {
        setCrashLogs(JSON.parse(stored));
      }

      // Set up crash detection
      setupCrashDetection();
      
      // Mark app as ready after a short delay
      setTimeout(() => {
        setAppState('ready');
      }, 2000);

    } catch (error) {
      console.error('Failed to initialize crash logger:', error);
      logCrash('initialization', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const setupCrashDetection = () => {
    // Monitor console errors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      
      const errorMessage = args.join(' ');
      if (errorMessage.includes('ReferenceError') || 
          errorMessage.includes('TypeError') || 
          errorMessage.includes('SyntaxError') ||
          errorMessage.includes('RangeError')) {
        logCrash('console_error', new Error(errorMessage));
      }
    };

    // Monitor unhandled promise rejections
    if (global.addEventListener) {
      global.addEventListener('unhandledrejection', (event) => {
        logCrash('promise_rejection', new Error(`Unhandled Promise: ${event.reason}`));
      });
    }
  };

  const logCrash = async (context: string, error: Error) => {
    const crashLog: CrashLog = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context,
      buildType: __DEV__ ? 'development' : 'production',
      deviceInfo: {
        platform: Platform.OS,
        version: String(Platform.Version),
      }
    };

    try {
      const updatedLogs = [crashLog, ...crashLogs].slice(0, 20); // Keep last 20 crashes
      setCrashLogs(updatedLogs);
      await AsyncStorage.setItem('android_crash_logs', JSON.stringify(updatedLogs));
      
      // Also log to crash monitor
      await crashMonitor.logCrash(context, error);
      
      setAppState('crashed');
    } catch (saveError) {
      console.error('Failed to save crash log:', saveError);
    }
  };

  const clearLogs = async () => {
    try {
      await AsyncStorage.removeItem('android_crash_logs');
      setCrashLogs([]);
      Alert.alert('Success', 'Crash logs cleared');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear logs: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const exportLogs = async () => {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        appState,
        totalCrashes: crashLogs.length,
        logs: crashLogs
      };

      const content = JSON.stringify(logData, null, 2);
      
      await Share.share({
        message: content,
        title: 'Android Crash Logs'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getStatusColor = () => {
    switch (appState) {
      case 'loading': return '#FFA500';
      case 'ready': return '#4CAF50';
      case 'crashed': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusText = () => {
    switch (appState) {
      case 'loading': return '🔄 Loading';
      case 'ready': return '✅ Ready';
      case 'crashed': return '💥 Crashed';
      default: return '❓ Unknown';
    }
  };

  // Only show on Android
  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.statusButton, { backgroundColor: getStatusColor() }]}
        onPress={() => {
          try {
            console.log('🔧 Android crash logger toggle clicked');
            setIsVisible(!isVisible);
          } catch (error) {
            console.error('❌ Android crash logger toggle failed:', error);
          }
        }}
      >
        <Text style={styles.statusText}>
          {getStatusText()} ({crashLogs.length})
        </Text>
      </TouchableOpacity>

      {isVisible && (
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Android Crash Logger</Text>
            <TouchableOpacity onPress={() => setIsVisible(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.button} onPress={exportLogs}>
              <Text style={styles.buttonText}>📤 Export Logs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={clearLogs}>
              <Text style={styles.buttonText}>🗑️ Clear Logs</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.logsList}>
            {crashLogs.length === 0 ? (
              <Text style={styles.noLogs}>No crashes recorded</Text>
            ) : (
              crashLogs.map((log, index) => (
                <View key={index} style={styles.logItem}>
                  <Text style={styles.logTimestamp}>
                    {new Date(log.timestamp).toLocaleString()}
                  </Text>
                  <Text style={styles.logContext}>{log.context}</Text>
                  <Text style={styles.logError}>{log.error}</Text>
                  {log.stack && (
                    <Text style={styles.logStack} numberOfLines={3}>
                      {log.stack}
                    </Text>
                  )}
                  <Text style={styles.logBuildType}>
                    Build: {log.buildType} | {log.deviceInfo.platform} {log.deviceInfo.version}
                  </Text>
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
    top: 50,
    right: 10,
    zIndex: 9999,
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
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logsList: {
    maxHeight: 300,
    padding: 10,
  },
  noLogs: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  logItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  logTimestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  logContext: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  logError: {
    fontSize: 13,
    color: '#F44336',
    marginBottom: 5,
  },
  logStack: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 5,
  },
  logBuildType: {
    fontSize: 10,
    color: '#888',
  },
});
