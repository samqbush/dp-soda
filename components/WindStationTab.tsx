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
import { HeaderImage } from '@/components/HeaderImage';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindThreshold } from '@/hooks/useWindThreshold';
import { getWindChartTimeWindow } from '@/utils/timeWindowUtils';
import { WindStationData, WindStationConfig } from '@/types/windStation';
import { assessWindDirection, getWindDirectionIndicator, getWindDirectionStatusText } from '@/utils/windDirectionUtils';
import {
  formatLastUpdated,
  getCurrentWindSpeed,
  getCurrentWindDirection,
  getWindDirectionText,
  isDataStale,
  getDataFreshnessMessage
} from '@/utils/windStationUtils';

interface WindStationTabProps {
  data: WindStationData;
  config: WindStationConfig;
}

export default function WindStationTab({ data, config }: WindStationTabProps) {
  const {
    windData,
    chartData,
    currentConditions,
    analysis,
    transmissionQuality,
    isLoading,
    isLoadingCurrent,
    error,
    currentConditionsUpdated,
    refreshData,
    refreshCurrentConditions,
    clearCache
  } = data;

  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Get wind threshold for the chart's yellow line
  const { windThreshold } = useWindThreshold();

  // Track if we've loaded data initially
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = React.useState(false);

  // Only refresh data on first navigation to the tab
  useFocusEffect(
    React.useCallback(() => {
      if (!hasInitiallyLoaded) {
        console.log(`🏔️ ${config.name} tab focused for first time - loading data...`);
        refreshData();
        refreshCurrentConditions();
        setHasInitiallyLoaded(true);
      }
    }, [hasInitiallyLoaded, refreshData, refreshCurrentConditions, config.name])
  );

  const handleRefresh = async () => {
    await refreshData();
  };

  const currentWindSpeed = getCurrentWindSpeed(currentConditions, currentConditionsUpdated, windData);
  const currentWindDirection = getCurrentWindDirection(currentConditions, currentConditionsUpdated, windData);
  const dataStale = isDataStale(currentConditions, currentConditionsUpdated, windData);
  const freshnessMessage = getDataFreshnessMessage(currentConditions, currentConditionsUpdated, windData);

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
        {/* Header Image */}
        <HeaderImage 
          title={config.name}
          subtitle={config.subtitle}
        />

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
        {windData.length > 0 && dataStale && (
          <View style={styles.staleDataContainer}>
            <ThemedText style={styles.staleDataText}>
              {freshnessMessage}
            </ThemedText>
            <ThemedText style={[styles.staleDataSubtext]}>
              {config.features?.externalLink 
                ? "Station may not be reporting. Check the detailed weather data link below for current status."
                : "Station may not be reporting. Try refreshing or check back later."
              }
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
                {currentWindSpeed?.toFixed(1) || '--'} mph
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Direction</ThemedText>
              <View style={styles.windDirectionContainer}>
                <ThemedText style={styles.conditionValue}>
                  {getWindDirectionText(currentWindDirection)} ({currentWindDirection?.toFixed(0) || '--'}°)
                </ThemedText>
                {(() => {
                  const windStatus = currentWindDirection !== null ? assessWindDirection(currentWindDirection, config.idealWindDirection) : null;
                  const indicator = getWindDirectionIndicator(windStatus);
                  const statusText = getWindDirectionStatusText(windStatus);
                  
                  return indicator ? (
                    <View style={styles.windDirectionIndicator}>
                      <ThemedText style={styles.windIndicatorEmoji}>{indicator}</ThemedText>
                      <ThemedText style={styles.windIndicatorText}>{statusText}</ThemedText>
                    </View>
                  ) : null;
                })()}
              </View>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Last Updated</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {formatLastUpdated(currentConditions, currentConditionsUpdated, windData)}
              </ThemedText>
            </View>
          </View>
          {/* Data freshness message */}
          <ThemedText style={styles.freshnessMessage}>
            {freshnessMessage}
          </ThemedText>
          {/* Transmission quality indicator */}
          {config.features?.transmissionQuality && transmissionQuality && (
            <ThemedText style={styles.transmissionStatusMessage}>
              {transmissionQuality.currentTransmissionStatus === 'good' ? '📡 Full transmission' :
               transmissionQuality.currentTransmissionStatus === 'partial' ? '⚠️ Partial transmission' :
               transmissionQuality.currentTransmissionStatus === 'indoor-only' ? '📡 Indoor only' :
               '🔴 Offline'}
            </ThemedText>
          )}
        </View>

        {/* Wind Chart */}
        {chartData.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: cardColor }]}>
            <CustomWindChart
              data={chartData}
              title="Today's Wind Speed"
              timeWindow={getWindChartTimeWindow()}
              idealWindSpeed={windThreshold}
              showIdealLine={true}
              idealWindDirection={config.idealWindDirection}
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
            
            {/* Wind Direction Status for Recent Analysis */}
            {config.idealWindDirection && (() => {
              // Calculate average direction from recent chart data (last hour)
              const now = new Date();
              const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
              const recentPoints = chartData.filter(point => {
                const pointTime = new Date(point.time);
                return pointTime >= oneHourAgo;
              });
              
              if (recentPoints.length > 0) {
                // Calculate circular mean of wind directions
                let sumSin = 0, sumCos = 0;
                recentPoints.forEach(point => {
                  const dir = typeof point.windDirection === 'string' ? parseFloat(point.windDirection) : point.windDirection;
                  if (!isNaN(dir)) {
                    const radians = (dir * Math.PI) / 180;
                    sumSin += Math.sin(radians);
                    sumCos += Math.cos(radians);
                  }
                });
                
                const avgDirection = Math.atan2(sumSin, sumCos) * 180 / Math.PI;
                const normalizedDirection = avgDirection < 0 ? avgDirection + 360 : avgDirection;
                const windStatus = assessWindDirection(normalizedDirection, config.idealWindDirection);
                const indicator = getWindDirectionIndicator(windStatus);
                const statusText = getWindDirectionStatusText(windStatus);
                
                return indicator ? (
                  <View style={styles.analysisDirectionIndicator}>
                    <ThemedText style={styles.analysisDirectionText}>
                      Recent direction: {getWindDirectionText(normalizedDirection)} ({normalizedDirection.toFixed(0)}°) {indicator} {statusText}
                    </ThemedText>
                  </View>
                ) : null;
              }
              return null;
            })()}
            
            <ThemedText style={styles.analysisDescription}>
              {analysis.analysis}
            </ThemedText>
          </View>
        )}

        {/* External Data Link */}
        {config.features?.externalLink && (
          <View style={[styles.linkCard, { backgroundColor: cardColor }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Detailed Weather Data</ThemedText>
            <ThemedText style={styles.linkDescription}>
              {config.features.externalLink.description}
            </ThemedText>
            <TouchableOpacity
              style={[styles.linkButton, { borderColor: tintColor }]}
              onPress={() => Linking.openURL(config.features!.externalLink!.url)}
            >
              <ThemedText style={[styles.linkButtonText, { color: tintColor }]}>
                {config.features.externalLink.buttonText}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Transmission Quality Alerts */}
        {config.features?.transmissionQuality && transmissionQuality && transmissionQuality.currentTransmissionStatus !== 'good' && (
          <View style={styles.transmissionQualityContainer}>
            {transmissionQuality.currentTransmissionStatus === 'indoor-only' ? (
              <>
                <ThemedText style={styles.antennaWarningText}>
                  📡 Antenna Issue Detected
                </ThemedText>
                <ThemedText style={styles.antennaWarningSubtext}>
                  Station is only transmitting indoor temperature and humidity. Wind data may have gaps due to antenna transmission problems.
                </ThemedText>
                {transmissionQuality.lastGoodTransmissionTime && (
                  <ThemedText style={styles.lastGoodTransmissionText}>
                    Last complete transmission: {new Date(transmissionQuality.lastGoodTransmissionTime).toLocaleTimeString()}
                  </ThemedText>
                )}
              </>
            ) : transmissionQuality.currentTransmissionStatus === 'partial' ? (
              <>
                <ThemedText style={styles.partialWarningText}>
                  ⚠️ Partial Data Transmission
                </ThemedText>
                <ThemedText style={styles.partialWarningSubtext}>
                  Some sensors are not transmitting data. Wind readings may be incomplete.
                </ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={styles.offlineWarningText}>
                  🔴 Station Offline
                </ThemedText>
                <ThemedText style={styles.offlineWarningSubtext}>
                  No data is being received from the weather station.
                </ThemedText>
              </>
            )}
            
            {transmissionQuality.transmissionGaps && transmissionQuality.transmissionGaps.length > 0 && (
              <ThemedText style={styles.gapSummaryText}>
                {transmissionQuality.transmissionGaps.length} transmission gap{transmissionQuality.transmissionGaps.length !== 1 ? 's' : ''} detected today
              </ThemedText>
            )}
          </View>
        )}

        {/* Transmission Quality Summary */}
        {config.features?.transmissionQuality && transmissionQuality && windData.length > 0 && (
          <View style={styles.transmissionSummaryContainer}>
            <ThemedText style={styles.transmissionSummaryTitle}>
              📊 Data Quality Summary
            </ThemedText>
            
            {(!transmissionQuality.transmissionGaps || transmissionQuality.transmissionGaps.length === 0) ? (
              <ThemedText style={styles.goodQualityText}>
                ✅ Complete data transmission detected for today&apos;s wind readings. All chart data represents actual wind conditions.
              </ThemedText>
            ) : (
              <>
                <ThemedText style={styles.gapDetectedText}>
                  ⚠️ {transmissionQuality.transmissionGaps.length} transmission gap{transmissionQuality.transmissionGaps.length !== 1 ? 's' : ''} detected in today&apos;s data.
                </ThemedText>
                <ThemedText style={styles.gapExplanationText}>
                  Gaps in the wind chart below are caused by antenna transmission issues, not lack of wind. The station continues monitoring but only transmits indoor data during these periods.
                </ThemedText>
                
                {/* Show gap details */}
                {transmissionQuality.transmissionGaps.map((gap, index) => (
                  <ThemedText key={index} style={styles.gapDetailText}>
                    • {gap.type} gap: {gap.durationMinutes} min ({new Date(gap.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - {new Date(gap.endTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})
                  </ThemedText>
                ))}
              </>
            )}
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
  windDirectionContainer: {
    flexDirection: 'column',
  },
  windDirectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  windIndicatorEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  windIndicatorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
  analysisDirectionIndicator: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  analysisDirectionText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
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
  transmissionQualityContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  antennaWarningText: {
    color: '#FF9500',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  antennaWarningSubtext: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 20,
  },
  lastGoodTransmissionText: {
    fontSize: 12,
    opacity: 0.7,
    fontStyle: 'italic',
    marginTop: 4,
  },
  partialWarningText: {
    color: '#FFCC00',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  partialWarningSubtext: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  offlineWarningText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  offlineWarningSubtext: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  gapSummaryText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  transmissionStatusMessage: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
    fontWeight: '500',
  },
  transmissionSummaryContainer: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(120, 120, 128, 0.2)',
    backgroundColor: 'rgba(120, 120, 128, 0.05)',
  },
  transmissionSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1D1D1F',
  },
  goodQualityText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#34C759',
    fontWeight: '500',
  },
  gapDetectedText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#FF9500',
    fontWeight: '600',
    marginBottom: 4,
  },
  gapExplanationText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginBottom: 8,
  },
  gapDetailText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
    marginLeft: 8,
    marginBottom: 2,
    fontFamily: 'monospace',
  },
});
