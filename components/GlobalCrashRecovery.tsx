import { globalCrashHandler } from '@/services/globalCrashHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CrashInfo {
  message: string;
  timestamp: string;
  platform: string;
  component?: string;
  stack?: string;
}

interface CrashStatus {
  crashCount: number;
  lastCrash: CrashInfo | null;
  emergencyRecoveryTriggered: any;
}

export function GlobalCrashRecovery() {
  const [crashStatus, setCrashStatus] = useState<CrashStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkForCrashes();
  }, []);

  const checkForCrashes = async () => {
    try {
      const status = await globalCrashHandler.getCrashStatus();
      setCrashStatus(status);
      
      // Show recovery screen if there were recent crashes
      if (status.lastCrash) {
        const crashTime = new Date(status.lastCrash.timestamp);
        const timeSinceCrash = Date.now() - crashTime.getTime();
        
        // Show if crash was within last 2 minutes
        if (timeSinceCrash < 2 * 60 * 1000) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to check crash status:', error);
    }
  };

  const handleRetry = async () => {
    console.log('🔄 User requested retry after crash');
    setIsVisible(false);
    
    // Give the app a moment to stabilize
    setTimeout(() => {
      // Force a reload by clearing the crash visibility
      checkForCrashes();
    }, 1000);
  };

  const handleClearData = async () => {
    try {
      console.log('🗑️ User requested data clear after crash');
      
      // Clear all crash-related data
      await globalCrashHandler.clearCrashHistory();
      
      // Clear app data that might be causing crashes
      const keysToRemove = [
        'windData',
        'lastDataUpdate',
        'chartData',
        'userPreferences',
        'cached_wind_data'
      ];
      
      await AsyncStorage.multiRemove(keysToRemove);
      
      Alert.alert(
        'Data Cleared',
        'All data has been cleared. The app will restart fresh.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsVisible(false);
              setCrashStatus(null);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to clear data:', error);
      Alert.alert('Error', 'Failed to clear data. Please try again.');
    }
  };

  const handleReportCrash = async () => {
    if (!crashStatus?.lastCrash) return;
    
    const crashInfo = crashStatus.lastCrash;
    const report = `
Crash Report:
- Component: ${crashInfo.component || 'Unknown'}
- Message: ${crashInfo.message}
- Platform: ${crashInfo.platform}
- Time: ${crashInfo.timestamp}
- Total Crashes: ${crashStatus.crashCount}
${crashInfo.stack ? `\nStack: ${crashInfo.stack}` : ''}
    `.trim();
    
    console.log('📋 Crash Report Generated:\n', report);
    
    Alert.alert(
      'Crash Report',
      'Crash details have been logged to console. Please share this information with the developer.',
      [
        { text: 'OK' }
      ]
    );
  };

  if (!isVisible || !crashStatus?.lastCrash) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.title}>🚨 App Crash Detected</Text>
        
        <Text style={styles.subtitle}>
          The app crashed in: {crashStatus.lastCrash.component || 'Unknown Component'}
        </Text>
        
        <Text style={styles.message}>
          {crashStatus.lastCrash.message}
        </Text>
        
        <Text style={styles.stats}>
          Crashes: {crashStatus.crashCount} | Platform: {crashStatus.lastCrash.platform}
        </Text>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
            <Text style={styles.primaryButtonText}>🔄 Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowDetails(!showDetails)}>
            <Text style={styles.secondaryButtonText}>
              {showDetails ? '📋 Hide Details' : '🔍 Show Details'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showDetails && (
          <ScrollView style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Technical Details:</Text>
            <Text style={styles.detailsText}>
              Time: {new Date(crashStatus.lastCrash.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.detailsText}>
              Component: {crashStatus.lastCrash.component || 'Unknown'}
            </Text>
            <Text style={styles.detailsText}>
              Platform: {crashStatus.lastCrash.platform}
            </Text>
            {crashStatus.lastCrash.stack && (
              <>
                <Text style={styles.detailsTitle}>Stack Trace:</Text>
                <Text style={styles.stackText}>{crashStatus.lastCrash.stack}</Text>
              </>
            )}
          </ScrollView>
        )}
        
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.reportButton} onPress={handleReportCrash}>
            <Text style={styles.reportButtonText}>📋 Generate Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.dangerButton} onPress={handleClearData}>
            <Text style={styles.dangerButtonText}>🗑️ Clear All Data</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity style={styles.dismissButton} onPress={() => setIsVisible(false)}>
          <Text style={styles.dismissButtonText}>✕ Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  container: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    maxWidth: 350,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff4444',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  stats: {
    fontSize: 12,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  primaryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#444444',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  secondaryButtonText: {
    color: 'white',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 15,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  detailsText: {
    fontSize: 12,
    color: '#cccccc',
    marginBottom: 3,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  stackText: {
    fontSize: 10,
    color: '#aaaaaa',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  reportButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
    marginRight: 10,
  },
  reportButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
  dangerButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 6,
    flex: 1,
  },
  dangerButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 12,
  },
  dismissButton: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#888888',
    fontSize: 14,
  },
});
