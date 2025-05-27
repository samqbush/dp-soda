import { crashReportExportService } from '@/services/crashReportExportService';
import { debugSettings } from '@/services/debugSettings';
import React, { useEffect, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Quick Export Button - Emergency crash report export
 * Provides immediate access to crash report export functionality
 */
export function QuickExportButton() {
  const [isEnabled, setIsEnabled] = useState(false);
  
  useEffect(() => {
    const checkVisibility = async () => {
      try {
        if (Platform.OS !== 'android') return; // Only relevant on Android
        
        // Check if this component should be shown
        const shouldShow = await debugSettings.isComponentVisible('showQuickExportButton');
        console.log('🔍 QuickExportButton visibility:', shouldShow ? 'VISIBLE' : 'HIDDEN');
        setIsEnabled(shouldShow);
      } catch (error) {
        console.error('Failed to check QuickExportButton visibility:', error);
      }
    };
    
    checkVisibility();
    
    // Subscribe to visibility changes
    const unsubscribe = debugSettings.subscribeToVisibilityChanges('showQuickExportButton', 
      (isVisible) => {
        console.log('🔄 QuickExportButton visibility changed:', isVisible ? 'VISIBLE' : 'HIDDEN');
        setIsEnabled(isVisible);
      }
    );
    
    // Check again when app returns to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkVisibility();
      }
    });
    
    return () => {
      subscription.remove();
      unsubscribe();
    };
  }, []);

  // Don't render if not enabled or not on Android
  if (Platform.OS !== 'android' || !isEnabled) {
    return null;
  }
  const handleQuickExport = async () => {
    try {
      Alert.alert(
        'Export Crash Data',
        'Choose export format:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Text Report',
            onPress: async () => {
              try {
                console.log('📤 Generating text crash report...');
                const report = await crashReportExportService.generateCrashReport();
                await crashReportExportService.exportCrashReport(report, {
                  includeUserActions: true,
                  includeSystemLogs: true,
                  includeDiagnostics: true,
                  includePerformanceMetrics: true,
                  format: 'text'
                });
                console.log('✅ Text report export completed');
              } catch (error) {
                console.error('❌ Text export failed:', error);
                Alert.alert('Export Failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          },
          {
            text: 'JSON Report',
            onPress: async () => {
              try {
                console.log('📤 Generating JSON crash report...');
                const report = await crashReportExportService.generateCrashReport();
                await crashReportExportService.exportCrashReport(report, {
                  includeUserActions: true,
                  includeSystemLogs: true,
                  includeDiagnostics: true,
                  includePerformanceMetrics: true,
                  format: 'json'
                });
                console.log('✅ JSON report export completed');
              } catch (error) {
                console.error('❌ JSON export failed:', error);
                Alert.alert('Export Failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          },
          {
            text: 'Emergency Export',
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🚨 Starting emergency export...');
                await crashReportExportService.emergencyExport();
                Alert.alert('Emergency Export', 'Complete crash data has been logged to console');
                console.log('✅ Emergency export completed');
              } catch (error) {
                console.error('❌ Emergency export failed:', error);
                Alert.alert('Export Failed', `Error: ${error instanceof Error ? error.message : String(error)}`);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Quick export initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize export');
    }
  };

  // Only one visibility check is needed
  // The duplicate check has been removed

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.exportButton}
        onPress={handleQuickExport}
      >
        <Text style={styles.exportText}>📤</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    right: 15,
    zIndex: 9999,
  },
  exportButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  exportText: {
    fontSize: 20,
    color: 'white',
  },
});
