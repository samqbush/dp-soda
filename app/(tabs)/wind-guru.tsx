import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useAppSettings } from '@/contexts/SettingsContext';
import { PressureChart } from '@/components/PressureChart';

export default function WindGuruScreen() {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  const { settings } = useAppSettings();
  
  // State for collapsible sections - must be called before any conditional returns
  const [isHowItWorksExpanded, setIsHowItWorksExpanded] = useState(false);

  // Temperature conversion helper
  const celsiusToFahrenheit = (celsius: number): number => {
    return (celsius * 9/5) + 32;
  };

  // Helper to format temperature in Fahrenheit
  const formatTempF = (celsius: number): string => {
    return `${celsiusToFahrenheit(celsius).toFixed(1)}°F`;
  };

  // Helper to format temperature differential (convert from Celsius to Fahrenheit)
  const formatTempDiffF = (celsiusDiff: number): string => {
    const fahrenheitDiff = celsiusDiff * 9/5; // Convert temperature difference from C to F
    return `${fahrenheitDiff.toFixed(1)}°F`;
  };

  // Use the weather data hook with Phase 2 prediction engine - must be called unconditionally
  const {
    weatherData,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    getPressureTrend,
    getBasicKatabaticConditions,
    katabaticAnalysis,
    getTomorrowPrediction,
    getDataSourceInfo,
    // Phase 3: Prediction tracking (June 14, 2025) - REMOVED
    // logCurrentPrediction,
    // getPredictionAccuracy,
    // validatePastPredictions,
  } = useWeatherData();

  // REMOVED: Learning mode and prediction tracking for simplification
  // Import Soda Lake wind data for prediction validation
  // const { windData: sodaLakeWindData } = useSodaLakeWind();

  // Show disabled message if Wind Guru is not enabled
  if (!settings.windGuruEnabled) {
    return (
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.disabledContainer, { backgroundColor: cardColor }]}>
          <ThemedText style={styles.disabledTitle}>🔒 Wind Guru Disabled</ThemedText>
          <ThemedText style={styles.disabledText}>
            The Wind Guru tab is currently disabled. This experimental feature provides advanced katabatic wind predictions but is still in development.
          </ThemedText>
          <ThemedText style={[styles.disabledText, { marginTop: 16 }]}>
            To enable Wind Guru:
          </ThemedText>
          <ThemedText style={styles.disabledSteps}>
            1. Go to the Settings tab{'\n'}
            2. Find &quot;App Features&quot; section{'\n'}
            3. Toggle &quot;Wind Guru Tab&quot; to enabled{'\n'}
            4. Return to this tab to access the feature
          </ThemedText>
          <ThemedView style={[styles.warningNote, { backgroundColor: 'rgba(255, 149, 0, 0.1)', borderColor: '#FF9500' }]}>
            <ThemedText style={[styles.warningText, { color: '#FF9500' }]}>
              ⚠️ <ThemedText style={{ fontWeight: 'bold' }}>Experimental Feature</ThemedText>
            </ThemedText>
            <ThemedText style={[styles.warningText, { color: textColor, opacity: 0.8 }]}>
              Wind predictions may not be reliable for critical decisions. Use at your own discretion.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    );
  }

  // Get current analysis data - Using hybrid thermal cycle temperature differential
  const tempDiff = katabaticAnalysis.prediction?.factors?.temperatureDifferential || null;
  const pressureTrend = getPressureTrend('morrison', 24); // 24 hours for comprehensive chart
  const katabaticConditions = getBasicKatabaticConditions();
  const tomorrowPrediction = getTomorrowPrediction();
  
  // REMOVED: Phase 2.5 Extended forecast data and Phase 3 prediction tracking
  // const weeklyPredictions = getWeeklyPredictions();
  // const forecastAvailability = getForecastAvailability();

  // Helper functions for Phase 2 UI
  const getProbabilityColor = (probability: number): string => {
    if (probability >= 75) return '#4CAF50'; // Green
    if (probability >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  // Helper to count favorable factors from prediction
  const countFavorableFactors = (prediction: any): number => {
    if (!prediction?.factors) return 0;
    
    const factors = [
      prediction.factors.precipitation?.meets,
      prediction.factors.skyConditions?.meets,
      prediction.factors.pressureChange?.meets,
      prediction.factors.temperatureDifferential?.meets,
      prediction.factors.wavePattern?.meets
    ];
    
    return factors.filter(Boolean).length;
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

  // REMOVED: Cleanup functions for prediction tracking (part of learning mode)
  // handleCleanupDuplicates and handleClearAllPredictions functions removed

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
              {isHowItWorksExpanded ? 'Tap to collapse' : 'Tap to learn about our 5-factor hybrid analysis'}
            </ThemedText>
          </TouchableOpacity>
          
          {isHowItWorksExpanded && (
            <ThemedView style={styles.infoContent}>
              <ThemedText style={[styles.infoText, { color: textColor, opacity: 0.9 }]}>
                Our advanced katabatic wind prediction uses <ThemedText style={styles.highlightText}>5-factor hybrid MKI analysis</ThemedText> combining NOAA and OpenWeather data to calculate probability for <ThemedText style={styles.highlightText}>today AND tomorrow</ThemedText>:
              </ThemedText>
              
              <ThemedView style={styles.factorsList}>
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>☔</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Rain Probability (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≤25% rain chance - precipitation disrupts both katabatic flow and mountain wave patterns</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌙</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Clear Sky 2-5am (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥45% clear - enables radiative cooling and organized wave development</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>📈</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Pressure Change (20% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥1.0 hPa change - includes wave-induced pressure modifications</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌡️</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Temperature Difference (15% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>
                      ≥5.8°F Morrison (valley, 1740m) vs Evergreen (mountain, 2200m) - drives density-driven flow{'\n'}
                      <ThemedText style={{ fontWeight: '500', color: tintColor }}>Enhanced Thermal Cycle Analysis:</ThemedText> Uses afternoon max vs pre-dawn min temperatures when available for more accurate predictions. If today&apos;s afternoon data is missing, uses tomorrow&apos;s data as fallback. Falls back to current readings only when thermal cycle data is completely unavailable.
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌊</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Mountain Wave Pattern (10% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>Wave enhancement analysis - organized mountain waves can amplify katabatic flow</ThemedText>
                  </ThemedView>
                </ThemedView>
              </ThemedView>
              
              <ThemedView style={[styles.calculationExample, { borderColor: tintColor, borderWidth: 1 }]}>
                <ThemedText style={[styles.exampleTitle, { color: tintColor }]}>📚 Example: How 73% MKI Prediction Works</ThemedText>
                <ThemedText style={[styles.exampleText, { color: textColor, opacity: 0.8 }]}>
                  ✅ Rain: 8.2% (excellent) → 92 confidence × 25% = 23.0 points{'\n'}
                  ✅ Sky: 78% clear (good) → 85 confidence × 25% = 21.3 points{'\n'}
                  ✅ Pressure: +3.1 hPa (excellent) → 90 confidence × 20% = 18.0 points{'\n'}
                  ✅ Temp: 7.3°F differential (good) → 80 confidence × 15% = 12.0 points{'\n'}
                  ✅ Wave: Positive enhancement (excellent) → 85 confidence × 10% = 8.5 points{'\n'}
                  {'\n'}
                  <ThemedText style={[styles.resultText, { color: tintColor }]}>Base Score: ~83 points → With MKI bonuses: 73% probability</ThemedText>
                </ThemedText>
                <ThemedText style={[styles.keyInsight, { color: '#4CAF50' }]}>
                  💡 MKI Enhancement: All 5 factors favorable + positive wave enhancement triggers bonus system. Mountain waves create organized pressure patterns that amplify katabatic flow when conditions align!
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={[styles.locationInfo, { backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 8, padding: 12 }]}>
                <ThemedText style={[styles.dataSourceTitle, { color: textColor, fontWeight: '600' }]}>🌐 Hybrid Data Sources:</ThemedText>
                <ThemedText style={[styles.dataSourceText, { color: textColor, opacity: 0.8 }]}>
                  • <ThemedText style={{ fontWeight: '500' }}>NOAA Weather Service API</ThemedText> - Primary for precipitation, sky conditions, temperature, transport winds{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>OpenWeather API</ThemedText> - Primary for pressure trends (not available from NOAA){'\n'}
                  {'\n'}
                  📍 <ThemedText style={{ fontWeight: '500' }}>Locations:</ThemedText>{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Morrison, CO</ThemedText> (5,709ft) - Valley reference for katabatic flow formation{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Evergreen, CO</ThemedText> (7,220ft) - Mountain reference for temperature gradient{'\n'}
                  • <ThemedText style={{ fontStyle: 'italic' }}>2,527ft elevation difference</ThemedText> creates ideal conditions for analyzing katabatic potential at Soda Lake area
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={[styles.dataQualitySection, { backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: 8, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#FF9800' }]}>
                <ThemedText style={[styles.dataQualityTitle, { color: '#FF9800', fontWeight: '600' }]}>🔬 Why Only 5 Factors? (Originally Planned 6)</ThemedText>
                <ThemedText style={[styles.dataQualityDesc, { color: textColor, opacity: 0.8 }]}>
                  We originally designed a 6-factor system including <ThemedText style={{ fontWeight: '500' }}>Atmospheric Stability</ThemedText>, but our analysis of real government and commercial weather APIs revealed:{'\n'}
                  {'\n'}
                  ❌ <ThemedText style={{ fontWeight: '500' }}>NOAA:</ThemedText> Lists stability parameters but provides no actual data values{'\n'}
                  ❌ <ThemedText style={{ fontWeight: '500' }}>OpenWeather:</ThemedText> No atmospheric stability data available{'\n'}
                  {'\n'}
                  ✅ <ThemedText style={{ fontWeight: '500', color: '#4CAF50' }}>Solution:</ThemedText> Our 5-factor system uses only high-quality, reliable data sources. Better to have 5 excellent factors than 6 with unreliable data!
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={[styles.dataQualitySection, { backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: 8, padding: 12, marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#4CAF50' }]}>
                <ThemedText style={[styles.dataQualityTitle, { color: '#4CAF50', fontWeight: '600' }]}>🌊 What Makes MKI (Mountain Wave-Katabatic Interaction) Special:</ThemedText>
                <ThemedText style={[styles.dataQualityDesc, { color: textColor, opacity: 0.8 }]}>
                  <ThemedText style={{ fontWeight: '500' }}>MKI isn&apos;t a data source - it&apos;s our advanced analysis methodology</ThemedText> that combines NOAA and OpenWeather data using atmospheric science principles:{'\n'}
                  {'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Wave Enhancement Analysis:</ThemedText> Uses NOAA transport winds to detect mountain wave patterns that can amplify katabatic flow{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Multi-Scale Integration:</ThemedText> Combines large-scale NOAA meteorology with local OpenWeather pressure effects{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Nonlinear Interactions:</ThemedText> Accounts for complex atmospheric coupling between wave patterns and surface flow{'\n'}
                  • <ThemedText style={{ fontWeight: '500' }}>Real-Time Verification:</ThemedText> System learns from actual conditions to improve future predictions{'\n'}
                  {'\n'}
                  🎯 <ThemedText style={{ fontWeight: '500', color: '#2196F3' }}>Bottom Line:</ThemedText> MKI transforms raw weather data into sophisticated wind predictions by understanding how mountain waves interact with katabatic flows.{'\n'}
                  {'\n'}
                  📚 <ThemedText style={{ fontWeight: '500', color: '#2196F3' }}>Scientific Foundation:</ThemedText> Based on &quot;Interaction of Katabatic Flow and Mountain Waves&quot; research:{'\n'}
                  <ThemedText style={{ color: '#2196F3', textDecorationLine: 'underline' }}>https://journals.ametsoc.org/view/journals/atsc/64/6/jas3926.1.xml</ThemedText>
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.quickTips}>
                <ThemedText style={[styles.tipsTitle, { color: textColor }]}>Quick Tips for MKI Predictions:</ThemedText>
                <ThemedText style={[styles.tipText, { color: textColor, opacity: 0.8 }]}>
                  • <ThemedText style={{ color: '#4CAF50' }}>75-100%</ThemedText>: Excellent MKI conditions - GO! Strong wave enhancement likely{'\n'}
                  • <ThemedText style={{ color: '#FF9800' }}>50-74%</ThemedText>: Good conditions - favorable with some wave interaction{'\n'}
                  • <ThemedText style={{ color: '#F44336' }}>25-49%</ThemedText>: Marginal - mixed conditions, wave effects uncertain{'\n'}
                  • <ThemedText style={{ color: '#F44336' }}>0-24%</ThemedText>: Poor - disrupted patterns, wave interference likely{'\n'}
                  {'\n'}
                  📅 <ThemedText style={styles.highlightText}>Today vs Tomorrow:</ThemedText>{'\n'}
                  • Today&apos;s MKI prediction helps verify wave-katabatic coupling accuracy{'\n'}
                  • Tomorrow&apos;s forecast helps plan for optimal wave enhancement windows{'\n'}
                  {'\n'}
                  🌊 <ThemedText style={styles.highlightText}>Wave Pattern Matters!</ThemedText> Positive wave enhancement can boost good conditions to excellent, while negative patterns can disrupt otherwise favorable meteorology.{'\n'}
                  {'\n'}
                  🎯 <ThemedText style={styles.highlightText}>MKI Confidence:</ThemedText> High confidence means both basic meteorology AND wave interactions are well-understood and predictable.
                </ThemedText>
              </ThemedView>
              
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
                    18+ hours of forecast data available for the day. Provides comprehensive analysis of all 5 factors with high confidence. Typical for today and tomorrow.
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
                  <ThemedText style={{ fontWeight: '500' }}>Why this happens:</ThemedText> OpenWeatherMap provides forecasts in 3-hour intervals. For distant days (3-5 days out), fewer forecast points may be available in our analysis window, but the 5-factor hybrid algorithm still works effectively with available data.
                </ThemedText>
              </ThemedView>
              
              <ThemedText style={[styles.learnMoreText, { color: tintColor, opacity: 0.8 }]}>
                📖 For detailed explanations, see docs/KATABATIC_PREDICTION_GUIDE.md
              </ThemedText>
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
                  {katabaticAnalysis.prediction.probability}% Chance of Good Winds
                </ThemedText>
                <ThemedText style={[styles.confidenceText, { color: textColor, opacity: 0.9 }]}>
                  ✅ {countFavorableFactors(katabaticAnalysis.prediction)} of 5 factors favorable
                </ThemedText>
                <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.7, fontSize: 12 }]}>
                  📊 Based on {(() => {
                    if (!lastUpdated) return 'weather data';
                    const now = new Date();
                    const ageMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
                    if (ageMinutes < 30) return 'fresh weather data';
                    if (ageMinutes < 60) return 'recent weather data';
                    return 'older weather data';
                  })()} (updated {formatLastUpdated()})
                </ThemedText>
                
                <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.8 }]}>
                  {katabaticAnalysis.prediction.explanation}
                </ThemedText>
                
                {/* Enhanced Historical Analysis Indicator */}
                {katabaticAnalysis.prediction.enhancedAnalysis?.hasHistoricalData && (
                  <ThemedView style={{
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 8,
                    padding: 12,
                    marginTop: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: '#4CAF50'
                  }}>
                    <ThemedText style={[styles.explanationText, { 
                      color: '#4CAF50', 
                      fontSize: 12,
                      fontWeight: '600'
                    }]}>
                      🆓 FREE Historical Enhancement Active
                    </ThemedText>
                    <ThemedText style={[styles.explanationText, { 
                      color: textColor, 
                      opacity: 0.8,
                      fontSize: 11,
                      marginTop: 4
                    }]}>
                      Using actual observed thermal data from {katabaticAnalysis.prediction.enhancedAnalysis.historicalSource} for improved accuracy
                    </ThemedText>
                  </ThemedView>
                )}
                
                {/* Enhanced Analysis Summary */}
                {katabaticAnalysis.analysisSummary && (
                  <ThemedView style={styles.analysisSummary}>
                    <ThemedText style={[styles.summaryText, { color: textColor, opacity: 0.7 }]}>
                      {katabaticAnalysis.analysisSummary.factorsMet}/5 key factors favorable
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

          {/* Today's Conditions Analysis - positioned directly under today's prediction */}
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
                {/* Show thermal cycle status in conditions analysis */}
                {katabaticAnalysis.prediction.factors.temperatureDifferential.thermalCycleFailureReason && (
                  <ThemedView style={{ marginLeft: 16, marginTop: -4, marginBottom: 8 }}>
                    <ThemedText style={[styles.conditionLabel, { 
                      fontSize: 10, 
                      opacity: 0.7, 
                      fontStyle: 'italic',
                      color: katabaticAnalysis.prediction.factors.temperatureDifferential.usedTomorrowFallback ? '#FF9800' : '#F44336'
                    }]}>
                      {katabaticAnalysis.prediction.factors.temperatureDifferential.usedTomorrowFallback ? 
                        '📅 Using tomorrow\'s data:' : 
                        '⚠️ Using current temps:'
                      } {katabaticAnalysis.prediction.factors.temperatureDifferential.thermalCycleFailureReason}
                    </ThemedText>
                  </ThemedView>
                )}
                
                {/* Show enhanced historical analysis status */}
                {katabaticAnalysis.prediction.enhancedAnalysis && (
                  <ThemedView style={{ marginLeft: 16, marginTop: -4, marginBottom: 8 }}>
                    {katabaticAnalysis.prediction.enhancedAnalysis.hasHistoricalData ? (
                      <ThemedText style={[styles.conditionLabel, { 
                        fontSize: 10, 
                        opacity: 0.8, 
                        fontStyle: 'italic',
                        color: '#4CAF50'
                      }]}>
                        🆓 FREE Historical Data: Using actual observed temperatures from {katabaticAnalysis.prediction.enhancedAnalysis.historicalSource}
                      </ThemedText>
                    ) : katabaticAnalysis.prediction.enhancedAnalysis.fallbackReason && (
                      <ThemedText style={[styles.conditionLabel, { 
                        fontSize: 10, 
                        opacity: 0.6, 
                        fontStyle: 'italic',
                        color: '#9E9E9E'
                      }]}>
                        📊 Historical Enhancement: {katabaticAnalysis.prediction.enhancedAnalysis.fallbackReason}
                      </ThemedText>
                    )}
                  </ThemedView>
                )}
                
                <ThemedView style={styles.conditionRow}>
                  <ThemedText style={styles.conditionLabel}>
                    {katabaticAnalysis.prediction.factors.wavePattern.meets ? '✅' : '❌'} Mountain Wave Pattern:
                  </ThemedText>
                  <ThemedText style={styles.conditionValue}>
                    {katabaticAnalysis.prediction.factors.wavePattern.waveEnhancement} 
                    {katabaticAnalysis.prediction.factors.wavePattern.mixingHeightData && 
                      ` (${katabaticAnalysis.prediction.factors.wavePattern.mixingHeightData}m)`}
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
                  {tomorrowPrediction.prediction.probability}% Chance of Good Winds
                </ThemedText>
                <ThemedText style={[styles.confidenceText, { color: textColor, opacity: 0.9 }]}>
                  ✅ {countFavorableFactors(tomorrowPrediction.prediction)} of 5 factors favorable
                </ThemedText>
                <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.7, fontSize: 12 }]}>
                  📊 Based on {tomorrowPrediction.dataQuality} forecast data
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
              {/* Show thermal cycle status for tomorrow's prediction */}
              {tomorrowPrediction.prediction.factors.temperatureDifferential.thermalCycleFailureReason && (
                <ThemedView style={{ marginLeft: 16, marginTop: -4, marginBottom: 8 }}>
                  <ThemedText style={[styles.conditionLabel, { 
                    fontSize: 10, 
                    opacity: 0.7, 
                    fontStyle: 'italic',
                    color: tomorrowPrediction.prediction.factors.temperatureDifferential.usedTomorrowFallback ? '#FF9800' : '#F44336'
                  }]}>
                    {tomorrowPrediction.prediction.factors.temperatureDifferential.usedTomorrowFallback ? 
                      '📅 Using next day\'s data:' : 
                      '⚠️ Using forecast temps:'
                    } {tomorrowPrediction.prediction.factors.temperatureDifferential.thermalCycleFailureReason}
                  </ThemedText>
                </ThemedView>
              )}
              
              <ThemedView style={styles.conditionRow}>
                <ThemedText style={styles.conditionLabel}>
                  {tomorrowPrediction.prediction.factors.wavePattern.meets ? '✅' : '❌'} Mountain Wave Pattern:
                </ThemedText>
                <ThemedText style={styles.conditionValue}>
                  {tomorrowPrediction.prediction.factors.wavePattern.waveEnhancement} 
                  {tomorrowPrediction.prediction.factors.wavePattern.mixingHeightData && 
                    ` (${tomorrowPrediction.prediction.factors.wavePattern.mixingHeightData}m)`}
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
                Processing forecast data for tomorrow&apos;s 5-factor breakdown:{'\n'}
                • Rain probability analysis{'\n'}
                • Clear sky period assessment{'\n'}
                • Pressure change trends{'\n'}
                • Temperature differential calculation{'\n'}
                {'\n'}
              </ThemedText>
              <ThemedText style={{ color: textColor, opacity: 0.7, fontStyle: 'italic' }}>
                Forecast data loading...
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
          <ThemedText style={styles.sectionTitle}>🌡️ Thermal Cycle Temperature Analysis</ThemedText>
          {tempDiff ? (
            <ThemedView style={styles.temperatureComparison}>
              {/* Show thermal cycle data if available, otherwise current temps */}
              {(tempDiff as any)?.type === 'thermal_cycle' ? (
                <>
                  <ThemedView style={styles.tempLocationRow}>
                    <ThemedText style={styles.tempLocationLabel}>Morrison Max (Day):</ThemedText>
                    <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.morrisonTemp)}</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.tempLocationRow}>
                    <ThemedText style={styles.tempLocationLabel}>Evergreen Min (Night):</ThemedText>
                    <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.mountainTemp)}</ThemedText>
                  </ThemedView>
                  <ThemedView style={[styles.tempLocationRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: textColor, opacity: 0.2 }]}>
                    <ThemedText style={[styles.tempLocationLabel, { fontWeight: 'bold' }]}>Thermal Differential:</ThemedText>
                    <ThemedText style={[styles.tempValue, { fontWeight: 'bold', color: tempDiff.differential > 0 ? '#4CAF50' : '#F44336' }]}>
                      {formatTempDiffF(tempDiff.differential)}
                    </ThemedText>
                  </ThemedView>
                  
                  {/* Data quality indicator */}
                  <ThemedView style={[styles.dataQualityIndicator, { 
                    backgroundColor: (() => {
                      const confidence = (tempDiff as any)?.confidence;
                      switch(confidence) {
                        case 'high': return 'rgba(76, 175, 80, 0.1)';
                        case 'medium': return 'rgba(255, 152, 0, 0.1)';
                        case 'low': return 'rgba(244, 67, 54, 0.1)';
                        default: return 'rgba(128, 128, 128, 0.1)';
                      }
                    })(),
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: (() => {
                      const confidence = (tempDiff as any)?.confidence;
                      switch(confidence) {
                        case 'high': return '#4CAF50';
                        case 'medium': return '#FF9800';
                        case 'low': return '#F44336';
                        default: return '#999';
                      }
                    })()
                  }]}>
                    <ThemedText style={[styles.dataQualityText, { color: textColor, fontSize: 11, opacity: 0.8 }]}>
                      Data Quality: <ThemedText style={{ fontWeight: '500', textTransform: 'capitalize' }}>{(tempDiff as any)?.confidence}</ThemedText> • Strategy: {(tempDiff as any)?.dataStrategy?.replace(/_/g, ' ')}
                    </ThemedText>
                  </ThemedView>
                </>
              ) : (
                <>
                  {/* Fallback to current temperature display */}
                  <ThemedView style={styles.tempLocationRow}>
                    <ThemedText style={styles.tempLocationLabel}>Morrison (Current):</ThemedText>
                    <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.morrisonTemp)}</ThemedText>
                  </ThemedView>
                  <ThemedView style={styles.tempLocationRow}>
                    <ThemedText style={styles.tempLocationLabel}>Evergreen (Current):</ThemedText>
                    <ThemedText style={styles.tempValue}>{formatTempF(tempDiff.mountainTemp)}</ThemedText>
                  </ThemedView>
                  <ThemedView style={[styles.tempLocationRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: textColor, opacity: 0.2 }]}>
                    <ThemedText style={[styles.tempLocationLabel, { fontWeight: 'bold' }]}>Current Differential:</ThemedText>
                    <ThemedText style={[styles.tempValue, { fontWeight: 'bold', color: tempDiff.differential > 0 ? '#4CAF50' : '#F44336' }]}>
                      {formatTempDiffF(tempDiff.differential)}
                    </ThemedText>
                  </ThemedView>
                  
                  <ThemedView style={[styles.dataQualityIndicator, { 
                    backgroundColor: (tempDiff as any)?.usedTomorrowFallback ? 'rgba(255, 152, 0, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: (tempDiff as any)?.usedTomorrowFallback ? '#FF9800' : '#F44336'
                  }]}>
                    <ThemedText style={[styles.dataQualityText, { color: textColor, fontSize: 11, opacity: 0.8 }]}>
                      {(tempDiff as any)?.usedTomorrowFallback ? 
                        '📅 Using tomorrow\'s thermal data (preferred method)' : 
                        '⚠️ Using current temps (thermal cycle data unavailable)'
                      }
                    </ThemedText>
                    {/* Show specific reason for thermal cycle failure */}
                    {(tempDiff as any)?.thermalCycleFailureReason && (
                      <ThemedText style={[styles.dataQualityText, { 
                        color: textColor, 
                        fontSize: 10, 
                        opacity: 0.7, 
                        marginTop: 6,
                        fontStyle: 'italic',
                        lineHeight: 14
                      }]}>
                        {(tempDiff as any)?.usedTomorrowFallback ? 'Info:' : 'Reason:'} {(tempDiff as any).thermalCycleFailureReason}
                      </ThemedText>
                    )}
                    
                    {/* Show enhanced historical analysis status */}
                    {katabaticAnalysis.prediction?.enhancedAnalysis && (
                      <ThemedView style={{ marginTop: 6 }}>
                        {katabaticAnalysis.prediction.enhancedAnalysis.hasHistoricalData ? (
                          <ThemedText style={[styles.dataQualityText, { 
                            color: '#4CAF50', 
                            fontSize: 10, 
                            opacity: 0.9, 
                            fontStyle: 'italic',
                            lineHeight: 14
                          }]}>
                            🆓 FREE Enhancement: Using actual observed thermal data from {katabaticAnalysis.prediction.enhancedAnalysis.historicalSource}
                          </ThemedText>
                        ) : katabaticAnalysis.prediction.enhancedAnalysis.fallbackReason && (
                          <ThemedText style={[styles.dataQualityText, { 
                            color: textColor, 
                            fontSize: 10, 
                            opacity: 0.6, 
                            fontStyle: 'italic',
                            lineHeight: 14
                          }]}>
                            📊 Historical Enhancement: {katabaticAnalysis.prediction.enhancedAnalysis.fallbackReason}
                          </ThemedText>
                        )}
                      </ThemedView>
                    )}
                  </ThemedView>
                </>
              )}
              
              <ThemedText style={[styles.tempExplanation, { color: textColor, opacity: 0.7 }]}>
                {(() => {
                  const fahrenheitDiff = tempDiff.differential * 9/5; // Convert to Fahrenheit for comparison
                  // Adjust thresholds for thermal cycle (higher differentials expected)
                  const thresholds = (tempDiff as any)?.type === 'thermal_cycle' ? 
                    { good: 20, moderate: 12 } : 
                    { good: 9, moderate: 3.6 };
                  
                  if (fahrenheitDiff > thresholds.good) return 'Excellent thermal differential for katabatic winds';
                  if (fahrenheitDiff > thresholds.moderate) return 'Moderate thermal differential';
                  return 'Low thermal differential';
                })()}
              </ThemedText>
              
              {/* Temperature Differential Calculation Explanation */}
              <ThemedView style={[styles.calculationNote, { 
                backgroundColor: 'rgba(33, 150, 243, 0.05)', 
                borderRadius: 8, 
                padding: 12, 
                marginTop: 12,
                borderLeftWidth: 3,
                borderLeftColor: '#2196F3'
              }]}>
                <ThemedText style={[styles.calculationNoteTitle, { color: '#2196F3', fontWeight: '600', fontSize: 13, marginBottom: 6 }]}>
                  📊 {(tempDiff as any)?.type === 'thermal_cycle' ? 
                      ((tempDiff as any)?.usedTomorrowFallback ? 'Thermal Cycle Analysis (Tomorrow\'s Data)' : 'Thermal Cycle Analysis (Enhanced)') : 
                      'Current Temperature Analysis (Fallback)'
                    }
                </ThemedText>
                <ThemedText style={[styles.calculationNoteText, { color: textColor, opacity: 0.8, fontSize: 12, lineHeight: 16 }]}>
                  {(tempDiff as any)?.type === 'thermal_cycle' ? (
                    <>
                      <ThemedText style={{ fontWeight: '500' }}>Method:</ThemedText> Uses thermal cycle peaks for maximum accuracy{'\n'}
                      <ThemedText style={{ fontWeight: '500' }}>How:</ThemedText> Morrison max (12-5 PM) - Evergreen min (3-7 AM) = Thermal differential{'\n'}
                      {(tempDiff as any)?.usedTomorrowFallback && (
                        <ThemedText style={{ fontWeight: '500', color: '#FF9800' }}>Fallback:</ThemedText>
                      )} {(tempDiff as any)?.usedTomorrowFallback ? 'Using tomorrow\'s afternoon data (today\'s unavailable){\'\\n\'}' : ''}
                      <ThemedText style={{ fontWeight: '500' }}>Data Quality:</ThemedText> {(tempDiff as any)?.dataStrategy?.replace(/_/g, ' ')} approach ({(tempDiff as any)?.confidence} confidence)
                    </>
                  ) : (
                    <>
                      <ThemedText style={{ fontWeight: '500' }}>Method:</ThemedText> Current temperature comparison (fallback mode){'\n'}
                      <ThemedText style={{ fontWeight: '500' }}>How:</ThemedText> Morrison current - Evergreen current = Temperature differential{'\n'}
                      <ThemedText style={{ fontWeight: '500' }}>Limitation:</ThemedText> Does not capture full thermal cycle - less accurate for katabatic prediction
                    </>
                  )}
                </ThemedText>
                <ThemedText style={[styles.tempCalcExample, { color: textColor, opacity: 0.7, fontSize: 11, marginTop: 6, fontStyle: 'italic' }]}>
                  {(tempDiff as any)?.type === 'thermal_cycle' ? 
                    ((tempDiff as any)?.usedTomorrowFallback ? 
                      'Example: Morrison 95°F (tomorrow afternoon max) - Evergreen 65°F (pre-dawn min) = 30°F thermal differential' :
                      'Example: Morrison 95°F (afternoon max) - Evergreen 65°F (pre-dawn min) = 30°F thermal differential'
                    ) :
                    'Example: Morrison 90°F - Evergreen 83°F = 7°F current differential (may not reflect katabatic potential)'
                  }
                </ThemedText>
              </ThemedView>
            </ThemedView>
          ) : (
            <ThemedView style={styles.chartPlaceholder}>
              <ThemedText style={[styles.placeholderText, { color: textColor, opacity: 0.5 }]}>
                Loading temperature data...
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

        {/* REMOVED: Learning mode, prediction tracking, and weekly forecast features */}
        {/* These sections have been removed to focus on today/tomorrow predictions only */}

        {/* Development Info - Only show in development mode */}
        {__DEV__ && (
          <ThemedView style={[styles.devCard, { backgroundColor: cardColor, opacity: 0.7 }]}>
            <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
              🎯 Development Mode: Focused on Today & Tomorrow Predictions
            </ThemedText>
            <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
              ✅ Today & Tomorrow detailed analysis
            </ThemedText>
            <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
              🌤️ Using OpenWeatherMap API for reliable forecasts
            </ThemedText>
            <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
              📍 Morrison, CO - Katabatic wind analysis
            </ThemedText>
            <ThemedText style={[styles.devText, { color: textColor, opacity: 0.6 }]}>
              🚀 Simplified approach: Manual control of predictions
            </ThemedText>
          </ThemedView>
        )}

        {/* Production Footer - Simple status for production users */}
        {!__DEV__ && (
          <ThemedView style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)', borderRadius: 8, padding: 12, marginTop: 16 }}>
            <ThemedText style={{ color: textColor, opacity: 0.6, fontSize: 12, textAlign: 'center' }}>
              🌤️ Wind Guru uses advanced 5-factor analysis with NOAA & OpenWeather data
            </ThemedText>
            <ThemedText style={{ color: textColor, opacity: 0.5, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
              Predictions improve over time as the system learns local patterns
            </ThemedText>
          </ThemedView>
        )}
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
  // Disabled state styles
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  disabledSteps: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'left',
    opacity: 0.9,
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  warningNote: {
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 4,
  },
  // Temperature calculation note styles
  calculationNote: {
    marginTop: 12,
  },
  calculationNoteTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  calculationNoteText: {
    fontSize: 12,
    lineHeight: 16,
  },
  tempCalcExample: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Data quality indicator styles
  dataQualityIndicator: {
    marginTop: 8,
  },
  dataQualityText: {
    fontSize: 11,
    opacity: 0.8,
  },
});
