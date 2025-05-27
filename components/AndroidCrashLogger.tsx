import { crashMonitor } from '@/services/crashMonitor';
import { debugSettings } from '@/services/debugSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  AppState,
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
 * Enhanced terminal logging function that prevents truncation 
 * and formats crash logs in an easy to read way
 */
const logToTerminal = (log: CrashLog) => {
  // Create a divider to make logs stand out in terminal
  const divider = '\n' + '='.repeat(80) + '\n';
  
  // Format the crash information in a readable way
  const formattedLog = [
    `${divider}`,
    `📱 ANDROID CRASH LOG - ${new Date(log.timestamp).toLocaleString()}`,
    `${divider}`,
    `🔍 CONTEXT: ${log.context}`,
    `❌ ERROR: ${log.error}`,
    log.stack ? `📚 STACK TRACE:\n${log.stack}` : '📚 STACK TRACE: None',
    `🛠️ BUILD: ${log.buildType}`,
    `📱 DEVICE: ${log.deviceInfo.platform} ${log.deviceInfo.version}`,
    `${divider}`
  ].join('\n');
  
  // Log to console with special formatting to make it stand out
  console.log(formattedLog);
  
  return formattedLog;
};

/**
 * Android Crash Logger - Helps debug crashes in Expo Go and production APKs
 * This component collects crash information and provides debugging tools
 * Only visible when enabled through Developer Mode settings
 */
export function AndroidCrashLogger() {
  const [crashLogs, setCrashLogs] = useState<CrashLog[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isComponentEnabled, setIsComponentEnabled] = useState(false);
  const [appState, setAppState] = useState<'loading' | 'ready' | 'crashed'>('loading');

  // Single unified useEffect for both visibility checking and initialization
  useEffect(() => {
    // Only relevant on Android
    if (Platform.OS !== 'android') return;

    const checkVisibilityAndInit = async () => {
      try {
        // Check if this component should be shown
        const shouldShow = await debugSettings.isComponentVisible('showAndroidCrashLogger');
        console.log('🔍 AndroidCrashLogger visibility:', shouldShow ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(shouldShow);
        
        // Only initialize if component should be shown
        if (shouldShow) {
          await initializeCrashLogger();
        }
      } catch (error) {
        console.error('Failed to check AndroidCrashLogger visibility:', error);
      }
    };
    
    checkVisibilityAndInit();
    
    // Subscribe to visibility changes
    const unsubscribe = debugSettings.subscribeToVisibilityChanges('showAndroidCrashLogger', 
      async (isVisible) => {
        console.log('🔄 AndroidCrashLogger visibility changed:', isVisible ? 'VISIBLE' : 'HIDDEN');
        setIsComponentEnabled(isVisible);
        
        if (isVisible) {
          await initializeCrashLogger();
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
  }, []);

  const initializeCrashLogger = async () => {
    try {
      console.log('🔍 Initializing Android Crash Logger');
      // Load existing crash logs
      const stored = await AsyncStorage.getItem('android_crash_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        setCrashLogs(parsedLogs);
        
        // Print any recent crashes to terminal on startup
        if (parsedLogs.length > 0) {
          console.log(`📱 Found ${parsedLogs.length} existing crash logs. Most recent:`);
          logToTerminal(parsedLogs[0]);
        }
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
      // Always log to terminal in a formatted way first (won't be truncated)
      logToTerminal(crashLog);
      
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

      // Log complete data to terminal
      console.log('\n📋 COMPLETE ANDROID CRASH LOG EXPORT:');
      console.log(JSON.stringify(logData, null, 2));
      
      const content = JSON.stringify(logData, null, 2);
      
      await Share.share({
        message: content,
        title: 'Android Crash Logs'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Add function to print all logs to terminal
  const printAllLogsToTerminal = () => {
    if (crashLogs.length === 0) {
      console.log('📱 No crash logs to display');
      return;
    }
    
    console.log(`\n📱 PRINTING ALL CRASH LOGS (${crashLogs.length}):`);
    crashLogs.forEach((log, index) => {
      console.log(`\nLOG #${index + 1} of ${crashLogs.length}:`);
      logToTerminal(log);
    });
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
  
  // Don't render if not enabled or not on Android
  if (Platform.OS !== 'android' || !isComponentEnabled) {
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
            <TouchableOpacity style={styles.button} onPress={printAllLogsToTerminal}>
              <Text style={styles.buttonText}>📝 Print to Terminal</Text>
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
    gap: 5, // Reduced gap to fit 3 buttons
  },
  button: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 8, // Slightly smaller padding to fit 3 buttons
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
