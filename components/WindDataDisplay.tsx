import { DataCrashDetector } from '@/components/DataCrashDetector';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindChart } from '@/components/WindChart';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindData } from '@/hooks/useWindData';
import { crashMonitor } from '@/services/crashMonitor';
import { showDiagnosticInfo } from '@/services/diagnosticService';
import { globalCrashHandler } from '@/services/globalCrashHandler';
import { productionCrashDetector } from '@/services/productionCrashDetector';
import React, { useEffect } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export function WindDataDisplay() {
  useEffect(() => {
    console.log('🌊 WindDataDisplay mounted');
    productionCrashDetector.logUserAction('wind_data_display_loaded');
  }, []);

  const handleCrash = async (error: Error, info: any) => {
    console.error('🚨 WindDataDisplay crashed:', error);
    console.error('🚨 Crash info:', info);
    
    // Log crash details to both systems
    await crashMonitor.logCrash('WindDataDisplay', error);
    await globalCrashHandler.reportTestCrash('WindDataDisplay', error.message);
    
    // Show crash details in diagnostic
    const summary = crashMonitor.getCrashSummary();
    console.log('📊 Crash summary after WindDataDisplay crash:', summary);
  };

  return (
    <DataCrashDetector componentName="WindDataDisplay" onCrash={handleCrash}>
      <WindDataDisplayContent />
    </DataCrashDetector>
  );
}

