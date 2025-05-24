import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindChart } from '@/components/WindChart';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindData } from '@/hooks/useWindData';
import React from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export function WindDataDisplay() {
  const {
    windData,
    analysis,
    verification,
    isLoading,
    error,
    lastUpdated,
    refreshData
  } = useWindData();

  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const backgroundColor = useThemeColor({}, 'background');

  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (err) {
      Alert.alert('Error', 'Failed to refresh wind data. Please try again.');
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

  if (error && !windData.length) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>Wind Conditions</ThemedText>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: tintColor }]} 
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? 'Loading...' : 'Retry'}
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
        <TouchableOpacity 
          style={[styles.refreshButton, { backgroundColor: tintColor }]} 
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <ThemedText style={styles.refreshButtonText}>
            {isLoading ? '🔄' : '↻'}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {lastUpdated && (
        <ThemedText style={styles.lastUpdated}>
          Last updated: {formatTime(lastUpdated)}
        </ThemedText>
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
  lastUpdated: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 12,
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
});
