import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useAppSettings } from '@/contexts/SettingsContext';
import { PressureChart } from '@/components/PressureChart';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';

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

  // Import Soda Lake wind data for prediction validation
  const { windData: sodaLakeWindData, refreshData: refreshSodaLakeData } = useSodaLakeWind();

  // Helper function to determine if today's prediction should be frozen
  const getTodayPredictionStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 6) {
      return {
        status: 'prediction',
        message: `Dawn patrol starts in ${6 - currentHour} hour${6 - currentHour !== 1 ? 's' : ''} - Prediction mode`,
        canVerify: false
      };
    } else if (currentHour >= 6 && currentHour <= 8) {
      return {
        status: 'active',
        message: '🔴 Active Dawn Patrol Window - Real-time verification mode',
        canVerify: true
      };
    } else {
      return {
        status: 'frozen',
        message: '🔒 Dawn patrol complete - Analysis frozen for accuracy tracking',
        canVerify: true
      };
    }
  };

  // Helper function to get historical wind verification
  const getHistoricalWindVerification = () => {
    if (!sodaLakeWindData || sodaLakeWindData.length === 0) return null;
    
    const now = new Date();
    const dawnStart = new Date(now);
    dawnStart.setHours(6, 0, 0, 0);
    const dawnEnd = new Date(now);
    dawnEnd.setHours(8, 0, 0, 0);
    
    // Filter wind data for today's dawn patrol window (6-8am)
    const todayDawnWindData = sodaLakeWindData.filter(point => {
      const pointTime = new Date(point.time);
      return pointTime >= dawnStart && pointTime <= dawnEnd;
    });
    
    if (todayDawnWindData.length === 0) return null;
    
    // Calculate average wind speed during dawn patrol window
    const avgWindSpeed = todayDawnWindData.reduce((sum, point) => sum + point.windSpeedMph, 0) / todayDawnWindData.length;
    
    // Determine if conditions were good (using 15+ mph as threshold)
    const goodWindCount = todayDawnWindData.filter(point => point.windSpeedMph >= 15).length;
    const goodWindPercentage = (goodWindCount / todayDawnWindData.length) * 100;
    
    return {
      avgWindSpeed,
      goodWindPercentage,
      dataPoints: todayDawnWindData.length,
      conditionsWereGood: goodWindPercentage >= 60 && avgWindSpeed >= 12,
      maxWindSpeed: Math.max(...todayDawnWindData.map(p => p.windSpeedMph)),
      minWindSpeed: Math.min(...todayDawnWindData.map(p => p.windSpeedMph))
    };
  };

  // Helper function to determine tomorrow's prediction availability
  const getTomorrowPredictionStatus = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 18) {
      return {
        status: 'pending',
        message: 'Check back after 6 PM - cooling data and pressure trends need full day analysis',
        showCheckBackMessage: true
      };
    } else {
      return {
        status: 'available',
        message: 'Evening data available - overnight prediction ready',
        showCheckBackMessage: false
      };
    }
  };

  // Helper function to calculate overnight temperature changes (evening to dawn)
  // This matches the same thermal cycle timeframe as pressure analysis
  const getOvernightTemperatureAnalysis = () => {
    if (!weatherData) return null;
    
    const morrisonForecast = weatherData.morrison?.hourlyForecast || [];
    const evergreenForecast = weatherData.mountain?.hourlyForecast || [];
    if (morrisonForecast.length < 12 || evergreenForecast.length < 12) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    const eveningHour = 18; // 6 PM
    const dawnHour = 6; // 6 AM
    
    // Find evening temperatures (start of cooling cycle)
    const findEveningTemp = (forecast: any[]) => {
      return forecast.find(point => {
        const pointDate = new Date(point.timestamp);
        const pointHour = pointDate.getHours();
        
        if (currentHour >= 18) {
          return pointDate.toDateString() === now.toDateString() && pointHour === eveningHour;
        } else {
          const targetDate = currentHour <= 8 ? 
            new Date(now.getTime() - 24 * 60 * 60 * 1000) : 
            now;
          return pointDate.toDateString() === targetDate.toDateString() && pointHour === eveningHour;
        }
      });
    };
    
    // Find dawn temperatures (end of cooling cycle)
    const findDawnTemp = (forecast: any[]) => {
      return forecast.find(point => {
        const pointDate = new Date(point.timestamp);
        const pointHour = pointDate.getHours();
        
        if (currentHour >= 18) {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          return pointDate.toDateString() === tomorrow.toDateString() && pointHour === dawnHour;
        } else if (currentHour <= 8) {
          return pointDate.toDateString() === now.toDateString() && pointHour === dawnHour;
        } else {
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          return pointDate.toDateString() === tomorrow.toDateString() && pointHour === dawnHour;
        }
      });
    };
    
    const morrisonEvening = findEveningTemp(morrisonForecast);
    const morrisonDawn = findDawnTemp(morrisonForecast);
    const evergreenEvening = findEveningTemp(evergreenForecast);
    const evergreenDawn = findDawnTemp(evergreenForecast);
    
    if (!morrisonEvening || !morrisonDawn || !evergreenEvening || !evergreenDawn) return null;
    
    // Calculate overnight temperature changes
    const morrisonOvernightChange = morrisonDawn.temperature - morrisonEvening.temperature;
    const evergreenOvernightChange = evergreenDawn.temperature - evergreenEvening.temperature;
    
    // Calculate evening and dawn differentials
    const eveningDifferential = morrisonEvening.temperature - evergreenEvening.temperature;
    const dawnDifferential = morrisonDawn.temperature - evergreenDawn.temperature;
    const overnightDifferentialChange = dawnDifferential - eveningDifferential;
    
    return {
      morrisonEvening: morrisonEvening.temperature,
      morrisonDawn: morrisonDawn.temperature,
      morrisonOvernightChange,
      evergreenEvening: evergreenEvening.temperature,
      evergreenDawn: evergreenDawn.temperature,
      evergreenOvernightChange,
      eveningDifferential,
      dawnDifferential,
      overnightDifferentialChange,
      timeframe: `${eveningHour}:00 PM → ${dawnHour}:00 AM`,
      isKatabaticFavorable: dawnDifferential >= 3.2, // Dawn differential meets katabatic threshold
      coolingEffective: Math.abs(morrisonOvernightChange) >= 2.0 || Math.abs(evergreenOvernightChange) >= 2.0,
      eveningTime: new Date(morrisonEvening.timestamp),
      dawnTime: new Date(morrisonDawn.timestamp)
    };
  };

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
  const overnightTemperature = getOvernightTemperatureAnalysis(); // NEW: Overnight temperature differential analysis
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
      // Also refresh Soda Lake data for verification
      await refreshSodaLakeData();
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
              <ThemedText style={[styles.infoText, { color: textColor, opacity: 0.9 }]}>                  Our advanced katabatic wind prediction uses <ThemedText style={styles.highlightText}>5-factor hybrid MKI analysis</ThemedText> combining NOAA and OpenWeather data to calculate probability for <ThemedText style={styles.highlightText}>today AND tomorrow</ThemedText>:
              </ThemedText>
              
              <ThemedView style={styles.factorsList}>
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>☔</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Rain Probability 6pm-6am (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≤25% rain chance - precipitation disrupts both katabatic flow and mountain wave patterns</ThemedText>
                  </ThemedView>
                </ThemedView>
                
                <ThemedView style={styles.factorItem}>
                  <ThemedText style={styles.factorEmoji}>🌙</ThemedText>
                  <ThemedView style={styles.factorContent}>
                    <ThemedText style={[styles.factorName, { color: textColor }]}>Clear Sky 6pm-6am (25% weight)</ThemedText>
                    <ThemedText style={[styles.factorDesc, { color: textColor, opacity: 0.7 }]}>≥45% clear - enables radiative cooling and organized wave development throughout the night</ThemedText>
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
                {getTodayPredictionStatus().message}
              </ThemedText>
              {getTodayPredictionStatus().status === 'frozen' && (
                <ThemedText style={[styles.timeStatus, { color: '#4CAF50', opacity: 0.8, fontSize: 10, marginTop: 4, fontStyle: 'italic' }]}>
                  💡 Today&apos;s prediction is preserved for verification. Tomorrow&apos;s forecast available below.
                </ThemedText>
              )}
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
                
                {/* Historical Wind Verification - Only show if we can verify */}
                {getTodayPredictionStatus().canVerify && (() => {
                  const windVerification = getHistoricalWindVerification();
                  if (!windVerification) return null;
                  
                  const predictionAccuracy = katabaticAnalysis.prediction 
                    ? (katabaticAnalysis.prediction.probability >= 50) === windVerification.conditionsWereGood
                    : null;
                  
                  return (
                    <ThemedView style={{
                      backgroundColor: predictionAccuracy ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 8,
                      borderLeftWidth: 3,
                      borderLeftColor: predictionAccuracy ? '#4CAF50' : '#FF9800'
                    }}>
                      <ThemedText style={[styles.explanationText, { 
                        color: predictionAccuracy ? '#4CAF50' : '#FF9800', 
                        fontSize: 12,
                        fontWeight: '600'
                      }]}>
                        🌊 Historical Wind Verification (6:00-8:00 AM Today)
                      </ThemedText>
                      <ThemedText style={[styles.explanationText, { 
                        color: textColor, 
                        opacity: 0.8,
                        fontSize: 11,
                        marginTop: 4
                      }]}>
                        Actual conditions: {windVerification.avgWindSpeed.toFixed(1)} mph average • {windVerification.goodWindPercentage.toFixed(0)}% good wind
                        {'\n'}Peak: {windVerification.maxWindSpeed.toFixed(1)} mph • {windVerification.dataPoints} data points
                        {'\n'}Result: {windVerification.conditionsWereGood ? '✅ Good conditions' : '❌ Poor conditions'}
                      </ThemedText>
                      {predictionAccuracy !== null && (
                        <ThemedText style={[styles.explanationText, { 
                          color: predictionAccuracy ? '#4CAF50' : '#FF9800', 
                          fontSize: 10,
                          marginTop: 4,
                          fontStyle: 'italic'
                        }]}>
                          {predictionAccuracy 
                            ? '🎯 Prediction was accurate!' 
                            : '⚠️ Prediction needs improvement'}
                        </ThemedText>
                      )}
                    </ThemedView>
                  );
                })()}
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
                    {katabaticAnalysis.prediction.factors.skyConditions.meets ? '✅' : '❌'} Clear Sky (6pm-6am):
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
                {/* Guide users to check back at 6 PM for optimal overnight analysis */}
                {(!overnightTemperature || new Date().getHours() < 18) && (
                  <ThemedView style={{ marginLeft: 16, marginTop: -4, marginBottom: 8 }}>
                    <ThemedText style={[styles.conditionLabel, { 
                      fontSize: 10, 
                      opacity: 0.7, 
                      fontStyle: 'italic',
                      color: '#FF9800'
                    }]}>
                      ⏰ Check back at 6 PM for most accurate overnight prediction analysis
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
                  <ThemedText style={styles.conditionLabel}>🌙 Clear Sky (6pm-6am):</ThemedText>
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
                
                {/* Overnight Temperature Analysis - Real-world katabatic prediction timeframe */}
                {overnightTemperature && (
                  <ThemedView style={[styles.conditionRow, { 
                    backgroundColor: 'rgba(76, 175, 80, 0.08)', 
                    padding: 10, 
                    marginVertical: 6, 
                    borderRadius: 8,
                    borderLeftWidth: 3,
                    borderLeftColor: overnightTemperature.isKatabaticFavorable ? '#4CAF50' : '#FF9800'
                  }]}>
                    <ThemedView style={{ flex: 1 }}>
                      <ThemedText style={[styles.conditionLabel, { 
                        color: '#4CAF50', 
                        fontWeight: '600',
                        marginBottom: 2 
                      }]}>
                        🌡️ Overnight Temp Analysis ({overnightTemperature.timeframe}):
                      </ThemedText>
                      <ThemedText style={[styles.conditionValue, { 
                        color: overnightTemperature.isKatabaticFavorable ? '#4CAF50' : '#FF9800',
                        fontWeight: '600',
                        fontSize: 14
                      }]}>
                        Dawn Δ: {formatTempDiffF(overnightTemperature.dawnDifferential)} 
                        {overnightTemperature.isKatabaticFavorable ? ' ✅ Favorable' : ' ⚠️ Marginal'}
                      </ThemedText>
                      <ThemedView style={{ marginTop: 4 }}>
                        <ThemedText style={[styles.conditionLabel, { 
                          fontSize: 12, 
                          opacity: 0.8,
                          marginBottom: 1
                        }]}>
                          Morrison: {formatTempF(overnightTemperature.morrisonEvening)} → {formatTempF(overnightTemperature.morrisonDawn)} 
                          ({overnightTemperature.morrisonOvernightChange > 0 ? '+' : ''}{(overnightTemperature.morrisonOvernightChange * 9/5).toFixed(1)}°F)
                        </ThemedText>
                        <ThemedText style={[styles.conditionLabel, { 
                          fontSize: 12, 
                          opacity: 0.8,
                          marginBottom: 1
                        }]}>
                          Evergreen: {formatTempF(overnightTemperature.evergreenEvening)} → {formatTempF(overnightTemperature.evergreenDawn)} 
                          ({overnightTemperature.evergreenOvernightChange > 0 ? '+' : ''}{(overnightTemperature.evergreenOvernightChange * 9/5).toFixed(1)}°F)
                        </ThemedText>
                      </ThemedView>
                      <ThemedText style={[styles.conditionLabel, { 
                        fontSize: 11, 
                        opacity: 0.7,
                        fontStyle: 'italic',
                        marginTop: 2
                      }]}>
                        Evening-to-dawn temperature differential development
                      </ThemedText>
                    </ThemedView>
                  </ThemedView>
                )}
                
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
            
            {getTomorrowPredictionStatus().showCheckBackMessage ? (
              <ThemedView style={styles.predictionDisplay}>
                <ThemedView style={[styles.probabilityBar, { backgroundColor: '#FF9800', opacity: 0.3 }]}>
                  <ThemedView style={[
                    styles.probabilityFill, 
                    { backgroundColor: '#FF9800', width: '25%', opacity: 0.7 }
                  ]} />
                </ThemedView>
                <ThemedText style={styles.probabilityText}>Preliminary Forecast</ThemedText>
                <ThemedText style={styles.confidenceText}>
                  Enhanced prediction available after 6 PM today
                </ThemedText>
              </ThemedView>
            ) : tomorrowPrediction ? (
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
                    📊 {getTomorrowPredictionStatus().showCheckBackMessage ? 'Preliminary Forecast' : 'Evening Forecast'}
                  </ThemedText>
                  <ThemedText style={{ color: textColor, opacity: 0.8, fontSize: 12, lineHeight: 16 }}>
                    {getTomorrowPredictionStatus().showCheckBackMessage 
                      ? 'This prediction uses current weather models and will be refined with evening updates (after 6 PM).'
                      : 'This prediction uses today\'s complete thermal cycle for enhanced accuracy.'
                    }
                    Data quality: <ThemedText style={{ fontWeight: '500' }}>{tomorrowPrediction.dataQuality}</ThemedText>
                  </ThemedText>
                  <ThemedText style={{ color: '#2196F3', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                    {getTomorrowPredictionStatus().showCheckBackMessage
                      ? '💡 More accurate prediction available after 6 PM with fresh weather models'
                      : '✅ Enhanced with today\'s complete weather patterns'
                    }
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

        {/* Tomorrow's Conditions Analysis - Only show after 6 PM */}
        {getTomorrowPredictionStatus().status === 'available' ? (
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
                    {tomorrowPrediction.prediction.factors.skyConditions.meets ? '✅' : '❌'} Clear Sky (6pm-6am):
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
                {/* Tomorrow's forecast data is naturally available - no guidance needed */}
                
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
                    Enhanced accuracy with complete thermal cycle analysis.
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
        ) : (
          <ThemedView style={[styles.conditionsCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.sectionTitle}>📊 Tomorrow&apos;s Conditions Analysis</ThemedText>
            <ThemedView style={{ backgroundColor: 'rgba(255, 152, 0, 0.05)', borderRadius: 8, padding: 16 }}>
              <ThemedText style={{ color: '#FF9800', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                ⏰ Check Back After 6 PM
              </ThemedText>
              <ThemedText style={{ color: textColor, opacity: 0.7, lineHeight: 20 }}>
                Tomorrow&apos;s detailed condition analysis will be available after 6 PM when today&apos;s complete thermal cycle data is processed.
              </ThemedText>
              <ThemedText style={{ color: textColor, opacity: 0.6, fontSize: 12, fontStyle: 'italic', marginTop: 8 }}>
                The system needs full day cooling and pressure trends for accurate overnight predictions.
              </ThemedText>
            </ThemedView>
          </ThemedView>
        )}

        {/* Optimal Timing Guidance */}
        <ThemedView style={[styles.infoCard, { backgroundColor: cardColor, borderLeftWidth: 4, borderLeftColor: '#FF9800' }]}>
          <ThemedText style={[styles.timingTitle, { color: '#FF9800', fontWeight: '600', fontSize: 16, marginBottom: 8 }]}>
            ⏰ Time-Based Prediction System
          </ThemedText>
          <ThemedText style={[styles.timingText, { color: textColor, fontSize: 14, lineHeight: 20, marginBottom: 8 }]}>
            Wind Guru adapts its behavior based on when you check it:
          </ThemedText>
          <ThemedText style={[styles.timingText, { color: textColor, fontSize: 14, lineHeight: 20 }]}>
            🌅 <ThemedText style={{ fontWeight: '500' }}>Before 6 AM</ThemedText> - Prediction mode only (dawn patrol window hasn&apos;t started){'\n'}
            ⚡ <ThemedText style={{ fontWeight: '500' }}>6 AM - 8 AM</ThemedText> - Active verification with real-time wind data if available{'\n'}
            🔒 <ThemedText style={{ fontWeight: '500' }}>After 8 AM</ThemedText> - Today&apos;s prediction frozen, verified against historical wind data{'\n'}
            📊 <ThemedText style={{ fontWeight: '500' }}>Before 6 PM</ThemedText> - Tomorrow&apos;s forecast preliminary (check back after 6 PM for accuracy){'\n'}
            🌙 <ThemedText style={{ fontWeight: '500' }}>After 6 PM</ThemedText> - Tomorrow&apos;s forecast enhanced with today&apos;s complete thermal cycle
          </ThemedText>
          {new Date().getHours() < 18 && new Date().getHours() >= 8 && (
            <ThemedView style={[styles.waitingNote, { backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: 6, padding: 8, marginTop: 8 }]}>
              <ThemedText style={[styles.waitingText, { color: '#FF9800', fontSize: 12, fontStyle: 'italic' }]}>
                ⏳ Currently after dawn patrol but before 6 PM - tomorrow&apos;s enhanced analysis available tonight
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
  // New styles for optimal timing guidance
  timingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timingText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  waitingNote: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  waitingText: {
    color: '#FF9800',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
