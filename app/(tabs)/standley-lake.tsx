import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindChart } from '@/components/WindChart';
import { useStandleyLakeWind } from '@/hooks/useStandleyLakeWind';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getWindChartTimeWindow } from '@/utils/timeWindowUtils';
import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export default function StandleyLakeScreen() {
  const {
    windData,
    chartData,
    currentConditions,
    analysis,
    isLoading,
    isLoadingCurrent,
    error,
    lastUpdated,
    currentConditionsUpdated,
    refreshData,
    refreshCurrentConditions,
    clearCache
  } = useStandleyLakeWind();

  // const textColor = useThemeColor({}, 'text'); // Currently unused
  // const backgroundColor = useThemeColor({}, 'background'); // Currently unused
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Auto-refresh data when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🏔️ Standley Lake tab focused - refreshing data...');
      refreshData();
      // Also refresh current conditions separately for faster updates
      refreshCurrentConditions();
    }, [refreshData, refreshCurrentConditions])
  );

  const handleRefresh = async () => {
    await refreshData();
  };

  // Helper functions for current conditions
  const getCurrentWindSpeed = () => {
    return currentConditions?.windSpeed ? 
      currentConditions.windSpeed * 2.237 : // Convert m/s to mph, return number
      null;
  };

  const getCurrentWindDirection = () => {
    return currentConditions?.windDirection;
  };

  const getWindDirectionText = (degrees: number | undefined): string => {
    if (degrees === undefined || degrees === null) return '--';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const formatCurrentConditionsUpdated = () => {
    if (!currentConditionsUpdated) return 'Never';
    return currentConditionsUpdated.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  // Check if data is stale (no data in last 2 hours)
  const isDataStale = () => {
    if (windData.length === 0) return true;
    
    const latest = windData[windData.length - 1];
    const latestTime = new Date(latest.time);
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    return latestTime < twoHoursAgo;
  };

  const getDataFreshnessMessage = () => {
    if (!currentConditions || !currentConditionsUpdated) {
      return 'Real-time data unavailable';
    }
    
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - currentConditionsUpdated.getTime()) / 60000);
    
    if (diffMinutes < 5) return '🟢 Real-time data current';
    if (diffMinutes < 15) return '🟡 Real-time data slightly delayed';
    return '🔴 Real-time data may be stale';
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={tintColor}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <ThemedText type="title">Standley Lake Wind Monitor</ThemedText>
            <ThemedText style={styles.subtitle}>Real-time wind conditions</ThemedText>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <ThemedText style={[styles.retryButtonText, { color: tintColor }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Updating wind data...</ThemedText>
          </View>
        )}

        {/* Data Freshness Alert */}
        {windData.length > 0 && isDataStale() && (
          <View style={styles.staleDataContainer}>
            <ThemedText style={styles.staleDataText}>
              {getDataFreshnessMessage()}
            </ThemedText>
            <ThemedText style={[styles.staleDataSubtext]}>
              Station may not be reporting. Try refreshing or check back later.
            </ThemedText>
          </View>
        )}

        {/* Current Conditions */}
        <View style={[styles.currentConditionsCard, { backgroundColor: cardColor }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Current Conditions</ThemedText>
            <TouchableOpacity
              style={[styles.refreshButton, { borderColor: tintColor }]}
              onPress={refreshCurrentConditions}
              disabled={isLoadingCurrent}
            >
              <ThemedText style={[styles.refreshButtonText, { color: tintColor }]}>
                {isLoadingCurrent ? '⏳' : '🔄'}
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={styles.currentConditionsGrid}>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Wind Speed</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getCurrentWindSpeed()?.toFixed(1) || '--'} mph
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Direction</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getWindDirectionText(getCurrentWindDirection())} ({getCurrentWindDirection()?.toFixed(0) || '--'}°)
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Last Updated</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {formatCurrentConditionsUpdated()}
              </ThemedText>
            </View>
          </View>
          {/* Data freshness message */}
          <ThemedText style={styles.freshnessMessage}>
            {getDataFreshnessMessage()}
          </ThemedText>
        </View>

        {/* Wind Chart */}
        {chartData.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: cardColor }]}>
            <WindChart
              data={chartData}
              title="Today's Wind Speed"
              timeWindow={getWindChartTimeWindow()}
            />
          </View>
        ) : (
          <View style={[styles.noDataCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.noDataText}>
              No wind data available for today. Pull to refresh.
            </ThemedText>
          </View>
        )}

        {/* Historic Data Points */}
        {windData.length > 0 && (
          <View style={[styles.dataPointsCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.dataPointsText}>
              Historic Data Points: {windData.length}
            </ThemedText>
          </View>
        )}

        {/* Recent Wind Analysis */}
        {analysis && (
          <View style={[styles.analysisCard, { backgroundColor: cardColor }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Recent Wind Analysis (Last Hour)</ThemedText>
            <View style={styles.analysisGrid}>
              <View style={styles.analysisItem}>
                <ThemedText style={styles.analysisValue}>
                  {analysis.averageSpeed.toFixed(1)} mph
                </ThemedText>
                <ThemedText style={styles.analysisLabel}>Avg Speed</ThemedText>
              </View>
              <View style={styles.analysisItem}>
                <ThemedText style={styles.analysisValue}>
                  {analysis.directionConsistency.toFixed(0)}%
                </ThemedText>
                <ThemedText style={styles.analysisLabel}>Direction Consistency</ThemedText>
              </View>
              <View style={styles.analysisItem}>
                <ThemedText style={styles.analysisValue}>
                  {analysis.consecutiveGoodPoints}
                </ThemedText>
                <ThemedText style={styles.analysisLabel}>Good Points</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.analysisDescription}>
              {analysis.analysis}
            </ThemedText>
          </View>
        )}

        {/* Debug Actions */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <TouchableOpacity
              style={[styles.debugButton, { borderColor: tintColor }]}
              onPress={clearCache}
            >
              <ThemedText style={[styles.debugButtonText, { color: tintColor }]}>
                Clear Cache
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.debugButton, { borderColor: tintColor, marginTop: 8 }]}
              onPress={refreshCurrentConditions}
            >
              <ThemedText style={[styles.debugButtonText, { color: tintColor }]}>
                Test Real-Time API
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  currentConditionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  currentConditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  conditionItem: {
    width: '48%',
    marginBottom: 12,
  },
  conditionLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartCard: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dataPointsCard: {
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dataPointsText: {
    fontSize: 14,
    opacity: 0.8,
  },
  noDataCard: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  analysisCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  analysisGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  analysisItem: {
    alignItems: 'center',
    flex: 1,
  },
  analysisValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  analysisLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  analysisDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.3)',
  },
  debugContainer: {
    margin: 16,
    paddingBottom: 32,
  },
  debugButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
  },
  staleDataContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 149, 0, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  staleDataText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  staleDataSubtext: {
    fontSize: 14,
    opacity: 0.8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  freshnessMessage: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 12,
    textAlign: 'center',
  },
});
