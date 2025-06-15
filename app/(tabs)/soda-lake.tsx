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
import { WindChart } from '@/components/WindChart';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useThemeColor } from '@/hooks/useThemeColor';
import { getWindChartTimeWindow } from '@/utils/timeWindowUtils';

export default function SodaLakeScreen() {
  const {
    windData,
    chartData,
    analysis,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    clearCache
  } = useSodaLakeWind();

  // Add weather data hook for prediction validation
  const { validatePastPredictions } = useWeatherData();

  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Auto-refresh data when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🏔️ Soda Lake tab focused - refreshing data...');
      refreshData();
    }, [refreshData])
  );

  // Auto-validate predictions when wind data is available
  React.useEffect(() => {
    if (windData.length > 0) {
      // Check if we're past dawn patrol time (8 AM) and have wind data
      const now = new Date();
      const eightAM = new Date();
      eightAM.setHours(8, 0, 0, 0);
      
      if (now > eightAM) {
        // Convert wind data for validation
        const validationData = windData.map(point => ({
          time: new Date(point.time),
          windSpeedMph: point.windSpeedMph,
          windDirection: point.windDirection
        }));
        
        // Validate predictions in the background
        validatePastPredictions(validationData)
          .then(result => {
            if (result) {
              console.log('📊 Prediction validation completed:', result);
            }
          })
          .catch(error => {
            console.error('❌ Prediction validation failed:', error);
          });
      }
    }
  }, [windData, validatePastPredictions]);

  const handleRefresh = async () => {
    await refreshData();
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCurrentWindSpeed = () => {
    if (windData.length === 0) return null;
    const latest = windData[windData.length - 1];
    return latest.windSpeedMph;
  };

  const getCurrentWindDirection = () => {
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
    if (windData.length === 0) return 'No data available';
    
    const latest = windData[windData.length - 1];
    const latestTime = new Date(latest.time);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - latestTime.getTime()) / 60000);
    
    if (diffMinutes < 30) return 'Data is current';
    if (diffMinutes < 120) return `Last reading ${diffMinutes} minutes ago`;
    
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
              <ThemedText style={styles.conditionLabel}>Data Points</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {windData.length}
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
            <WindChart
              data={chartData}
              title="Today's Wind Speed - All Data"
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

        {/* Analysis */}
        {analysis && (
          <View style={[styles.analysisCard, { backgroundColor: cardColor }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Recent Wind Analysis (Last Hour)</ThemedText>
            <ThemedText style={styles.analysisText}>
              Average Speed: {analysis.averageSpeed.toFixed(1)} mph{'\n'}
              Direction Consistency: {analysis.directionConsistency.toFixed(0)}%{'\n'}
              Consecutive Good Points: {analysis.consecutiveGoodPoints}{'\n'}
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
  analysisText: {
    fontSize: 14,
    lineHeight: 20,
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
