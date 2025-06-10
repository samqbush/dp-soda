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
import React, { useCallback, useEffect } from 'react';
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
  } = useWindData();

  console.log('🌊 WindDataDisplayContent - useWindData result:', {
    hasData: !!windData && windData.length > 0,
    dataLength: windData?.length || 0,
    isLoading,
    hasError: !!error,
    lastUpdated,
  });

  const tintColor = useThemeColor({}, 'tint');

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

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAlarmStatusColor = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? '#28a745' : '#dc3545';
  };

  const getAlarmStatusText = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? 'Wake Up! 🌊' : 'Sleep In 😴';
  };

  const handleDiagnosticPress = () => {
    showDiagnosticInfo();
  };

  // Show loading screen while data is being fetched
  if (isLoading && (!windData || windData.length === 0)) {
    return <LoadingScreen message="Loading wind data..." />;
  }

  // Show error state
  if (error && (!windData || windData.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          ❌ Error loading wind data: {error}
        </ThemedText>
        <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleRefresh}>
          <ThemedText style={styles.buttonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Show no data state
  if (!windData || windData.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.noDataText}>
          📊 No wind data available
        </ThemedText>
        <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleRefresh}>
          <ThemedText style={styles.buttonText}>Load Data</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Wind Analysis Status */}
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
                {analysis.averageSpeed.toFixed(1)} mph
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Average Speed</ThemedText>
            </View>
            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.directionConsistency.toFixed(1)}%
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Consistency</ThemedText>
            </View>
            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.consecutiveGoodPoints}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>Good Points</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.analysisText}>
            {analysis.analysis}
          </ThemedText>
        </View>
      )}

      {/* Verification Section */}
      {verification && (
        <View style={styles.verificationContainer}>
          <ThemedText style={styles.verificationTitle}>
            🔍 Verification (6am-8am)
          </ThemedText>
          <ThemedText style={styles.verificationText}>
            Speed: {verification.averageSpeed.toFixed(1)} mph | 
            Consistency: {verification.directionConsistency.toFixed(1)}% | 
            Good Points: {verification.consecutiveGoodPoints}
          </ThemedText>
          <ThemedText style={styles.verificationAnalysis}>
            {verification.analysis}
          </ThemedText>
        </View>
      )}

      {/* Wind Chart */}
      <View style={styles.chartContainer}>
        <ThemedText style={styles.chartTitle}>🌪️ Wind Trend (Last 10 Hours)</ThemedText>
        <WindChart data={windData.slice(-40)} /> {/* Show last 40 points (10 hours) */}
      </View>

      {/* Data Management Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: tintColor }]} 
          onPress={handleRefresh}
        >
          <ThemedText style={styles.buttonText}>🔄 Refresh Data</ThemedText>
        </TouchableOpacity>

        {Platform.OS !== 'web' && (
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: '#6c757d' }]} 
            onPress={handleFetchRealData}
          >
            <ThemedText style={styles.buttonText}>📡 Fetch Real Data</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Data Info */}
      <View style={styles.dataInfoContainer}>
        <ThemedText style={styles.dataInfoText}>
          📈 Data Points: {windData.length}
        </ThemedText>
        {lastUpdated && (
          <ThemedText style={styles.dataInfoText}>
            🕒 Last Updated: {formatTime(lastUpdated)}
          </ThemedText>
        )}
      </View>

      {/* Diagnostic Button (Development) */}
      {__DEV__ && (
        <TouchableOpacity 
          style={[styles.diagnosticButton, { borderColor: tintColor }]} 
          onPress={handleDiagnosticPress}
        >
          <ThemedText style={[styles.diagnosticButtonText, { color: tintColor }]}>
            🔍 Diagnostic Info
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  analysisContainer: {
    marginBottom: 16,
  },
  alarmStatus: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  alarmStatusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  analysisText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
    fontStyle: 'italic',
  },
  verificationContainer: {
    padding: 16,
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 123, 255, 0.2)',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007bff',
  },
  verificationText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#007bff',
  },
  verificationAnalysis: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#007bff',
    opacity: 0.8,
  },
  chartContainer: {
    marginVertical: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 8,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  dataInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  dataInfoText: {
    fontSize: 12,
    opacity: 0.7,
  },
  diagnosticButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  diagnosticButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    color: '#dc3545',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.7,
  },
});