function WindDataDisplayContent() {
  console.log('🌊 WindDataDisplayContent rendering...');

  const {
    windData,
    analysis,
    verification,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    fetchRealData,
    criteria
  } = useWindData();

  console.log('🌊 WindDataDisplayContent - useWindData result:', {
    hasData: !!windData,
    isLoading,
    hasError: !!error,
    lastUpdated
  });

  // const textColor = useThemeColor({}, 'text'); // Removed unused variable
  const tintColor = useThemeColor({}, 'tint');
  // Remove unused backgroundColor for now
  // const backgroundColor = useThemeColor({}, 'background');

  const handleRefresh = async () => {
    try {
      productionCrashDetector.logUserAction('wind_data_refresh_requested');
      await refreshData();
      productionCrashDetector.logUserAction('wind_data_refresh_completed');
    } catch (err) {
      console.error('Refresh failed:', err);
      productionCrashDetector.logUserAction('wind_data_refresh_failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert('Error', 'Failed to refresh wind data. Please try again.');
    }
  };

  const handleFetchRealData = async () => {
    try {
      productionCrashDetector.logUserAction('real_data_fetch_requested');
      await fetchRealData();
      productionCrashDetector.logUserAction('real_data_fetch_completed');
    } catch (err) {
      console.error('Fetch real data failed:', err);
      productionCrashDetector.logUserAction('real_data_fetch_failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert(
        'Error', 
        'Failed to fetch real data. This may be due to CORS restrictions in web environment or network issues.'
      );
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAlarmStatusColor = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? '#4CAF50' : '#FF9800';
  };

  const getAlarmStatusText = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? 'WAKE UP! 🌊' : 'Sleep In 😴';
  };

  // Show loading screen when initially loading and no data
  if (isLoading && !windData.length && !error) {
    return <LoadingScreen message="Loading wind data..." />;
  }

  // Fallback to sample data if there's an error and no data
  if (error && !windData.length) {
    console.log('💥 Error without data, displaying error screen:', error);
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>Wind Conditions</ThemedText>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <ThemedText style={styles.debugText}>
            Debug Info:{'\n'}
            • Data points: {windData.length}{'\n'}
            • Loading: {isLoading ? 'Yes' : 'No'}{'\n'}
            • Last updated: {lastUpdated ? formatTime(lastUpdated) : 'Never'}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: tintColor }]} 
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? 'Loading...' : 'Retry'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: '#4CAF50', marginTop: 8 }]} 
            onPress={handleFetchRealData}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              Use Sample Data
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          Bear Creek Lake Wind
        </ThemedText>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: tintColor }]} 
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? '🔄' : '↻'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.realDataButton, { backgroundColor: '#4CAF50' }]} 
            onPress={handleFetchRealData}
            disabled={isLoading}
          >
            <ThemedText style={styles.realDataButtonText}>
              📡 Real Data
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {lastUpdated && (
        <View style={styles.statusRow}>
          <ThemedText style={styles.lastUpdated}>
            Last updated: {formatTime(lastUpdated)}
          </ThemedText>
          {criteria?.alarmEnabled && (
            <View style={styles.alarmIndicator}>
              <ThemedText style={styles.alarmIndicatorText}>⏰ {criteria.alarmTime}</ThemedText>
            </View>
          )}
        </View>
      )}

      {analysis && (
        <View style={styles.analysisContainer}>
          <View style={[
            styles.alarmStatus, 
            { backgroundColor: getAlarmStatusColor(analysis.isAlarmWorthy) }
          ]}>
            <ThemedText style={styles.alarmStatusText}>
              {getAlarmStatusText(analysis.isAlarmWorthy)}
            </ThemedText>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.averageSpeed.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>mph avg</ThemedText>
            </View>

            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.directionConsistency.toFixed(0)}%
              </ThemedText>
              <ThemedText style={styles.metricLabel}>consistent</ThemedText>
            </View>

            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.consecutiveGoodPoints}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>good points</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.analysisText}>
            {analysis.analysis}
          </ThemedText>
        </View>
      )}

      {verification && (
        <View style={styles.verificationContainer}>
          <ThemedText type="defaultSemiBold" style={styles.verificationTitle}>
            6-8am Verification:
          </ThemedText>
          <ThemedText style={styles.verificationText}>
            Avg: {verification.averageSpeed.toFixed(1)}mph, 
            Consistency: {verification.directionConsistency.toFixed(0)}%
          </ThemedText>
          <ThemedText style={styles.verificationStatus}>
            {verification.isAlarmWorthy ? '✅ Conditions confirmed' : '❌ Conditions changed'}
          </ThemedText>
        </View>
      )}

      {windData.length > 0 && (
        <WindChart data={windData} title="12-Hour Wind Trend" />
      )}

      {windData.length > 0 && (
        <View style={styles.dataInfo}>
          <ThemedText style={styles.dataInfoText}>
            📊 {windData.length} data points (24h)
          </ThemedText>
        </View>
      )}

      {error && (
        <ThemedText style={styles.errorText}>
          ⚠️ {error} (showing cached data)
        </ThemedText>
      )}
      
      {/* Diagnostics button - only show in development or if there are errors */}
      {(__DEV__ || error) && (
        <TouchableOpacity 
          style={styles.diagnosticButton} 
          onPress={showDiagnosticInfo}
        >
          <ThemedText style={styles.diagnosticButtonText}>
            📊 Run Diagnostics
          </ThemedText>
        </TouchableOpacity>
      )}
      
      {/* Dev info - only in development builds */}
      {__DEV__ && (
        <View style={styles.devInfo}>
          <ThemedText style={styles.devInfoText}>
            Platform: {Platform.OS} {Platform.Version}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  realDataButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  realDataButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastUpdated: {
    fontSize: 12,
    opacity: 0.7,
  },
  alarmIndicator: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alarmIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  analysisContainer: {
    marginVertical: 8,
  },
  alarmStatus: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmStatusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  analysisText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  verificationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  verificationTitle: {
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  verificationStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  dataInfoText: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugText: {
    color: '#FF9800',
    textAlign: 'left',
    fontSize: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 8,
    borderRadius: 4,
  },
  diagnosticButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  diagnosticButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  devInfo: {
    marginTop: 12,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
    alignSelf: 'center',
  },
  devInfoText: {
    fontSize: 10,
    opacity: 0.6,
  },
});
