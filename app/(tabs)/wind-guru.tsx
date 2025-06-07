import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWeatherData } from '@/hooks/useWeatherData';

export default function WindGuruScreen() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Use the weather data hook with Phase 2 prediction engine
  const {
    weatherData,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    getTemperatureDifferential,
    getPressureTrend,
    getBasicKatabaticConditions,
    katabaticAnalysis,
  } = useWeatherData();

  // Get current analysis data
  const tempDiff = getTemperatureDifferential();
  const pressureTrend = getPressureTrend('morrison');
  const katabaticConditions = getBasicKatabaticConditions();

  // Helper functions for Phase 2 UI
  const getProbabilityColor = (probability: number): string => {
    if (probability >= 75) return '#4CAF50'; // Green
    if (probability >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getConfidenceColor = (confidence: 'low' | 'medium' | 'high'): string => {
    switch (confidence) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
    }
  };

  const getConfidenceLabel = (confidence: 'low' | 'medium' | 'high'): string => {
    return confidence.charAt(0).toUpperCase() + confidence.slice(1);
  };

  const getRecommendationText = (recommendation: 'go' | 'maybe' | 'skip'): string => {
    switch (recommendation) {
      case 'go': return 'GO! 🎯';
      case 'maybe': return 'MAYBE 🤔';
      case 'skip': return 'SKIP ❌';
    }
  };

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

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.errorContainer, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.errorTitle}>Weather Data Error</ThemedText>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: tintColor }]}
            onPress={handleRefresh}
          >
            <ThemedText style={[styles.retryButtonText, { color: 'white' }]}>
              Try Again
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
      >
        {/* Header Section */}
        <ThemedView style={[styles.headerCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.locationTitle}>Wind Guru - Morrison, CO</ThemedText>
          <ThemedText style={styles.subtitle}>Katabatic Wind Prediction</ThemedText>
          <ThemedText style={[styles.lastUpdated, { color: textColor, opacity: 0.7 }]}>
            Last updated: {formatLastUpdated()}
          </ThemedText>
        </ThemedView>

        {/* Katabatic Prediction Section - Phase 2 Enhanced */}
        <ThemedView style={[styles.predictionCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>🌤️ Katabatic Prediction</ThemedText>
          
          {katabaticAnalysis.prediction ? (
            <ThemedView style={styles.predictionDisplay}>
              <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.3 }]}>
                <ThemedView style={[
                  styles.probabilityFill, 
                  { 
                    backgroundColor: getProbabilityColor(katabaticAnalysis.prediction.probability),
                    width: `${katabaticAnalysis.prediction.probability}%` 
                  }
                ]} />
              </ThemedView>
              <ThemedText style={styles.probabilityText}>
                {katabaticAnalysis.prediction.probability}% Probability
              </ThemedText>
              <ThemedText style={[
                styles.confidenceText,
                { color: getConfidenceColor(katabaticAnalysis.prediction.confidence) }
              ]}>
                {getConfidenceLabel(katabaticAnalysis.prediction.confidence)} Confidence - {getRecommendationText(katabaticAnalysis.prediction.recommendation)}
              </ThemedText>
              <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.8 }]}>
                {katabaticAnalysis.prediction.explanation}
              </ThemedText>
              
              {/* Enhanced Analysis Summary */}
              {katabaticAnalysis.analysisSummary && (
                <ThemedView style={styles.analysisSummary}>
                  <ThemedText style={[styles.summaryText, { color: textColor, opacity: 0.7 }]}>
                    {katabaticAnalysis.analysisSummary.factorsMet}/4 key factors favorable
                  </ThemedText>
                  {katabaticAnalysis.analysisSummary.primaryConcern && (
                    <ThemedText style={[styles.concernText, { color: '#FF9800' }]}>
                      ⚠️ {katabaticAnalysis.analysisSummary.primaryConcern}
                    </ThemedText>
                  )}
                  {katabaticAnalysis.analysisSummary.bestAspect && (
                    <ThemedText style={[styles.positiveText, { color: '#4CAF50' }]}>
                      ✅ {katabaticAnalysis.analysisSummary.bestAspect}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            </ThemedView>
          ) : katabaticAnalysis.isAnalyzing ? (
            <ThemedView style={styles.predictionDisplay}>
              <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.3 }]}>
                <ThemedView style={[
                  styles.probabilityFill, 
                  { backgroundColor: tintColor, width: '50%', opacity: 0.5 }
                ]} />
              </ThemedView>
              <ThemedText style={styles.probabilityText}>Analyzing...</ThemedText>
              <ThemedText style={styles.confidenceText}>
                Processing weather conditions for katabatic prediction
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.predictionDisplay}>
              <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.1 }]}>
                <ThemedView style={[
                  styles.probabilityFill, 
                  { backgroundColor: tintColor, width: '0%' }
                ]} />
              </ThemedView>
              <ThemedText style={styles.probabilityText}>
                {weatherData ? 'Analysis Ready' : 'Loading...'}
              </ThemedText>
              <ThemedText style={styles.confidenceText}>
                {weatherData ? 'Waiting for weather data analysis' : 'Fetching weather data...'}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Enhanced Key Conditions Section - Phase 2 */}
        <ThemedView style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>📊 Key Conditions Analysis</ThemedText>
          
          {katabaticAnalysis.prediction ? (
            <>
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {katabaticAnalysis.prediction.factors.precipitation.meets ? '✅' : '❌'} Rain Probability:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticAnalysis.prediction.factors.precipitation.value.toFixed(1)}% 
                  {` (${katabaticAnalysis.prediction.factors.precipitation.threshold}% max)`}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {katabaticAnalysis.prediction.factors.skyConditions.meets ? '✅' : '❌'} Clear Sky (2-5am):
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticAnalysis.prediction.factors.skyConditions.clearPeriodCoverage.toFixed(0)}% clear
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {katabaticAnalysis.prediction.factors.pressureChange.meets ? '✅' : '❌'} Pressure Change:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticAnalysis.prediction.factors.pressureChange.change > 0 ? '+' : ''}
                  {katabaticAnalysis.prediction.factors.pressureChange.change.toFixed(1)} hPa 
                  ({katabaticAnalysis.prediction.factors.pressureChange.trend})
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {katabaticAnalysis.prediction.factors.temperatureDifferential.meets ? '✅' : '❌'} Temp Differential:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticAnalysis.prediction.factors.temperatureDifferential.differential.toFixed(1)}°C
                </ThemedText>
              </ThemedView>

              {/* Detailed Analysis Section */}
              <ThemedView style={[styles.analysisSummary, { borderTopColor: textColor }]}>
                <ThemedText style={[styles.summaryText, { color: textColor, opacity: 0.8 }]}>
                  Detailed Analysis:
                </ThemedText>
                <ThemedText style={[styles.summaryText, { color: textColor, opacity: 0.7, fontSize: 11 }]}>
                  {katabaticAnalysis.prediction.detailedAnalysis}
                </ThemedText>
              </ThemedView>
            </>
          ) : (
            <>
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>⏸️ Rain Probability:</ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticConditions 
                    ? `${katabaticConditions.precipitationProbability.toFixed(0)}%`
                    : 'Loading...'
                  }
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>🌙 Clear Sky (2-5am):</ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {katabaticConditions 
                    ? `${(100 - katabaticConditions.cloudCover).toFixed(0)}% clear`
                    : 'Loading...'
                  }
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>📈 Pressure Change:</ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {pressureTrend 
                    ? `${pressureTrend.change > 0 ? '+' : ''}${pressureTrend.change.toFixed(1)} hPa`
                    : 'Loading...'
                  }
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>🌡️ Temp Differential:</ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {tempDiff 
                    ? `${tempDiff.differential.toFixed(1)}°C`
                    : 'Loading...'
                  }
                </ThemedText>
              </ThemedView>
            </>
          )}
        </ThemedView>

        {/* Placeholder for future charts */}
        <ThemedView style={[styles.chartCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>📈 Pressure Trend (24h)</ThemedText>
          <ThemedView style={styles.chartPlaceholder}>
            <ThemedText style={[styles.placeholderText, { color: textColor, opacity: 0.5 }]}>
              Pressure chart will appear here
            </ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={[styles.chartCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>🌡️ Temperature Comparison</ThemedText>
          {tempDiff ? (
            <ThemedView style={styles.temperatureComparison}>
              <ThemedView style={styles.tempLocationRow}>
                <ThemedText style={styles.tempLocationLabel}>Morrison:</ThemedText>
                <ThemedText style={styles.tempValue}>{tempDiff.morrison.toFixed(1)}°C</ThemedText>
              </ThemedView>
              <ThemedView style={styles.tempLocationRow}>
                <ThemedText style={styles.tempLocationLabel}>Mountains:</ThemedText>
                <ThemedText style={styles.tempValue}>{tempDiff.mountain.toFixed(1)}°C</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.tempLocationRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: textColor, opacity: 0.2 }]}>
                <ThemedText style={[styles.tempLocationLabel, { fontWeight: 'bold' }]}>Differential:</ThemedText>
                <ThemedText style={[styles.tempValue, { fontWeight: 'bold', color: tempDiff.differential > 0 ? '#4CAF50' : '#F44336' }]}>
                  {tempDiff.differential.toFixed(1)}°C
                </ThemedText>
              </ThemedView>
              <ThemedText style={[styles.tempExplanation, { color: textColor, opacity: 0.7 }]}>
                {tempDiff.differential > 5 
                  ? 'Good temperature differential for katabatic winds'
                  : tempDiff.differential > 2
                  ? 'Moderate temperature differential'
                  : 'Low temperature differential'
                }
              </ThemedText>
            </ThemedView>
          ) : (
            <ThemedView style={styles.chartPlaceholder}>
              <ThemedText style={[styles.placeholderText, { color: textColor, opacity: 0.5 }]}>
                Loading temperature data...
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Development Info */}
        <ThemedView style={[styles.devCard, { backgroundColor: cardColor, opacity: 0.7 }]}>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            🎯 Phase 2: Prediction Engine Complete!
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            ✅ Sophisticated katabatic analysis active
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            Next: Charts & API integration (Phase 3)
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for tab bar
  },
  headerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  locationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
  },
  predictionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  predictionDisplay: {
    alignItems: 'center',
  },
  probabilityBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  probabilityText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  confidenceText: {
    fontSize: 16,
    opacity: 0.8,
  },
  conditionsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conditionLabel: {
    fontSize: 14,
    flex: 1,
  },
  conditionValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  devCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  devText: {
    fontSize: 12,
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    padding: 24,
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  temperatureComparison: {
    paddingVertical: 8,
  },
  tempLocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tempLocationLabel: {
    fontSize: 14,
    flex: 1,
  },
  tempValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  tempExplanation: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Phase 2: Enhanced prediction styles
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  analysisSummary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    marginBottom: 4,
  },
  concernText: {
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
  positiveText: {
    fontSize: 12,
    marginBottom: 2,
    textAlign: 'center',
  },
});
