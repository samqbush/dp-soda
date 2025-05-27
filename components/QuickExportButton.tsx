import { crashReportExportService } from '@/services/crashReportExportService';
import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Quick Export Button - Emergency crash report export
 * Provides immediate access to crash report export functionality
 */
export function QuickExportButton() {
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

  // Only show on Android
  if (Platform.OS !== 'android') {
    return null;
  }

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
