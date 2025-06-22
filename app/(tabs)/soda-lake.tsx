import React from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { CustomWindChart } from '@/components/CustomWindChart';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getWindChartTimeWindow } from '@/utils/timeWindowUtils';

export default function SodaLakeScreen() {
  const {
    windData,
    chartData,
    currentConditions,
    analysis,
    isLoading,
    isLoadingCurrent,
    error,
    currentConditionsUpdated,
    refreshData,
    refreshCurrentConditions,
    clearCache
  } = useSodaLakeWind();

  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Track if we've loaded data initially
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);

  // Only refresh data on first navigation to the tab
  useFocusEffect(
    React.useCallback(() => {
      if (!hasInitiallyLoaded) {
        console.log('🏔️ Soda Lake tab focused for first time - loading data...');
        refreshData();
        refreshCurrentConditions();
        setHasInitiallyLoaded(true);
      }
    }, [hasInitiallyLoaded, refreshData, refreshCurrentConditions])
  );

  const handleRefresh = async () => {
    await refreshData();
  };

  const formatLastUpdated = () => {
    // Prioritize real-time data timestamp if available
    if (currentConditions && currentConditionsUpdated) {
      return currentConditionsUpdated.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    // Fall back to latest historical data timestamp
    if (windData.length > 0) {
      const latest = windData[windData.length - 1];
      const latestTime = new Date(latest.time);
      return latestTime.toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return 'Never';
  };

  const getCurrentWindSpeed = () => {
    // Use real-time data if available and recent (within 10 minutes)
    if (currentConditions && currentConditionsUpdated) {
      const age = Date.now() - currentConditionsUpdated.getTime();
      if (age < 10 * 60 * 1000) { // 10 minutes
        return currentConditions.windSpeedMph;
      }
    }
    
    // Fall back to latest historical data
    if (windData.length === 0) return null;
    const latest = windData[windData.length - 1];
    return latest.windSpeedMph;
  };

  const getCurrentWindDirection = () => {
    // Use real-time data if available and recent (within 10 minutes)
    if (currentConditions && currentConditionsUpdated) {
      const age = Date.now() - currentConditionsUpdated.getTime();
      if (age < 10 * 60 * 1000) { // 10 minutes
        return currentConditions.windDirection;
      }
    }
    
    // Fall back to latest historical data
    if (windData.length === 0) return null;
    const latest = windData[windData.length - 1];
    return latest.windDirection;
  };

  const getWindDirectionText = (degrees: number | null) => {
    if (degrees === null) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  // Check if data is stale - prioritize real-time data for current conditions
  const isDataStale = () => {
    // Check real-time data first - if we have recent real-time data, consider it fresh
    if (currentConditions && currentConditionsUpdated) {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      if (currentConditionsUpdated > thirtyMinutesAgo) {
        return false; // Real-time data is fresh
      }
    }
    
    // If no real-time data, check historical data  
    if (windData.length === 0) return true;
    
    const latest = windData[windData.length - 1];
    const latestTime = new Date(latest.time);
    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    // Consider historical data fresh if it's within 30 minutes
    return latestTime < thirtyMinutesAgo;
  };

  const getDataFreshnessMessage = () => {
    // Check real-time data first
    if (currentConditions && currentConditionsUpdated) {
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - currentConditionsUpdated.getTime()) / 60000);
      
      if (diffMinutes === 0) return 'Real-time data current';
      if (diffMinutes < 5) return `Real-time data from ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffMinutes < 30) return `Real-time data from ${diffMinutes} minutes ago`;
    }
    
    // Fall back to historical data messaging
    if (windData.length === 0) return 'No data available';
    
    const latest = windData[windData.length - 1];
    const latestTime = new Date(latest.time);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - latestTime.getTime()) / 60000);
    
    if (diffMinutes < 30) return 'Historical data is current';
    if (diffMinutes < 120) return `Last historical reading ${diffMinutes} minutes ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `⚠️ Station may be offline - last reading ${diffHours} hours ago`;
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
            <ThemedText type="title">Soda Lake</ThemedText>
            <ThemedText style={styles.subtitle}>Ecowitt monitor located at the head of the lake</ThemedText>
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

        {isLoadingCurrent && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={tintColor} />
            <ThemedText style={styles.loadingText}>Updating current conditions...</ThemedText>
          </View>
        )}

        {/* Data Freshness Alert */}
        {windData.length > 0 && isDataStale() && (
          <View style={styles.staleDataContainer}>
            <ThemedText style={styles.staleDataText}>
              {getDataFreshnessMessage()}
            </ThemedText>
            <ThemedText style={[styles.staleDataSubtext]}>
              Station may not be reporting. Check the detailed weather data link below for current status.
            </ThemedText>
          </View>
        )}

        {/* Current Conditions */}
        <View style={[styles.currentConditionsCard, { backgroundColor: cardColor }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Current Conditions</ThemedText>
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
                {formatLastUpdated()}
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
            <CustomWindChart
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

        {/* Detailed Weather Data Link */}
        <View style={[styles.linkCard, { backgroundColor: cardColor }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Detailed Weather Data</ThemedText>
          <ThemedText style={styles.linkDescription}>
            For more detailed wind analysis and historical data, visit the Ecowitt weather station page:
          </ThemedText>
          <TouchableOpacity
            style={[styles.linkButton, { borderColor: tintColor }]}
            onPress={() => Linking.openURL('https://www.ecowitt.net/home/share?authorize=9S85P3')}
          >
            <ThemedText style={[styles.linkButtonText, { color: tintColor }]}>
              📊 View Detailed Weather Data
            </ThemedText>
          </TouchableOpacity>
        </View>

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
  freshnessMessage: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
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
  linkCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  linkDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  linkButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
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
});
