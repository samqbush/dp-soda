import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PressureChart } from '@/components/PressureChart';
import { WeeklyForecast } from '@/components/WeeklyForecast';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWeatherData } from '@/hooks/useWeatherData';

export default function WindGuruScreen() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  
  // State for collapsible sections
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

  // Temperature conversion helper
  const celsiusToFahrenheit = (celsius: number): number => {
    return (celsius * 9/5) + 32;
  };

  // Helper to format temperature in Fahrenheit
  const formatTempF = (celsius: number): string => {
    return `${celsiusToFahrenheit(celsius).toFixed(1)}°F`;
  };

  // Helper to format temperature differential (already in Fahrenheit)
  const formatTempDiffF = (fahrenheitDiff: number): string => {
    return `${fahrenheitDiff.toFixed(1)}°F`;
  };

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
    getTomorrowPrediction,
    getDataSourceInfo,
    // Phase 2.5: Extended predictions
    getWeeklyPredictions,
    getForecastAvailability,
  } = useWeatherData();

  // Get current analysis data
  const tempDiff = getTemperatureDifferential();
  const pressureTrend = getPressureTrend('morrison', 24); // 24 hours for comprehensive chart
  const katabaticConditions = getBasicKatabaticConditions();
  const tomorrowPrediction = getTomorrowPrediction();
  
  // Phase 2.5: Extended forecast data
  const weeklyPredictions = getWeeklyPredictions();
  const forecastAvailability = getForecastAvailability();

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
    console.log('Wind Guru: Pull-to-refresh triggered');
    try {
      await refreshData();
      console.log('Wind Guru: Data refreshed successfully');
    } catch (error) {
      console.error('Wind Guru: Refresh failed:', error);
    }
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
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={isLoading} 
            onRefresh={handleRefresh}
            tintColor={tintColor}
            colors={[tintColor]}
            progressBackgroundColor={cardColor}
          />
        }
      >
        {/* Header Section */}
        <ThemedView style={[styles.headerCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.locationTitle}>Wind Guru - Morrison, CO</ThemedText>
          <ThemedText style={styles.subtitle}>Katabatic Wind Prediction</ThemedText>
          <ThemedView style={styles.updateInfo}>
            <ThemedText style={[styles.lastUpdated, { color: textColor, opacity: 0.7 }]}>
              Last updated: {formatLastUpdated()}
            </ThemedText>
            <ThemedText style={[styles.dataFreshness, { 
              color: (() => {
                if (!lastUpdated) return '#F44336';
                const now = new Date();
                const ageMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
                if (ageMinutes < 30) return '#4CAF50';
                if (ageMinutes < 60) return '#FF9800';
                return '#F44336';
              })()
            }]}>
              {(() => {
                if (!lastUpdated) return '⚠️ No data';
                const now = new Date();
                const ageMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
                if (ageMinutes < 30) return '🟢 Fresh data';
                if (ageMinutes < 60) return '🟡 Updating soon';
                return '🔴 Stale data';
              })()}
            </ThemedText>
          </ThemedView>
        </ThemedView>

        {/* How Predictions Work - Collapsible User Guide Section */}
        <ThemedView style={[styles.infoCard, { backgroundColor: cardColor }]}>
          <TouchableOpacity 
            onPress={() => setIsHowItWorksExpanded(!isHowItWorksExpanded)}
            activeOpacity={0.7}
            style={styles.collapsibleHeader}
          >
            <ThemedView style={styles.headerContent}>
              <ThemedText style={styles.sectionTitle}>🧠 How Wind Predictions Work</ThemedText>
              <ThemedText style={[styles.expandIcon, { color: tintColor }]}>
                {isHowItWorksExpanded ? '▼' : '▶'}
              </ThemedText>
            </ThemedView>
            <ThemedText style={[styles.collapsibleHint, { color: textColor, opacity: 0.6 }]}>
              {isHowItWorksExpanded ? 'Tap to collapse' : 'Tap to learn about our 4-factor analysis'}
            </ThemedText>
          </TouchableOpacity>
          
          {isHowItWorksExpanded && (
            <ThemedView style={styles.infoContent}>
              <ThemedText style={[styles.infoText, { color: textColor, opacity: 0.9 }]}>
                Our katabatic wind prediction analyzes <ThemedText style={styles.highlightText}>4 key meteorological factors</ThemedText> to calculate probability for <ThemedText style={styles.highlightText}>today AND tomorrow</ThemedText>:
              </ThemedText>
              
              <ThemedView style={styles.factorsList}>
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>☔</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Rain Probability (30% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≤20% rain chance - rain disrupts wind formation</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌙</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Clear Sky 2-5am (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥70% clear - needed for radiative cooling</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>📈</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Pressure Change (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥2.0 hPa change - indicates air movement</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌡️</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Temperature Difference (20% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥9.0°F Morrison (valley, 1740m) vs Nederland (mountain, 2540m) - drives katabatic flow</ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
              
              <ThemedView style={[styles.calculationExample, { borderColor: tintColor, borderWidth: 1 }]}>
                <ThemedText style={[styles.exampleTitle, { color: tintColor }]}>📚 Example: How 47% is Calculated</ThemedText>
                <ThemedText style={[styles.exampleText, { color: textColor, opacity: 0.8 }]}>
                  ✅ Rain: 17.8% (good) → 85 confidence × 30% = 25.5 points{'\n'}
                  ❌ Sky: 56% clear (poor) → 40 confidence × 25% = 10.0 points{'\n'}
                  ✅ Pressure: -7.3 hPa (good) → 90 confidence × 25% = 22.5 points{'\n'}
                  ✅ Temp: 11.0°F Morrison warmer than Nederland (good) → 80 confidence × 20% = 16.0 points{'\n'}
                  {'\n'}
                  <ThemedText style={[styles.resultText, { color: tintColor }]}>Total: ~47% probability</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.keyInsight, { color: '#FF9800' }]}>
                  💡 Key Insight: Even with 3/4 factors good, poor sky conditions (56% vs 70% needed) significantly reduce the overall probability. The algorithm is intentionally conservative - better to miss good conditions than recommend poor ones!
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={[styles.locationInfo, { backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 8, padding: 12 }]}>
                <ThemedText style={[styles.dataSourceTitle, { color: textColor, fontWeight: '600' }]}>📍 Weather Data Sources:</ThemedText>
                <ThemedText style={[styles.dataSourceText, { color: textColor, opacity: 0.8 }]}>
                  • <ThemedText style={{ fontWeight: '500' }}>Morrison, CO</ThemedText> (1740m elevation) - Valley reference for katabatic flow formation{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Nederland, CO</ThemedText> (2540m elevation) - Mountain reference for temperature gradient{'\n'}
                  • <ThemedText style={{ fontStyle: 'italic' }}>800m elevation difference</ThemedText> creates ideal conditions for analyzing katabatic potential at Soda Lake area
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.quickTips}>
                <ThemedText style={[styles.tipsTitle, { color: textColor }]}>Quick Tips:</ThemedText>              <ThemedText style={[styles.tipText, { color: textColor, opacity: 0.8 }]}>
                • <ThemedText style={{ color: '#4CAF50' }}>75-100%</ThemedText>: Excellent conditions - GO!{'\n'}
                • <ThemedText style={{ color: '#FF9800' }}>50-74%</ThemedText>: Good conditions - likely favorable{'\n'}
                • <ThemedText style={{ color: '#F44336' }}>25-49%</ThemedText>: Marginal - mixed conditions{'\n'}
                • <ThemedText style={{ color: '#F44336' }}>0-24%</ThemedText>: Poor - stay home{'\n'}
                {'\n'}
                📅 <ThemedText style={styles.highlightText}>Today vs Tomorrow:</ThemedText>{'\n'}
                • Today&apos;s prediction helps verify accuracy and plan immediate activities{'\n'}
                • Tomorrow&apos;s prediction helps plan ahead for dawn patrol{'\n'}
                {'\n'}
                🕰️ <ThemedText style={styles.highlightText}>Timing matters!</ThemedText> Predictions are for dawn patrol window (6-8am) based on overnight cooling analysis.{'\n'}
                {'\n'}
                Always check <ThemedText style={styles.highlightText}>confidence level</ThemedText> - low confidence means uncertain conditions even with decent probability.
              </ThemedText>
              
              {/* Data Quality Explanation */}
              <ThemedView style={[styles.dataQualitySection, { 
                backgroundColor: 'rgba(33, 150, 243, 0.05)', 
                borderRadius: 8, 
                padding: 12, 
                marginTop: 16,
                borderLeftWidth: 3,
                borderLeftColor: '#2196F3'
              }]}>
                <ThemedText style={[styles.dataQualityTitle, { color: '#2196F3', fontWeight: '600', marginBottom: 8 }]}>
                  📊 Understanding Data Quality Indicators
                </ThemedText>
                
                <ThemedView style={styles.dataQualityItem}>
                  <ThemedText style={[styles.dataQualityLabel, { color: '#4CAF50', fontWeight: '500' }]}>
                    ✅ &ldquo;Good Data&rdquo;
                  </ThemedText>
                  <ThemedText style={[styles.dataQualityDesc, { color: textColor, opacity: 0.8 }]}>
                    18+ hours of forecast data available for the day. Provides comprehensive analysis of all 4 factors with high confidence. Typical for today and tomorrow.
                  </ThemedText>
                </ThemedView>
                
                <ThemedView style={styles.dataQualityItem}>
                  <ThemedText style={[styles.dataQualityLabel, { color: '#FF9800', fontWeight: '500' }]}>
                    ⚠️ &ldquo;Limited Data&rdquo;
                  </ThemedText>
                  <ThemedText style={[styles.dataQualityDesc, { color: textColor, opacity: 0.8 }]}>
                    &lt;18 hours of forecast data available. Common for days 3-5 as forecast models provide fewer data points further out. Predictions are still useful but less detailed.
                  </ThemedText>
                </ThemedView>
                
                <ThemedText style={[styles.dataQualityExplanation, { color: textColor, opacity: 0.7, fontSize: 12, marginTop: 8, fontStyle: 'italic' }]}>
                  <ThemedText style={{ fontWeight: '500' }}>Why this happens:</ThemedText> OpenWeatherMap provides forecasts in 3-hour intervals. For distant days (3-5 days out), fewer forecast points may be available in our analysis window, but the 4-factor algorithm still works effectively with available data.
                </ThemedText>
              </ThemedView>
              
              <ThemedText style={[styles.learnMoreText, { color: tintColor, opacity: 0.8 }]}>
                📖 For detailed explanations, see docs/KATABATIC_PREDICTION_GUIDE.md
              </ThemedText>
              </ThemedView>
            </ThemedView>
          )}
        </ThemedView>

        {/* Katabatic Prediction Section - Today & Tomorrow */}
        <ThemedView style={[styles.predictionCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>🌤️ Katabatic Predictions</ThemedText>
          
          {/* Today's Prediction */}
          <ThemedView style={[styles.dayPredictionCard, { backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 12, marginBottom: 16, padding: 16 }]}>
            <ThemedView style={[styles.dayHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
              <ThemedText style={[styles.dayTitle, { color: textColor, fontSize: 18, fontWeight: '700' }]}>
                📅 Today, {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </ThemedText>
              <ThemedText style={[styles.currentTimeBadge, { 
                color: '#4CAF50', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: '600'
              }]}>
                Current
              </ThemedText>
            </ThemedView>
            
            <ThemedView style={[styles.timeWindowInfo, { marginBottom: 12 }]}>
              <ThemedText style={[styles.timeWindowText, { color: textColor, opacity: 0.8, fontSize: 13 }]}>
                🌅 Dawn Patrol Window: <ThemedText style={{ fontWeight: '500' }}>6:00 AM - 8:00 AM</ThemedText>
              </ThemedText>
              <ThemedText style={[styles.timeStatus, { color: textColor, opacity: 0.6, fontSize: 11 }]}>
                {(() => {
                  const now = new Date();
                  const currentHour = now.getHours();
                  
                  if (currentHour >= 6 && currentHour <= 8) {
                    return '🔴 Active Dawn Patrol Window - Real-time verification mode';
                  } else if (currentHour < 6) {
                    const hoursUntil = 6 - currentHour;
                    return `⏰ Dawn patrol starts in ${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} - Prediction mode`;
                  } else {
                    return '🔒 Dawn patrol complete - Analysis frozen for accuracy tracking';
                  }
                })()}
              </ThemedText>
              {(() => {
                if (katabaticAnalysis.analysisMode === 'post-dawn') {
                  return (
                    <ThemedText style={[styles.timeStatus, { color: '#4CAF50', opacity: 0.8, fontSize: 10, marginTop: 4, fontStyle: 'italic' }]}>
                      💡 Today&apos;s prediction is preserved for verification. Tomorrow&apos;s forecast available below.
                    </ThemedText>
                  );
                }
                return null;
              })()}
            </ThemedView>
            
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
                  Processing today&apos;s weather conditions
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
                  {weatherData ? 'Waiting for today&apos;s weather data analysis' : 'Fetching weather data...'}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          {/* Tomorrow's Prediction */}
          <ThemedView style={[styles.dayPredictionCard, { backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 12, padding: 16 }]}>
            <ThemedView style={[styles.dayHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
              <ThemedText style={[styles.dayTitle, { color: textColor, fontSize: 18, fontWeight: '700' }]}>
                📅 Tomorrow, {(() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  return tomorrow.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  });
                })()}
              </ThemedText>
              <ThemedText style={[styles.planningBadge, { 
                color: '#2196F3', 
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
                fontSize: 12,
                fontWeight: '600'
              }]}>
                Planning
              </ThemedText>
            </ThemedView>
            
            <ThemedView style={[styles.timeWindowInfo, { marginBottom: 12 }]}>
              <ThemedText style={[styles.timeWindowText, { color: textColor, opacity: 0.8, fontSize: 13 }]}>
                🌅 Dawn Patrol Window: <ThemedText style={{ fontWeight: '500' }}>6:00 AM - 8:00 AM</ThemedText>
              </ThemedText>
              <ThemedText style={[styles.timeStatus, { color: textColor, opacity: 0.6, fontSize: 11 }]}>
                📋 Plan your dawn patrol based on this forecast
              </ThemedText>
            </ThemedView>
            
            {tomorrowPrediction ? (
              <ThemedView style={styles.predictionDisplay}>
                <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.3 }]}>
                  <ThemedView style={[
                    styles.probabilityFill, 
                    { 
                      backgroundColor: getProbabilityColor(tomorrowPrediction.prediction.probability),
                      width: `${tomorrowPrediction.prediction.probability}%` 
                    }
                  ]} />
                </ThemedView>
                <ThemedText style={styles.probabilityText}>
                  {tomorrowPrediction.prediction.probability}% Probability
                </ThemedText>
                <ThemedText style={[
                  styles.confidenceText,
                  { color: getConfidenceColor(tomorrowPrediction.prediction.confidence) }
                ]}>
                  {getConfidenceLabel(tomorrowPrediction.prediction.confidence)} Confidence - {getRecommendationText(tomorrowPrediction.prediction.recommendation)}
                </ThemedText>
                <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.8 }]}>
                  {tomorrowPrediction.prediction.explanation}
                </ThemedText>
                
                {/* Preliminary Prediction Notice */}
                <ThemedView style={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <ThemedText style={{ color: '#2196F3', fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                    📊 Preliminary Forecast
                  </ThemedText>
                  <ThemedText style={{ color: textColor, opacity: 0.8, fontSize: 12, lineHeight: 16 }}>
                    This prediction uses current weather models and will be refined with evening updates (after 6 PM). 
                    Data quality: <ThemedText style={{ fontWeight: '500' }}>{tomorrowPrediction.dataQuality}</ThemedText>
                  </ThemedText>
                  <ThemedText style={{ color: '#2196F3', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                    💡 More accurate prediction available after 6 PM with fresh weather models
                  </ThemedText>
                </ThemedView>
              </ThemedView>
            ) : (
              <ThemedView style={styles.predictionDisplay}>
                <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.2 }]}>
                  <ThemedView style={[
                    styles.probabilityFill, 
                    { backgroundColor: '#2196F3', width: '0%', opacity: 0.7 }
                  ]} />
                </ThemedView>
                <ThemedText style={styles.probabilityText}>Loading...</ThemedText>
                <ThemedText style={styles.confidenceText}>
                  Analyzing tomorrow&apos;s forecast data
                </ThemedText>
                <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.6, fontStyle: 'italic' }]}>
                  Forecast data for tomorrow is being processed
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ThemedView>

        {/* Enhanced Key Conditions Section - Today's Analysis */}
        <ThemedView style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
          <ThemedView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <ThemedText style={styles.sectionTitle}>📊 Today&apos;s Conditions Analysis</ThemedText>
            {katabaticAnalysis.analysisMode && (
              <ThemedText style={[{
                fontSize: 11,
                fontWeight: '500',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: (() => {
                  switch (katabaticAnalysis.analysisMode) {
                    case 'prediction': return 'rgba(33, 150, 243, 0.1)';
                    case 'verification': return 'rgba(255, 152, 0, 0.1)';
                    case 'post-dawn': return 'rgba(76, 175, 80, 0.1)';
                    default: return 'rgba(128, 128, 128, 0.1)';
                  }
                })(),
                color: (() => {
                  switch (katabaticAnalysis.analysisMode) {
                    case 'prediction': return '#2196F3';
                    case 'verification': return '#FF9800';
                    case 'post-dawn': return '#4CAF50';
                    default: return '#666';
                  }
                })()
              }]}>
                {(() => {
                  switch (katabaticAnalysis.analysisMode) {
                    case 'prediction': return '🔮 PREDICTION';
                    case 'verification': return '⚡ LIVE';
                    case 'post-dawn': return '🔒 FROZEN';
                    default: return 'UNKNOWN';
                  }
                })()}
              </ThemedText>
            )}
          </ThemedView>
          
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
                  {formatTempDiffF(katabaticAnalysis.prediction.factors.temperatureDifferential.differential)}
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
                    ? formatTempDiffF(tempDiff.differential)
                    : 'Loading...'
                  }
                </ThemedText>
              </ThemedView>
            </>
          )}
        </ThemedView>

        {/* Tomorrow's Conditions Analysis */}
        <ThemedView style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>📊 Tomorrow&apos;s Conditions Analysis</ThemedText>
          
          {tomorrowPrediction ? (
            <>
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {tomorrowPrediction.prediction.factors.precipitation.meets ? '✅' : '❌'} Rain Probability:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {tomorrowPrediction.prediction.factors.precipitation.value.toFixed(1)}% 
                  {` (${tomorrowPrediction.prediction.factors.precipitation.threshold}% max)`}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {tomorrowPrediction.prediction.factors.skyConditions.meets ? '✅' : '❌'} Clear Sky (2-5am):
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {tomorrowPrediction.prediction.factors.skyConditions.clearPeriodCoverage.toFixed(0)}% clear
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {tomorrowPrediction.prediction.factors.pressureChange.meets ? '✅' : '❌'} Pressure Change:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {tomorrowPrediction.prediction.factors.pressureChange.change > 0 ? '+' : ''}
                  {tomorrowPrediction.prediction.factors.pressureChange.change.toFixed(1)} hPa 
                  ({tomorrowPrediction.prediction.factors.pressureChange.trend})
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {tomorrowPrediction.prediction.factors.temperatureDifferential.meets ? '✅' : '❌'} Temp Differential:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {formatTempDiffF(tomorrowPrediction.prediction.factors.temperatureDifferential.differential)}
                </ThemedText>
              </ThemedView>

              {/* Data Quality Note */}
              <ThemedView style={{ backgroundColor: 'rgba(33, 150, 243, 0.05)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                <ThemedText style={{ color: '#2196F3', fontSize: 12, fontWeight: '500', marginBottom: 4 }}>
                  📊 Forecast Data Quality: {tomorrowPrediction.dataQuality}
                </ThemedText>
                <ThemedText style={{ color: textColor, opacity: 0.7, fontSize: 11, lineHeight: 14 }}>
                  Based on {tomorrowPrediction.dataQuality === 'good' ? '20+ hours' : 'limited hours'} of forecast data. 
                  Check back after 6 PM for enhanced accuracy with updated weather models.
                </ThemedText>
              </ThemedView>
            </>
          ) : (
            <ThemedView style={{ backgroundColor: 'rgba(33, 150, 243, 0.05)', borderRadius: 8, padding: 16 }}>
              <ThemedText style={{ color: '#2196F3', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                🔄 Loading Tomorrow&apos;s Analysis
              </ThemedText>
              <ThemedText style={{ color: textColor, opacity: 0.7, lineHeight: 20 }}>
                Processing forecast data for tomorrow&apos;s 4-factor breakdown:{'\n'}
                • Rain probability analysis{'\n'}
                • Clear sky period assessment{'\n'}
                • Pressure change trends{'\n'}
                • Temperature differential calculation{'\n'}
                {'\n'}
                <ThemedText style={{ fontStyle: 'italic' }}>Forecast data loading...</ThemedText>
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* Data Source Status Indicator */}
        <ThemedView style={[styles.dataSourceStatus, { 
          backgroundColor: (() => {
            const sourceInfo = getDataSourceInfo();
            if (!sourceInfo) return 'rgba(128, 128, 128, 0.1)'; // Gray for unknown
            switch (sourceInfo.source) {
              case 'api': return 'rgba(76, 175, 80, 0.1)'; // Green for API
              case 'cache': return 'rgba(255, 152, 0, 0.1)'; // Orange for cache
              case 'mock': return 'rgba(244, 67, 54, 0.1)'; // Red for mock
              default: return 'rgba(128, 128, 128, 0.1)';
            }
          })(),
          borderRadius: 8, 
          padding: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: (() => {
            const sourceInfo = getDataSourceInfo();
            if (!sourceInfo) return 'rgba(128, 128, 128, 0.3)';
            switch (sourceInfo.source) {
              case 'api': return 'rgba(76, 175, 80, 0.3)';
              case 'cache': return 'rgba(255, 152, 0, 0.3)';
              case 'mock': return 'rgba(244, 67, 54, 0.3)';
              default: return 'rgba(128, 128, 128, 0.3)';
            }
          })()
        }]}>
          <ThemedText style={[styles.dataSourceTitle, { color: textColor, fontWeight: '600' }]}>
            {(() => {
              const sourceInfo = getDataSourceInfo();
              if (!sourceInfo) return '❓ Data Status: Unknown';
              switch (sourceInfo.source) {
                case 'api': return '🌐 Data Status: Live API Data';
                case 'cache': return '💾 Data Status: Cached Data';
                case 'mock': return '⚠️ Data Status: DEMO DATA (NOT REAL)';
                default: return '❓ Data Status: Unknown';
              }
            })()}
          </ThemedText>
          <ThemedText style={[styles.dataSourceText, { color: textColor, opacity: 0.8 }]}>
            {(() => {
              const sourceInfo = getDataSourceInfo();
              if (!sourceInfo) return 'Unable to determine data source status.';
              
              switch (sourceInfo.source) {
                case 'api':
                  return '✅ Receiving real-time weather data from OpenWeatherMap API. Predictions are based on current meteorological conditions.';
                case 'cache':
                  return `📱 Using recent weather data from cache (fetched ${sourceInfo.lastFetch ? new Date(sourceInfo.lastFetch).toLocaleTimeString() : 'recently'}). Predictions may be slightly outdated but still reliable.`;
                case 'mock':
                  return '🚨 WARNING: This is DEMO DATA for testing purposes only. These are NOT real weather conditions! Configure your OpenWeatherMap API key in settings to see real data.';
                default:
                  return 'Data source status unclear. Check your internet connection and API configuration.';
              }
            })()}
          </ThemedText>
          {(() => {
            const sourceInfo = getDataSourceInfo();
            if (sourceInfo?.source === 'mock') {
              return (
                <ThemedText style={[styles.mockDataWarning, { 
                  color: '#F44336', 
                  fontWeight: 'bold',
                  marginTop: 8,
                  fontSize: 14
                }]}>
                  🔧 To fix: Add your OpenWeatherMap API key to .env file{'\n'}
                  📖 See: docs/OPENWEATHERMAP_SETUP.md for setup instructions
                </ThemedText>
              );
            }
            return null;
          })()}
        </ThemedView>
        
        {/* Pressure Trend Chart */}
        <ThemedView style={[styles.chartCard, { backgroundColor: cardColor }]}>
          <PressureChart 
            pressureTrend={pressureTrend} 
            title="📈 Pressure Trend (24h)"
            location="Morrison, CO"
          />
        </ThemedView>

        <ThemedView style={[styles.chartCard, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.sectionTitle}>🌡️ Temperature Comparison</ThemedText>
          {tempDiff ? (
            <ThemedView style={styles.temperatureComparison}>
              <ThemedView style={styles.tempLocationRow}>
                <ThemedText style={styles.tempLocationLabel}>Morrison:</ThemedText>
                <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.morrison)}</ThemedText>
              </ThemedView>
              <ThemedView style={styles.tempLocationRow}>
                <ThemedText style={styles.tempLocationLabel}>Mountains:</ThemedText>
                <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.mountain)}</ThemedText>
              </ThemedView>
              <ThemedView style={[styles.tempLocationRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: textColor, opacity: 0.2 }]}>
                <ThemedText style={[styles.tempLocationLabel, { fontWeight: 'bold' }]}>Differential:</ThemedText>
                <ThemedText style={[styles.tempValue, { fontWeight: 'bold', color: tempDiff.differential > 0 ? '#4CAF50' : '#F44336' }]}>
                  {formatTempDiffF(tempDiff.differential)}
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

        {/* Phase 2.5: Weekly Forecast */}
        <WeeklyForecast 
          predictions={weeklyPredictions}
          forecastAvailability={forecastAvailability}
          isLoading={isLoading}
        />

        {/* Development Info */}
        <ThemedView style={[styles.devCard, { backgroundColor: cardColor, opacity: 0.7 }]}>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            🎯 Phase 3: Weekly Forecast Active!
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            ✅ Today & Tomorrow detailed analysis
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            📅 5-day extended forecast with quick overview
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            🌤️ Using OpenWeatherMap API (up to 5 days available)
          </ThemedText>
          <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
            Next: Historical accuracy tracking & push notifications
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
  // New styles for prediction explanation section
  infoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoContent: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  highlightText: {
    fontWeight: '600',
    fontSize: 14,
  },
  factorsList: {
    marginBottom: 16,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  factorEmoji: {
    fontSize: 20,
    marginRight: 12,
    marginTop: 2,
  },
  factorContent: {
    flex: 1,
  },
  factorName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  factorDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  calculationExample: {
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
    marginBottom: 8,
  },
  resultText: {
    fontWeight: '700',
    fontSize: 13,
  },
  keyInsight: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    marginTop: 4,
  },
  quickTips: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
  },
  learnMoreText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  locationInfo: {
    marginVertical: 8,
  },
  dataSourceTitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  dataSourceText: {
    fontSize: 12,
    lineHeight: 18,
  },
  // Time window styles
  timeWindowCard: {
    marginBottom: 12,
  },
  timeWindowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeWindowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  confidenceBadge: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeWindowDetails: {
    gap: 4,
  },
  predictionDateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeWindowText: {
    fontSize: 13,
    marginBottom: 2,
  },
  timeWindowSubtext: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  updateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dataFreshness: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Day prediction styles
  dayPredictionCard: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  currentTimeBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  planningBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeWindowInfo: {
    marginBottom: 12,
  },
  timeStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  // Tomorrow placeholder styles
  tomorrowPlaceholder: {
    backgroundColor: 'rgba(33, 150, 243, 0.05)',
    borderRadius: 8,
    padding: 16,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    lineHeight: 20,
  },
  // New styles for data source status indicator
  dataSourceStatus: {
    marginVertical: 8,
  },
  mockDataWarning: {
    textAlign: 'left',
  },
  // Collapsible section styles
  collapsibleHeader: {
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  collapsibleHint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Data quality explanation styles
  dataQualitySection: {
    marginTop: 16,
  },
  dataQualityTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  dataQualityItem: {
    marginBottom: 12,
  },
  dataQualityLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  dataQualityDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  dataQualityExplanation: {
    fontSize: 12,
    lineHeight: 16,
  },
});
